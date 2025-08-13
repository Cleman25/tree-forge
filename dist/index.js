#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { parseTree } from "./parser.js";
import { applyPlan, detectPM } from "./utils.js";
import { planFromTree } from "./generators.js";
import { detectors } from "./detectors.js";
import { askGlobalOptions, chooseDetectors, confirmPlan } from "./prompts.js";
import { loadTreeSource } from "./generators.js";
import chalk from "chalk";
import { setupGit } from "./git.js";
const argv = await yargs(hideBin(process.argv))
    .scriptName("forge-tree")
    .usage("$0 [targetDir] [options]")
    .positional("targetDir", { type: "string", describe: "Where to scaffold", default: "." })
    .option("tree-file", { type: "string", describe: "Path to ASCII tree file" })
    .option("tree", { type: "string", describe: "ASCII tree string (quoted)" })
    .option("tabIndentationSize", { type: "number", default: 2, describe: "Spaces per depth level" })
    .option("detectAsciiGuides", { type: "boolean", default: true, describe: "Skip │ ├ └ guides" })
    .option("dry-run", { type: "boolean", default: false, describe: "Print actions only" })
    .option("yes", { type: "boolean", default: false, alias: "y", describe: "Assume yes for prompts" })
    .option("pm", {
    type: "string",
    choices: ["pnpm", "yarn", "npm"],
    describe: "Preferred package manager"
})
    .option("detectors", { type: "boolean", default: true, describe: "Enable smart detectors" })
    .option("dotfiles", { type: "boolean", default: true, describe: "Generate ignores/formatters" })
    .option("git", { type: "boolean", default: false, describe: "Initialize a git repo and make an initial commit" })
    .option("github", { type: "string", describe: "Create a GitHub repo with this name (uses gh if available). If empty flag is passed, defaults to folder name", coerce: (v) => v === "" ? true : v })
    .option("private", { type: "boolean", default: false, describe: "Create the GitHub repo as private (with --github)" })
    .option("no-push", { type: "boolean", default: false, describe: "Do not push after creating/adding remote" })
    .option("branch", { type: "string", default: "main", describe: "Initial branch name" })
    .help().argv;
const cfg = {
    cwd: process.cwd(),
    targetDir: path.resolve(String(argv._[0] || argv.targetDir)),
    treeText: argv.tree,
    treeFile: argv["tree-file"],
    dryRun: !!argv["dry-run"],
    yes: !!argv.yes,
    packageManager: argv.pm || undefined,
    tabIndentationSize: Number(argv.tabIndentationSize),
    detectAsciiGuides: !!argv.detectAsciiGuides,
    runDetectors: !!argv.detectors,
    generateDotfiles: !!argv.dotfiles
};
const pm = detectPM(cfg.packageManager);
cfg.packageManager = pm;
const mergedInteractive = await askGlobalOptions({
    runDetectors: cfg.runDetectors,
    generateDotfiles: cfg.generateDotfiles
});
cfg.runDetectors = mergedInteractive.runDetectors;
cfg.generateDotfiles = mergedInteractive.generateDotfiles;
const treeSource = await loadTreeSource(cfg);
if (!treeSource) {
    // eslint-disable-next-line no-console
    console.error(chalk.red("No ASCII tree provided. Use --tree '<ascii>' or --tree-file path/to/tree.txt (lines like 'apps/\\n  web/\\n    package.json')."));
    process.exit(1);
}
const roots = parseTree(treeSource, cfg);
const plan = planFromTree(roots, cfg);
if (cfg.runDetectors) {
    const matches = [];
    const applicable = detectors.filter((d) => roots.some((r) => walkMatch(r, d.match)));
    const chosenIds = await chooseDetectors(applicable);
    for (const d of detectors) {
        if (!chosenIds.includes(d.id))
            continue;
        for (const r of roots)
            collectMatches(r, d, matches);
    }
    for (const m of matches) {
        const ok = await detectors.find((d) => d.id === m.detectorId).prompt(m.node);
        if (!ok)
            continue;
        // eslint-disable-next-line no-await-in-loop
        const gen = await detectors.find((d) => d.id === m.detectorId).generate(m.node, cfg);
        plan.push(...gen.actions);
    }
}
const ok = await confirmPlan(plan.length, cfg.yes);
if (!ok)
    process.exit(0);
await applyPlan(plan, cfg.dryRun);
// compute repoRoot the same way generators do
const repoRoot = roots.length === 1 && roots[0].kind === "dir" ? roots[0].path : cfg.targetDir;
// only act if not dry-run
if (!cfg.dryRun) {
    await setupGit({
        repoPath: repoRoot,
        branch: argv.branch,
        git: argv.git,
        github: argv.github,
        private: argv.private,
        push: !argv["no-push"]
    });
}
function walkMatch(n, match) {
    if (match(n))
        return true;
    return n.children.some((c) => walkMatch(c, match));
}
function collectMatches(n, d, out) {
    if (d.match(n))
        out.push({ detectorId: d.id, node: n });
    for (const c of n.children)
        collectMatches(c, d, out);
}

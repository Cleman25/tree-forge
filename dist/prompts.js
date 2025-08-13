// src/prompts.ts
import prompts from "prompts";
const AUTO = process.env.FORGE_TREE_NO_PROMPT === "1" ||
    process.env.CI === "true" ||
    !process.stdout.isTTY;
export async function askGlobalOptions(defaults) {
    if (AUTO) {
        return {
            // disable external generators in non-interactive environments
            runDetectors: false,
            generateDotfiles: defaults.generateDotfiles ?? true
        };
    }
    const res = await prompts([
        {
            type: "toggle",
            name: "runDetectors",
            message: "Enable smart detectors (Next.js/Firebase/etc.)?",
            initial: defaults.runDetectors ?? true,
            active: "yes",
            inactive: "no"
        },
        {
            type: "toggle",
            name: "generateDotfiles",
            message: "Generate .gitignore/.editorconfig/.prettierrc?",
            initial: defaults.generateDotfiles ?? true,
            active: "yes",
            inactive: "no"
        }
    ]);
    return res;
}
export async function chooseDetectors(applicable) {
    if (AUTO)
        return []; // no external tools in headless
    if (applicable.length === 0)
        return [];
    const res = await prompts({
        type: "multiselect",
        name: "picked",
        message: "Select generators to run",
        choices: applicable.map((d) => ({ title: d.id, value: d.id, selected: true }))
    });
    return res.picked || [];
}
export async function confirmPlan(steps, yes) {
    if (yes || AUTO)
        return true;
    const res = await prompts({
        type: "confirm",
        name: "ok",
        message: `Execute ${steps} actions?`,
        initial: true
    });
    return !!res.ok;
}
export async function askPerNode(_node, _id) {
    if (AUTO)
        return false; // headless: never run per-node external steps
    const res = await prompts({
        type: "toggle",
        name: "go",
        message: `Run ${_id} for this path?`,
        initial: true,
        active: "yes",
        inactive: "no"
    });
    return !!res.go;
}

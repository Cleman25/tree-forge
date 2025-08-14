import { execa } from "execa";
import path from "path";
import fs from "fs";
import { which } from "./utils.js";
async function run(cmd, args, cwd) {
    await execa(cmd, args, { cwd, stdio: "inherit" });
}
async function tryRun(cmd, args, cwd) {
    try {
        await run(cmd, args, cwd);
        return true;
    }
    catch {
        return false;
    }
}
async function getBranch(cwd) {
    try {
        const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
        return stdout.trim();
    }
    catch {
        return "main";
    }
}
export async function setupGit(opts) {
    const repoPath = path.resolve(opts.repoPath);
    const wantGit = !!opts.git || !!opts.github;
    if (!wantGit)
        return;
    try {
        if (!fs.existsSync(path.join(repoPath, ".git"))) {
            opts.logger?.info('Initializing Git repository', { target: repoPath });
            const created = await tryRun("git", ["init", "-b", opts.branch || "main"], repoPath);
            if (!created) {
                opts.logger?.info('Falling back to basic git init');
                await run("git", ["init"], repoPath);
            }
            opts.logger?.info('Git repository initialized', { target: repoPath });
        }
        // set branch if needed
        const current = await getBranch(repoPath);
        const targetBranch = opts.branch || "main";
        if (current !== targetBranch) {
            opts.logger?.info('Switching branch', {
                metadata: {
                    from: current,
                    to: targetBranch
                }
            });
            await tryRun("git", ["checkout", "-b", targetBranch], repoPath);
        }
        // baseline commit if nothing committed
        const hasAnyCommit = await tryRun("git", ["rev-parse", "HEAD"], repoPath);
        if (!hasAnyCommit) {
            opts.logger?.info('Creating initial commit');
            await run("git", ["add", "."], repoPath);
            await run("git", ["commit", "-m", "chore: initial scaffold by forge-tree"], repoPath);
            opts.logger?.info('Initial commit created');
        }
        // remote + repo creation
        if (opts.github) {
            const repoName = typeof opts.github === "string" ? opts.github : path.basename(repoPath);
            opts.logger?.info('Setting up GitHub repository', {
                metadata: {
                    name: repoName,
                    private: opts.private,
                    push: opts.push !== false
                }
            });
            if (which("gh")) {
                const args = [
                    "repo",
                    "create",
                    repoName,
                    opts.private ? "--private" : "--public",
                    `--source=${repoPath}`,
                    "--remote=origin",
                ];
                if (opts.push !== false)
                    args.push("--push");
                await run("gh", args, repoPath);
                opts.logger?.info('GitHub repository created using gh CLI');
            }
            else {
                // fallback: add remote only; user can create repo manually
                // expects user to replace <you> with their handle
                const url = `https://github.com/<you>/${repoName}.git`;
                opts.logger?.warn('gh CLI not found, falling back to manual remote setup', {
                    metadata: {
                        url,
                        note: 'Replace <you> with your GitHub username'
                    }
                });
                await tryRun("git", ["remote", "remove", "origin"], repoPath);
                await run("git", ["remote", "add", "origin", url], repoPath);
                if (opts.push !== false) {
                    opts.logger?.info('Pushing to remote');
                    await run("git", ["push", "-u", "origin", targetBranch], repoPath);
                }
            }
        }
        else if (opts.push) {
            // push only if a remote already exists and push requested
            const remotes = (await execa("git", ["remote"], { cwd: repoPath })).stdout.split("\n").map(s => s.trim());
            if (remotes.includes("origin")) {
                opts.logger?.info('Pushing to existing remote');
                await run("git", ["push", "-u", "origin", targetBranch], repoPath);
            }
            else {
                opts.logger?.warn('Push requested but no origin remote found');
            }
        }
    }
    catch (error) {
        opts.logger?.error('Git setup failed', {
            error: error instanceof Error ? error.message : String(error),
            metadata: {
                repoPath,
                branch: opts.branch,
                github: opts.github,
                private: opts.private,
                push: opts.push,
                stack: error instanceof Error ? error.stack : undefined
            }
        });
        throw error;
    }
}

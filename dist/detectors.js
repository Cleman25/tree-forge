import path from "path";
import { pmArgs } from "./utils.js";
import { askPerNode } from "./prompts.js";
const byName = (n, m) => m.test(n.name) || m.test(path.basename(n.path));
export const NextAppDetector = {
    id: "create-next-app",
    match: (n) => n.kind === "dir" && /web|next/i.test(n.name),
    prompt: async (n) => askPerNode(n, "create-next-app"),
    generate: async (n, cfg) => {
        const pm = pmArgs(cfg.packageManager || "npm");
        const actions = [];
        actions.push({
            type: "exec",
            cwd: path.dirname(n.path),
            cmd: "npx",
            args: [
                "create-next-app@latest",
                path.basename(n.path),
                "--ts",
                "--eslint",
                "--tailwind",
                "--app",
                cfg.packageManager === "pnpm" ? "--use-pnpm" : cfg.packageManager === "yarn" ? "--use-yarn" : "--use-npm"
            ]
        });
        return { actions, description: "Scaffold Next.js app" };
    }
};
// replace FirebaseDetector with this implementation
export const FirebaseDetector = {
    id: "firebase-init",
    match: (n) => n.kind === "dir" &&
        (/^(web|firebase|dataconnect)$/i.test(n.name)),
    prompt: async (n) => askPerNode(n, "firebase-init"),
    generate: async (n, _cfg) => {
        const actions = [];
        actions.push({ type: "exec", cwd: n.path, cmd: "firebase", args: ["init"] });
        return { actions, description: "Initialize Firebase in folder" };
    }
};
export const PkgDetector = {
    id: "npm-init",
    match: (n) => n.kind === "dir" && /package\.json$/i.test(n.children.map((c) => c.name).join(",")) === false,
    prompt: async (n) => askPerNode(n, "npm-init"),
    generate: async (n, cfg) => {
        const pm = pmArgs(cfg.packageManager || "npm");
        return {
            actions: [{ type: "exec", cwd: n.path, cmd: pm.init[0], args: [...pm.init[1]] }],
            description: "Initialize package.json"
        };
    }
};
export const detectors = [NextAppDetector, FirebaseDetector, PkgDetector];

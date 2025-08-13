// src/__tests__/helpers.ts
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from "fs";
import { tmpdir } from "os";
import path from "path";

export function makeTmpDir(prefix = "forge-tree-") {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  return {
    dir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
  };
}

export function listFilesRecursive(root: string) {
  const out: string[] = [];
  const walk = (p: string) => {
    for (const name of readdirSync(p)) {
      const full = path.join(p, name);
      const s = statSync(full);
      if (s.isDirectory()) walk(full);
      else out.push(path.relative(root, full));
    }
  };
  walk(root);
  return out.sort();
}

export function read(pathname: string) {
  return readFileSync(pathname, "utf8");
}

export function exists(p: string) {
  return existsSync(p);
}

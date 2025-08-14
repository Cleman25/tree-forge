// src/__tests__/detectors.matching.test.ts
import { describe, it, expect } from "vitest";
import { getDetectors } from "../detectors.js";
import type { TreeNode, TreeStyle } from "../types.js";

function dir(name: string, children: TreeNode[] = [], base = "/tmp") {
  return { name, path: `${base}/${name}`, kind: "dir" as const, children };
}

describe("detectors matching", () => {
  it("NextAppDetector matches web/ or next-like dirs", () => {
    const web = dir("web");
    const next = dir("next-app");
    const other = dir("server");
    const config = {
      targetDir: "/tmp",
      dryRun: false,
      yes: false,
      tabIndentationSize: 2,
      detectAsciiGuides: true,
      packageManager: "npm" as const,
      treeStyle: "default" as unknown as TreeStyle,
      allowNestedInit: false,
      runDetectors: true,
      generateDotfiles: true,
      cwd: "/tmp",
      quiet: false,
      showTree: true,
      showResult: true,
      git: false,
      github: false,
      private: false,
      noPush: false,
      branch: "main"
    };
    const detectors = getDetectors(config);
    const nextDet = detectors.find((d) => d.id === "create-next-app")!;
    expect(nextDet.match(web, config)).toBe(true);
    expect(nextDet.match(next, config)).toBe(true);
    expect(nextDet.match(other, config)).toBe(false);
  });

  it("FirebaseDetector triggers on dataconnect or web dirs", () => {
    const dc = dir("dataconnect");
    const web = dir("web");
    const srv = dir("apps");
    const config = {
      targetDir: "/tmp",
      dryRun: false,
      yes: false,
      tabIndentationSize: 2,
      detectAsciiGuides: true,
      packageManager: "npm" as const,
      treeStyle: "default" as unknown as TreeStyle,
      allowNestedInit: false,
      runDetectors: true,
      generateDotfiles: true,
      cwd: "/tmp",
      quiet: false,
      showTree: true,
      showResult: true,
      git: false,
      github: false,
      private: false,
      noPush: false,
      branch: "main"
    };
    const detectors = getDetectors(config);
    const det = detectors.find((d) => d.id === "firebase-init")!;
    expect(det.match(dc, config)).toBe(true);
    expect(det.match(web, config)).toBe(true);
    expect(det.match(srv, config)).toBe(false);
  });
});

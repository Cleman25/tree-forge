// src/__tests__/detectors.matching.test.ts
import { describe, it, expect } from "vitest";
import { detectors } from "../detectors.js";
import type { TreeNode } from "../types.js";

function dir(name: string, children: TreeNode[] = [], base = "/tmp") {
  return { name, path: `${base}/${name}`, kind: "dir" as const, children };
}

describe("detectors matching", () => {
  it("NextAppDetector matches web/ or next-like dirs", () => {
    const web = dir("web");
    const next = dir("next-app");
    const other = dir("server");
    const nextDet = detectors.find((d) => d.id === "create-next-app")!;
    expect(nextDet.match(web)).toBe(true);
    expect(nextDet.match(next)).toBe(true);
    expect(nextDet.match(other)).toBe(false);
  });

  it("FirebaseDetector triggers on dataconnect or web dirs", () => {
    const dc = dir("dataconnect");
    const web = dir("web");
    const srv = dir("apps");
    const det = detectors.find((d) => d.id === "firebase-init")!;
    expect(det.match(dc)).toBe(true);
    expect(det.match(web)).toBe(true);
    expect(det.match(srv)).toBe(false);
  });
});

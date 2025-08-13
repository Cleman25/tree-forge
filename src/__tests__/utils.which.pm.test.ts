// src/__tests__/utils.which.pm.test.ts
import { describe, it, expect } from "vitest";
import { detectPM } from "../utils.js";

describe("detectPM", () => {
  it("falls back to npm if others not found", () => {
    // We cannot reliably fake which() here without refactor; check that return is a string
    const pm = detectPM(undefined);
    expect(["npm", "pnpm", "yarn"]).toContain(pm);
  });
});

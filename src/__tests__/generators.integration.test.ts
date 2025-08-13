// src/__tests__/generators.integration.test.ts
import { describe, it, expect } from "vitest";
import path from "path";
import { planFromTree } from "../generators.js";
import { parseTree } from "../parser.js";
import { applyPlan } from "../utils.js";
import type { ForgeConfig } from "../types.js";
import { makeTmpDir, listFilesRecursive, read, exists } from "./helpers.js";

const tetrixTree = `
tetrix/
  turbo.json
  package.json
  tsconfig.json
  .gitignore
  .env.example
  .env.local.example
  apps/
    web/
      package.json
      next.config.mjs
      tsconfig.json
      app/
        layout.tsx
        page.tsx
        lobby/page.tsx
        room/[roomId]/page.tsx
        game/[gameId]/page.tsx
      components/
        GameCanvas.tsx
        ReadyPanel.tsx
        HUD.tsx
        ControlsConfig.tsx
      lib/
        socket.ts
        auth.ts
        dataconnect.ts
        useRoomSockets.ts
        workers/
          engine.worker.ts
      public/
        pieces.json
      styles/globals.css
    socket/
      package.json
      tsconfig.json
      src/index.ts
      src/loop.ts
      src/room.ts
      src/auth.ts
      src/protocol.ts
      src/redis.ts
  packages/
    engine/
      package.json
      tsconfig.json
      src/Tetrix.ts
    protocol/
      package.json
      tsconfig.json
      src/events.ts
    db/
      package.json
      tsconfig.json
      src/client.ts
    ui/
      package.json
      src/index.ts
    utils/
      package.json
      src/index.ts
  dataconnect/
    schema.graphql
    connector.yaml
  infra/
    sql/constraints.sql
    docker/docker-compose.yml
`.trim();

function cfgFor(targetDir: string): ForgeConfig {
  return {
    cwd: process.cwd(),
    targetDir,
    treeText: tetrixTree,
    treeFile: undefined,
    dryRun: false,
    yes: true,
    packageManager: "npm",
    tabIndentationSize: 2,
    detectAsciiGuides: true,
    runDetectors: false,
    generateDotfiles: true
  };
}

describe("planFromTree + applyPlan (filesystem integration)", () => {
  it("creates the directory and file structure and dotfiles", async () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      const cfg = cfgFor(dir);
      const roots = parseTree(tetrixTree, cfg);
      const plan = planFromTree(roots, cfg);
      await applyPlan(plan, false);

      const files = listFilesRecursive(dir);
      expect(files).toContain(path.join("tetrix", "turbo.json"));
      expect(files).toContain(path.join("tetrix", "apps", "web", "package.json"));
      expect(files).toContain(path.join("tetrix", ".gitignore"));
      expect(files).toContain(path.join("tetrix", ".editorconfig"));
      expect(files).toContain(path.join("tetrix", ".prettierrc"));

      const prettierrc = read(path.join(dir, "tetrix", ".prettierrc"));
      expect(prettierrc).toMatch(/printWidth/);

      expect(exists(path.join(dir, "tetrix", "apps", "web", "app", "layout.tsx"))).toBe(true);
      expect(exists(path.join(dir, "tetrix", "infra", "docker", "docker-compose.yml"))).toBe(true);
    } finally {
      cleanup();
    }
  });
});

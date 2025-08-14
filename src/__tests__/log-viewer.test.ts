import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogViewer, openLogViewer } from "../log-viewer.js";
import { Cache } from "../cache.js";
import fs from "fs/promises";
import path from "path";
import open from "open";

// Mock dependencies
vi.mock("fs/promises");
vi.mock("open");
vi.mock("../cache.js");

describe("Log Viewer", () => {
  const mockFs = vi.mocked(fs);
  const mockOpen = vi.mocked(open);
  const mockCache = vi.mocked(Cache);

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock template file read
    (mockFs.readFile as any).mockResolvedValue("<html>Mock Template</html>");
    (mockFs.mkdir as any).mockResolvedValue(undefined);
    (mockFs.writeFile as any).mockResolvedValue(undefined);
    (mockFs.access as any).mockResolvedValue(undefined);

    // Mock cache
    (mockCache.prototype.load as any).mockResolvedValue(undefined);
    (mockCache.prototype.updateLogFile as any).mockResolvedValue(undefined);
    (mockCache.prototype.updateStatsFile as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createLogViewer", () => {
    it("should create viewer with default settings", async () => {
      await createLogViewer("test.log");

      // Should try to open in Chrome by default
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("viewer.html"),
        expect.objectContaining({
          wait: false,
          newWindow: true,
          app: {
            name: expect.stringMatching(/chrome|google-chrome/),
            arguments: expect.any(Array)
          }
        })
      );
    });

    it("should respect browser preference", async () => {
      await createLogViewer("test.log", undefined, {
        browser: "firefox"
      });

      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app: {
            name: "firefox",
            arguments: expect.any(Array)
          }
        })
      );
    });

    it("should handle incognito mode", async () => {
      await createLogViewer("test.log", undefined, {
        browser: "firefox",
        incognito: true
      });

      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app: {
            name: "firefox",
            arguments: expect.arrayContaining(["-private"])
          }
        })
      );
    });

    it("should handle custom browser arguments", async () => {
      await createLogViewer("test.log", undefined, {
        browser: "chrome",
        browserArgs: ["--kiosk", "--disable-gpu"]
      });

      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app: {
            name: expect.stringMatching(/chrome|google-chrome/),
            arguments: expect.arrayContaining(["--kiosk", "--disable-gpu"])
          }
        })
      );
    });

    it("should handle browser arguments as string", async () => {
      await createLogViewer("test.log", undefined, {
        browser: "chrome",
        browserArgs: "--kiosk,--disable-gpu"
      });

      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app: {
            name: expect.stringMatching(/chrome|google-chrome/),
            arguments: expect.arrayContaining(["--kiosk", "--disable-gpu"])
          }
        })
      );
    });

    it("should wait for browser when configured", async () => {
      await createLogViewer("test.log", undefined, {
        waitForBrowser: true
      });

      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          wait: true
        })
      );
    });

    it("should fall back to default browser on error", async () => {
      // Make first open call fail
      mockOpen.mockRejectedValueOnce(new Error("Failed"));
      (mockOpen as any).mockResolvedValueOnce({ pid: 123 });

      await createLogViewer("test.log", undefined, {
        browser: "chrome"
      });

      // Should try Chrome first
      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app: {
            name: expect.stringMatching(/chrome|google-chrome/),
            arguments: expect.any(Array)
          }
        })
      );

      // Should fall back to default browser
      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          app: {
            name: expect.stringMatching(/explorer|xdg-open/),
            arguments: expect.any(Array)
          }
        })
      );
    });
  });

  describe("openLogViewer", () => {
    it("should handle missing files gracefully", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      await expect(openLogViewer({
        logFile: "missing.log"
      })).rejects.toThrow("Failed to open log viewer");
    });

    it("should update cache with viewed files", async () => {
      await openLogViewer({
        logFile: "test.log",
        statsFile: "test.stats.json"
      });

      expect(mockCache.prototype.updateLogFile).toHaveBeenCalledWith(
        expect.stringContaining("test.log")
      );
      expect(mockCache.prototype.updateStatsFile).toHaveBeenCalledWith(
        expect.stringContaining("test.stats.json")
      );
    });

    it("should pass viewer config to createLogViewer", async () => {
      await openLogViewer({
        logFile: "test.log",
        openInChrome: false,
        autoOpenOutputs: true,
        withLog: true,
        withStats: false
      });

      expect(mockOpen).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          wait: true,
          app: {
            name: "firefox",
            arguments: expect.arrayContaining(["-private"])
          }
        })
      );
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { PathValidator, PathNormalizer } from "../path-utils.js";
import type { PathValidationRules, PathConflictStrategy, ForgeConfig } from "../types.js";

describe("PathValidator", () => {
  let validator: PathValidator;

  beforeEach(() => {
    validator = new PathValidator();
  });

  describe("Default Values", () => {
    it("should use default validation rules", () => {
      const errors = validator.validatePath("test/path.txt");
      expect(errors).toHaveLength(0);
    });

    it("should use default conflict strategies", () => {
      validator.validatePath("test/path.txt");
      const errors = validator.validatePath("test/path.txt");
      expect(errors[0].type).toBe("error");
      expect(errors[0].code).toBe("duplicatePath");
    });
  });

  describe("Duplicate Path Resolution", () => {
    beforeEach(() => {
      validator = new PathValidator({}, {
        onDuplicatePath: "numbered",
        renamePattern: "{name}-{n}",
        counterStart: 1,
        counterPadding: 3
      });
    });

    it("should handle numbered duplicates", () => {
      validator.validatePath("test/file.txt");
      const errors = validator.validatePath("test/file.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/file-001.txt");
    });

    it("should increment counter for multiple duplicates", () => {
      validator.validatePath("test/file.txt");
      validator.validatePath("test/file.txt"); // Will become file-001.txt
      const errors = validator.validatePath("test/file.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/file-002.txt");
    });

    it("should handle timestamp strategy", () => {
      validator = new PathValidator({}, { onDuplicatePath: "timestamp" });
      validator.validatePath("test/file.txt");
      const errors = validator.validatePath("test/file.txt");
      expect(errors[0].details?.resolvedPath).toMatch(/test\/file-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.\d{3}Z.txt/);
    });
  });

  describe("Invalid Characters Resolution", () => {
    beforeEach(() => {
      validator = new PathValidator(
        { allowedChars: "^[a-zA-Z0-9-_]+$" },
        { onInvalidChars: "replace", replacementChar: "_" }
      );
    });

    it("should replace invalid characters", () => {
      const errors = validator.validatePath("test/file@#$.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/file___.txt");
    });

    it("should strip invalid characters", () => {
      validator = new PathValidator(
        { allowedChars: "^[a-zA-Z0-9-_]+$" },
        { onInvalidChars: "strip" }
      );
      const errors = validator.validatePath("test/file@#$.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/file.txt");
    });

    it("should encode invalid characters", () => {
      validator = new PathValidator(
        { allowedChars: "^[a-zA-Z0-9-_]+$" },
        { onInvalidChars: "encode" }
      );
      const errors = validator.validatePath("test/file space@#.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/file%20space%40%23.txt");
    });

    it("should transliterate characters", () => {
      validator = new PathValidator(
        { allowedChars: "^[a-zA-Z0-9-_]+$" },
        {
          onInvalidChars: "transliterate",
          transliterationMap: { "é": "e", "ñ": "n", "@": "at" }
        }
      );
      const errors = validator.validatePath("test/résumé@.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/resumeat.txt");
    });
  });

  describe("Long Path Resolution", () => {
    beforeEach(() => {
      validator = new PathValidator(
        { maxPathLength: 20 },
        { onLongPath: "truncate", preserveExtension: true }
      );
    });

    it("should truncate long paths", () => {
      const errors = validator.validatePath("test/very-long-filename.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/very-long-f.txt");
      const resolvedPath = errors[0].details?.resolvedPath as string;
      expect(resolvedPath.length).toBeLessThanOrEqual(20);
    });

    it("should hash long paths", () => {
      validator = new PathValidator(
        { maxPathLength: 20 },
        { onLongPath: "hash", hashAlgorithm: "md5", preserveExtension: true }
      );
      const errors = validator.validatePath("test/very-long-filename.txt");
      expect(errors[0].details?.resolvedPath).toMatch(/test\/[a-f0-9]{8}\.txt/);
    });

    it("should shorten paths intelligently", () => {
      validator = new PathValidator(
        { maxPathLength: 25 },
        { onLongPath: "shorten", preserveExtension: true }
      );
      const errors = validator.validatePath("test/directory/subdirectory/file.txt");
      expect(errors[0].details?.resolvedPath).toBe("test/dir/sub/file.txt");
    });
  });

  describe("Case Enforcement", () => {
    it("should enforce lowercase", () => {
      validator = new PathValidator({ enforceCase: "lower" });
      const errors = validator.validatePath("test/FILE.txt");
      expect(errors[0].code).toBe("wrongCase");
    });

    it("should enforce uppercase", () => {
      validator = new PathValidator({ enforceCase: "upper" });
      const errors = validator.validatePath("test/file.txt");
      expect(errors[0].code).toBe("wrongCase");
    });
  });

  describe("Extension Rules", () => {
    it("should require extensions", () => {
      validator = new PathValidator({ requireExtensions: true });
      const errors = validator.validatePath("test/file");
      expect(errors[0].code).toBe("missingExtension");
    });

    it("should validate allowed extensions", () => {
      validator = new PathValidator({ allowedExtensions: [".txt", ".md"] });
      const errors = validator.validatePath("test/file.doc");
      expect(errors[0].code).toBe("invalidExtension");
    });
  });

  describe("Path Normalization", () => {
    it("should normalize slashes", () => {
      validator = new PathValidator({ normalizeSlashes: true });
      const normalized = validator.normalizePath("test\\path\\file.txt");
      expect(normalized).toBe("test/path/file.txt");
    });

    it("should trim whitespace", () => {
      validator = new PathValidator({ trimWhitespace: true });
      const normalized = validator.normalizePath("test/ file name .txt");
      expect(normalized).toBe("test/file name.txt");
    });

    it("should resolve relative paths", () => {
      validator = new PathValidator({ resolveRelative: true });
      const normalized = validator.normalizePath("test/../other/./file.txt");
      expect(normalized).toBe("other/file.txt");
    });
  });
});

describe("PathNormalizer", () => {
  let config: ForgeConfig;
  let normalizer: PathNormalizer;

  beforeEach(() => {
    config = {
      targetDir: "/root",
      dryRun: false,
      yes: false,
      tabIndentationSize: 2,
      detectAsciiGuides: true,
      runDetectors: true,
      generateDotfiles: true,
      cwd: "/root",
      quiet: false,
      pathNormalization: {
        style: "unix",
        base: "root",
        case: "preserve"
      }
    };
    normalizer = new PathNormalizer(config);
  });

  it("should normalize to unix style", () => {
    const normalized = normalizer.normalize("test\\path\\file.txt");
    expect(normalized).toBe("/root/test/path/file.txt");
  });

  it("should normalize to windows style", () => {
    config.pathNormalization!.style = "windows";
    normalizer = new PathNormalizer(config);
    const normalized = normalizer.normalize("test/path/file.txt");
    expect(normalized).toBe("\\root\\test\\path\\file.txt");
  });

  it("should handle relative paths", () => {
    config.pathNormalization!.base = "relative";
    normalizer = new PathNormalizer(config);
    const normalized = normalizer.normalize("/root/test/file.txt");
    expect(normalized).toBe("test/file.txt");
  });

  it("should handle absolute paths", () => {
    config.pathNormalization!.base = "absolute";
    normalizer = new PathNormalizer(config);
    const normalized = normalizer.normalize("test/file.txt");
    expect(normalized).toBe("/root/test/file.txt");
  });

  it("should convert to lowercase", () => {
    config.pathNormalization!.case = "lower";
    normalizer = new PathNormalizer(config);
    const normalized = normalizer.normalize("TEST/FILE.TXT");
    expect(normalized).toBe("/root/test/file.txt");
  });

  it("should convert to uppercase", () => {
    config.pathNormalization!.case = "upper";
    normalizer = new PathNormalizer(config);
    const normalized = normalizer.normalize("test/file.txt");
    expect(normalized).toBe("/ROOT/TEST/FILE.TXT");
  });
});
import { describe, it, expect } from "vitest";
import { validateTree } from "../validator.js";
import type { TreeNode } from "../types.js";

describe("validateTree", () => {
  it("detects duplicate paths", () => {
    const text = [
      "root/",
      "  folder/",
      "    file.txt",
      "  other/",
      "    folder/",  // Duplicate path
      "      file.txt"  // Duplicate path
    ].join("\n");

    const nodes: TreeNode[] = [
      {
        name: "root",
        path: "root",
        kind: "dir",
        children: [
          {
            name: "folder",
            path: "root/folder",
            kind: "dir",
            children: [
              {
                name: "file.txt",
                path: "root/folder/file.txt",
                kind: "file",
                children: []
              }
            ]
          },
          {
            name: "other",
            path: "root/other",
            kind: "dir",
            children: [
              {
                name: "folder",
                path: "root/folder",  // Duplicate
                kind: "dir",
                children: [
                  {
                    name: "file.txt",
                    path: "root/folder/file.txt",  // Duplicate
                    kind: "file",
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    const errors = validateTree(text, nodes);
    const duplicateErrors = errors.filter(e => e.message.includes("duplicated"));
    expect(duplicateErrors).toHaveLength(2);
    expect(duplicateErrors[0].message).toContain("root/folder");
    expect(duplicateErrors[1].message).toContain("root/folder/file.txt");
  });

  it("validates empty tree", () => {
    const errors = validateTree("", []);
    expect(errors[0].message).toBe("Tree is empty. Please provide a valid tree structure.");
  });

  it("validates root node indentation", () => {
    const text = [
      "  root/",  // Indented root
      "    child/"
    ].join("\n");

    const errors = validateTree(text, []);
    expect(errors[0].message).toBe("First line must be a root node without indentation.");
  });

  it("validates node names", () => {
    const text = [
      "root/",
      "  valid-name/",
      "  invalid<name>/",  // Contains invalid char
      "  /absolute/path/", // Absolute path
      "  C:\\windows\\path/", // Windows absolute path
      "  empty-dir/",
      "  |"  // Empty node
    ].join("\n");

    const errors = validateTree(text, []);
    const nameErrors = errors.filter(e => 
      e.message.includes("invalid characters") || 
      e.message.includes("absolute paths") ||
      e.message.includes("Empty node name")
    );
    expect(nameErrors).toHaveLength(4);
  });

  it("validates indentation consistency", () => {
    const text = [
      "root/",
      "  level1/",
      "      level3/",  // Skipped level2
      "    back-to-level2/"
    ].join("\n");

    const errors = validateTree(text, []);
    expect(errors.find(e => e.message.includes("can only increase by 1"))).toBeTruthy();
  });

  it("handles comments correctly", () => {
    const text = [
      "root/ # Root directory",
      "  apps/ /* Web applications */",
      "    web/ // Next.js frontend",
      "      package.json"
    ].join("\n");

    const errors = validateTree(text, []);
    expect(errors.length).toBe(0);
  });

  it("validates multiple root nodes", () => {
    const text = [
      "root1/",
      "  child1/",
      "root2/",
      "  child2/"
    ].join("\n");

    const nodes: TreeNode[] = [
      {
        name: "root1",
        path: "root1",
        kind: "dir",
        children: [
          {
            name: "child1",
            path: "root1/child1",
            kind: "dir",
            children: []
          }
        ]
      },
      {
        name: "root2",
        path: "root2",
        kind: "dir",
        children: [
          {
            name: "child2",
            path: "root2/child2",
            kind: "dir",
            children: []
          }
        ]
      }
    ];

    const errors = validateTree(text, nodes);
    const warnings = errors.filter(e => e.type === "warning");
    expect(warnings[0].message).toBe("Multiple root nodes found. This might lead to unexpected behavior.");
  });
});

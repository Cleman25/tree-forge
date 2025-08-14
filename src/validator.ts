import { TreeNode, ForgeConfig } from "./types.js";
import { PathValidator, PathValidationError } from "./path-utils.js";

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  context?: string;
}

function validateComments(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = text.split(/\r?\n/);

  // Track comment block states
  let inPythonComment = false;
  let inCComment = false;
  let inHashComment = false;
  let commentStartLine = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check Python-style comments
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      if (!inPythonComment) {
        if (idx > 0 && lines[idx-1].trim().length !== 0) {
          errors.push({
            type: 'warning',
            message: 'Multiline comment block should be preceded by an empty line',
            line: idx + 1,
            context: line
          });
        }
        inPythonComment = true;
        commentStartLine = idx;
      } else {
        inPythonComment = false;
        if (idx < lines.length - 1 && lines[idx+1].trim().length !== 0) {
          errors.push({
            type: 'warning',
            message: 'Multiline comment block should be followed by an empty line',
            line: idx + 1,
            context: line
          });
        }
      }
    }

    // Check C-style comments
    if (trimmed.startsWith('/*')) {
      if (!inCComment) {
        if (idx > 0 && lines[idx-1].trim().length !== 0) {
          errors.push({
            type: 'warning',
            message: 'Multiline comment block should be preceded by an empty line',
            line: idx + 1,
            context: line
          });
        }
        inCComment = true;
        commentStartLine = idx;
      }
    }
    if (trimmed.endsWith('*/')) {
      if (inCComment) {
        inCComment = false;
        if (idx < lines.length - 1 && lines[idx+1].trim().length !== 0) {
          errors.push({
            type: 'warning',
            message: 'Multiline comment block should be followed by an empty line',
            line: idx + 1,
            context: line
          });
        }
      }
    }

    // Check hash-style comment blocks
    if (trimmed === '#' || trimmed === '# ---' || trimmed === '#---') {
      if (!inHashComment) {
        if (idx > 0 && lines[idx-1].trim().length !== 0) {
          errors.push({
            type: 'warning',
            message: 'Multiline comment block should be preceded by an empty line',
            line: idx + 1,
            context: line
          });
        }
        inHashComment = true;
        commentStartLine = idx;
      } else {
        inHashComment = false;
        if (idx < lines.length - 1 && lines[idx+1].trim().length !== 0) {
          errors.push({
            type: 'warning',
            message: 'Multiline comment block should be followed by an empty line',
            line: idx + 1,
            context: line
          });
        }
      }
    }

    // Check for unclosed comment blocks at EOF
    if (idx === lines.length - 1) {
      if (inPythonComment) {
        errors.push({
          type: 'error',
          message: 'Unclosed Python-style comment block',
          line: commentStartLine + 1,
          context: lines[commentStartLine]
        });
      }
      if (inCComment) {
        errors.push({
          type: 'error',
          message: 'Unclosed C-style comment block',
          line: commentStartLine + 1,
          context: lines[commentStartLine]
        });
      }
      if (inHashComment) {
        errors.push({
          type: 'error',
          message: 'Unclosed hash-style comment block',
          line: commentStartLine + 1,
          context: lines[commentStartLine]
        });
      }
    }
  });

  return errors;
}

export function validateTree(text: string, roots: TreeNode[], cfg?: ForgeConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate comments first
  errors.push(...validateComments(text));

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // Check for empty tree
  if (lines.length === 0) {
    errors.push({
      type: 'error',
      message: 'Tree is empty. Please provide a valid tree structure.'
    });
    return errors;
  }

  // Check for root node
  if (lines[0].startsWith(' ') || lines[0].startsWith('│') || 
      lines[0].startsWith('├') || lines[0].startsWith('└') ||
      lines[0].startsWith('-') || lines[0].startsWith('|')) {
    errors.push({
      type: 'error',
      message: 'First line must be a root node without indentation.',
      line: 1,
      context: lines[0]
    });
  }

  // Check for valid node names
  lines.forEach((line, idx) => {
    // Skip lines that are just tree guides
    if (/^[│|]*$/.test(line.trim())) {
      return;
    }

    // Remove comments first
    const lineWithoutComments = line
      .replace(/\/\*.*?\*\//g, '') // Remove inline /* comments */
      .replace(/\/\/.*$/g, '')     // Remove // comments
      .replace(/#.*$/g, '')        // Remove # comments
      .trim();

    // Skip empty lines after comment removal
    if (!lineWithoutComments) {
      return;
    }

    // Extract actual node name by removing tree characters and getting the last part
    const parts = lineWithoutComments.split(/[-│├└|+`\s]+/).filter(Boolean);
    const name = parts[parts.length - 1];
    
    // Check for empty node names
    if (!name) {
      errors.push({
        type: 'error',
        message: 'Empty node name.',
        line: idx + 1,
        context: line
      });
    }

    // Check for invalid characters in node names
    if (/[<>:"|?*]/.test(name)) {
      errors.push({
        type: 'error',
        message: 'Node name contains invalid characters (< > : " | ? *).',
        line: idx + 1,
        context: line
      });
    }

    // Check for absolute paths
    if (name.startsWith('/') || /^[A-Za-z]:\\/.test(name)) {
      errors.push({
        type: 'error',
        message: 'Node names cannot be absolute paths.',
        line: idx + 1,
        context: line
      });
    }
  });

  // Check tree structure
  let lastDepth = 0;
  lines.forEach((line, idx) => {
    const spaces = line.match(/^\s*/);
    const treeChars = line.match(/^[-│├└|+`]*/);
    const depth = (spaces ? spaces[0].length / 2 : 0) || 
                 (treeChars ? treeChars[0].length : 0);
    
    // Check for invalid depth increase
    if (depth > lastDepth + 1) {
      errors.push({
        type: 'error',
        message: 'Invalid indentation. Depth can only increase by 1.',
        line: idx + 1,
        context: line
      });
    }
    lastDepth = depth;
  });

  // Check parsed tree structure
  if (roots.length === 0) {
    errors.push({
      type: 'error',
      message: 'No root nodes found after parsing.'
    });
  }

  // Validate paths if config is provided
  if (cfg?.pathValidation) {
    const pathValidator = new PathValidator(cfg.pathValidation, cfg.pathConflict);
    const validateNode = (node: TreeNode) => {
      const pathErrors = pathValidator.validatePath(node.path);
      errors.push(...pathErrors.map(err => ({
        type: err.type,
        message: err.message,
        context: `Path: ${err.path}`
      })));
      node.children.forEach(validateNode);
    };
    roots.forEach(validateNode);
  } else {
    // Basic duplicate path check if no validation config
    const pathMap = new Map<string, { node: TreeNode; count: number }>();
    const checkDuplicates = (node: TreeNode) => {
      const existing = pathMap.get(node.path);
      if (existing) {
        existing.count++;
        errors.push({
          type: 'error',
          message: `Path "${node.path}" is duplicated. First occurrence: ${existing.node.name}, Current: ${node.name}`
        });
      } else {
        pathMap.set(node.path, { node, count: 1 });
      }
      node.children.forEach(checkDuplicates);
    };
    roots.forEach(checkDuplicates);
  }

  // Add warnings for potential issues
  if (roots.length > 1) {
    errors.push({
      type: 'warning',
      message: 'Multiple root nodes found. This might lead to unexpected behavior.'
    });
  }

  return errors;
}

# Path Handling Guide

## Overview

The `forge-tree` tool provides comprehensive path handling capabilities through three main components:
- Path Validation
- Path Normalization
- Conflict Resolution

## Path Validation Rules

The `PathValidationRules` configuration allows you to define constraints for file and directory paths:

```typescript
{
  maxDepth: 32,              // Maximum directory depth
  maxPathLength: 260,        // Maximum path length
  maxNameLength: 255,        // Maximum file/directory name length
  allowedChars: "^[a-zA-Z0-9-_.]+$",  // Regex for allowed characters
  disallowedNames: ["CON", "PRN", "AUX", ...],  // Reserved names
  enforceCase: "any",        // "lower", "upper", or "any"
  allowDots: false,          // Allow dots in directory names
  allowSpaces: false,        // Allow spaces in paths
  requireExtensions: false,  // Require file extensions
  allowedExtensions: [],     // List of allowed extensions
  uniqueNames: true,         // Require unique names within directories
  uniquePaths: true,         // Require globally unique paths
  normalizeSlashes: true,    // Normalize path separators
  trimWhitespace: true,      // Trim whitespace from names
  resolveRelative: false     // Resolve relative paths (../foo)
}
```

## Conflict Resolution

The `PathConflictStrategy` configuration defines how to handle various path-related conflicts:

### Duplicate Path Resolution

When a path already exists:

```typescript
{
  onDuplicatePath: "numbered",  // How to handle duplicate paths
  renamePattern: "{name}-{n}",  // Pattern for numbered duplicates
  counterStart: 1,              // Starting number for duplicates
  counterPadding: 3,            // Padding for numbers (e.g., 001)
}
```

Options for `onDuplicatePath`:
- `"error"`: Throw an error (default)
- `"warn"`: Log a warning but continue
- `"rename"`: Auto-rename using the pattern
- `"merge"`: Use mergeStrategy to combine content
- `"skip"`: Skip the duplicate
- `"numbered"`: Add incremental numbers
- `"timestamp"`: Add timestamps
- Custom function: `(path, conflict) => string`

### Invalid Character Resolution

When paths contain invalid characters:

```typescript
{
  onInvalidChars: "replace",    // How to handle invalid characters
  replacementChar: "_",         // Character to use for replacement
  transliterationMap: {         // Custom character mappings
    "é": "e",
    "ñ": "n",
    "@": "at"
  }
}
```

Options for `onInvalidChars`:
- `"error"`: Throw an error (default)
- `"warn"`: Log a warning but continue
- `"replace"`: Replace with replacementChar
- `"strip"`: Remove invalid characters
- `"encode"`: URL-encode invalid characters
- `"transliterate"`: Use transliterationMap
- Custom function: `(path, conflict) => string`

### Long Path Resolution

When paths exceed maximum length:

```typescript
{
  onLongPath: "truncate",       // How to handle long paths
  preserveExtension: true,      // Keep file extensions when shortening
  hashAlgorithm: "sha256"       // Algorithm for hash-based shortening
}
```

Options for `onLongPath`:
- `"error"`: Throw an error (default)
- `"warn"`: Log a warning but continue
- `"truncate"`: Cut off excess characters
- `"hash"`: Replace with short hash
- `"shorten"`: Intelligently shorten
- Custom function: `(path, conflict) => string`

### Merge Strategy

When merging duplicate paths:

```typescript
{
  mergeStrategy: {
    files: "keep-newer",        // How to merge duplicate files
    directories: "merge-recursive"  // How to merge directories
  }
}
```

Options for `files`:
- `"keep-both"`: Keep both files (rename one)
- `"keep-newer"`: Keep the newer file
- `"keep-larger"`: Keep the larger file
- `"concatenate"`: Combine file contents
- Custom function: `(path, conflict) => string`

Options for `directories`:
- `"merge-recursive"`: Combine contents recursively
- `"keep-both"`: Keep both directories (rename one)
- `"keep-newer"`: Keep the newer directory
- Custom function: `(path, conflict) => string`

## Path Normalization

The `pathNormalization` configuration controls how paths are standardized:

```typescript
{
  style: "unix",           // "unix", "windows", or "mixed"
  base: "root",           // "root", "relative", or "absolute"
  case: "preserve"        // "preserve", "lower", or "upper"
}
```

## Examples

### Basic Validation

```typescript
const config = {
  pathValidation: {
    maxPathLength: 200,
    allowedChars: "^[a-z0-9-]+$",
    enforceCase: "lower",
    uniquePaths: true
  }
};
```

### Auto-Renaming Duplicates

```typescript
const config = {
  pathConflict: {
    onDuplicatePath: "numbered",
    renamePattern: "{name}-copy-{n}",
    counterStart: 1,
    counterPadding: 2
  }
};
```

### Handling Invalid Characters

```typescript
const config = {
  pathConflict: {
    onInvalidChars: "transliterate",
    transliterationMap: {
      "é": "e",
      "ñ": "n",
      "ü": "u",
      "@": "at",
      "&": "and"
    }
  }
};
```

### Smart Path Shortening

```typescript
const config = {
  pathConflict: {
    onLongPath: "shorten",
    preserveExtension: true
  }
};
```

### Directory Merging

```typescript
const config = {
  pathConflict: {
    onDuplicatePath: "merge",
    mergeStrategy: {
      files: "keep-newer",
      directories: "merge-recursive"
    }
  }
};
```

### Custom Resolution Function

```typescript
const config = {
  pathConflict: {
    onDuplicatePath: (path, conflict) => {
      if (conflict.type === "duplicate") {
        return path + ".backup";
      }
      return path;
    }
  }
};
```

## Best Practices

1. **Start Strict**: Begin with strict validation rules and loosen them if needed:
   ```typescript
   {
     pathValidation: {
       allowedChars: "^[a-z0-9-]+$",
       enforceCase: "lower",
       uniquePaths: true
     }
   }
   ```

2. **Safe Defaults**: Use safe conflict resolution strategies:
   ```typescript
   {
     pathConflict: {
       onDuplicatePath: "numbered",
       onInvalidChars: "replace",
       onLongPath: "truncate"
     }
   }
   ```

3. **Preserve Extensions**: When shortening paths:
   ```typescript
   {
     pathConflict: {
       preserveExtension: true
     }
   }
   ```

4. **Consistent Style**: Use consistent path normalization:
   ```typescript
   {
     pathNormalization: {
       style: "unix",
       case: "lower"
     }
   }
   ```

## Error Handling

Path validation errors include:
- `duplicatePath`: Path already exists
- `invalidChars`: Contains invalid characters
- `longPath`: Exceeds maximum length
- `maxDepth`: Too many directory levels
- `reservedName`: Uses reserved name
- `wrongCase`: Incorrect case
- `dotsInDir`: Dots in directory name
- `spacesInPath`: Contains spaces
- `missingExtension`: No file extension
- `invalidExtension`: Disallowed extension

Each error includes:
- `type`: "error" or "warning"
- `code`: Error code
- `message`: Human-readable message
- `path`: Affected path
- `details`: Additional context
- `resolvedPath`: Suggested fix (if available)
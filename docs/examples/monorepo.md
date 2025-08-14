# Monorepo Path Configuration

This example shows how to configure path handling for a monorepo structure with multiple packages, apps, and shared configurations.

## Tree Structure

```
monorepo/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  └─ package.json
│  └─ api/
│     ├─ src/
│     └─ package.json
├─ packages/
│  ├─ ui/
│  │  ├─ src/
│  │  └─ package.json
│  └─ utils/
│     ├─ src/
│     └─ package.json
└─ config/
   ├─ tsconfig/
   └─ eslint/
```

## Configuration

```typescript
const monorepoConfig: ForgeConfig = {
  // Path validation rules
  pathValidation: {
    maxDepth: 5,  // apps/web/src/components/Button.tsx
    allowedChars: "^[a-z0-9-_.]+$",  // Enforce lowercase kebab-case
    enforceCase: "lower",
    disallowedNames: [
      "node_modules", "dist", "build", ".git",
      "coverage", ".next", ".cache"
    ],
    allowedExtensions: [
      ".ts", ".tsx", ".js", ".jsx", ".json",
      ".md", ".css", ".scss"
    ],
    uniquePaths: true,
    uniqueNames: true,  // No duplicate package names
    resolveRelative: false  // Prevent escaping workspace
  },

  // Conflict handling
  pathConflict: {
    onDuplicatePath: "error",  // Fail on duplicate package names
    onDuplicateName: "error",  // Fail on duplicate file names
    onInvalidChars: "replace", // Replace invalid chars with -
    onLongPath: "error",       // Fail on long paths
    replacementChar: "-",
    mergeStrategy: {
      files: "keep-newer",     // Keep newer version of configs
      directories: "merge-recursive"  // Merge shared directories
    }
  },

  // Path normalization
  pathNormalization: {
    style: "unix",     // Use forward slashes
    base: "relative",  // Keep paths relative to root
    case: "lower"      // Force lowercase
  }
};
```

## Usage Examples

### Package Names

```typescript
// Valid package names
ui/
shared-utils/
auth-service/

// Invalid package names (will be normalized or rejected)
UI/                  // Uppercase
shared_utils/        // Underscore
auth.service/        // Dot in directory
```

### File Paths

```typescript
// Valid paths
apps/web/src/components/Button.tsx
packages/ui/src/hooks/useTheme.ts
config/tsconfig/base.json

// Invalid paths (will error)
apps/web/../../outside.ts     // Tries to escape
packages/UI/Components/Button.tsx  // Wrong case
apps/web/very/deep/nesting/path.ts  // Too deep
```

### Conflict Resolution

```typescript
// Duplicate package prevention
packages/
  ├─ utils/         // Original
  └─ utils/         // Error: Duplicate package name

// Config file merging
config/
  └─ tsconfig/
     ├─ base.json   // Original
     └─ base.json   // Merged based on timestamp
```

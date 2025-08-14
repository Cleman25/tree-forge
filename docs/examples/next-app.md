# Next.js App Path Configuration

This example demonstrates path handling configuration for a Next.js application with app router, API routes, and various asset types.

## Tree Structure

```
web-app/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ blog/
│  │  └─ [slug]/
│  │     └─ page.tsx
│  └─ api/
│     └─ auth/
│        └─ [...nextauth]/
│           └─ route.ts
├─ components/
│  └─ ui/
│     ├─ Button.tsx
│     └─ Card.tsx
├─ public/
│  ├─ images/
│  └─ fonts/
└─ styles/
   └─ globals.css
```

## Configuration

```typescript
const nextConfig: ForgeConfig = {
  pathValidation: {
    maxDepth: 6,  // Allow for dynamic routes
    allowedChars: "^[a-zA-Z0-9-_.[\\]]+$",  // Allow [] for dynamic routes
    enforceCase: "any",  // Mixed case for components
    disallowedNames: [
      ".next", "node_modules", ".turbo",
      ".vercel", "out", "build"
    ],
    allowedExtensions: [
      // Source files
      ".ts", ".tsx", ".js", ".jsx", ".mjs",
      // Styles
      ".css", ".scss", ".sass", ".less",
      // Assets
      ".svg", ".png", ".jpg", ".webp",
      ".woff", ".woff2", ".ttf",
      // Config
      ".json", ".env"
    ],
    uniquePaths: true,
    uniqueNames: false,  // Allow page.tsx in different routes
    resolveRelative: false
  },

  pathConflict: {
    onDuplicatePath: (path, conflict) => {
      // Special handling for page files
      if (path.endsWith('page.tsx')) {
        return path;  // Allow duplicates in different directories
      }
      // Special handling for API routes
      if (path.includes('/api/')) {
        return path;  // Allow route.ts in different endpoints
      }
      return `${path}.${Date.now()}`;  // Timestamp other duplicates
    },
    onInvalidChars: "error",
    onLongPath: "error",
    mergeStrategy: {
      files: "keep-newer",
      directories: "merge-recursive"
    }
  },

  pathNormalization: {
    style: "unix",
    base: "relative",
    case: "preserve"  // Preserve component casing
  }
};
```

## Usage Examples

### Page Routes

```typescript
// Valid routes
app/page.tsx
app/blog/page.tsx
app/blog/[slug]/page.tsx
app/blog/[...slug]/page.tsx

// Invalid routes (will error)
app/Blog/page.tsx        // Uppercase directory
app/blog/[slug].tsx      // Wrong file name
app/blog/[<invalid>]/page.tsx  // Invalid characters
```

### API Routes

```typescript
// Valid API routes
app/api/auth/route.ts
app/api/posts/[id]/route.ts
app/api/[...path]/route.ts

// Invalid routes (will error)
app/api/auth.ts          // Missing route.ts
app/api/posts/endpoint.ts  // Wrong file name
```

### Component Organization

```typescript
// Valid component paths
components/ui/Button.tsx
components/forms/LoginForm.tsx
components/layout/Header/index.tsx

// Invalid paths (will error)
components/UI/button.tsx   // Inconsistent casing
components/forms/.tsx      // Empty name
components/$/Special.tsx   // Invalid character
```

### Asset Handling

```typescript
// Valid asset paths
public/images/logo.svg
public/fonts/Inter.woff2
styles/components/button.module.css

// Invalid paths (will error)
public/images/logo.exe    // Invalid extension
public/fonts/font space.ttf  // Contains space
styles/components/Button.CSS  // Wrong extension case
```

## Special Cases

### Dynamic Routes

The configuration allows for Next.js dynamic route syntax:

```typescript
// Square brackets in paths
allowedChars: "^[a-zA-Z0-9-_.[\\]]+$"

// Examples
[id]/
[slug]/
[...path]/
[[...optional]]/
```

### Duplicate Pages

The configuration allows for `page.tsx` and `route.ts` in different directories:

```typescript
// Custom duplicate handler
onDuplicatePath: (path, conflict) => {
  if (path.endsWith('page.tsx') || path.endsWith('route.ts')) {
    return path;  // Allow duplicates for pages and API routes
  }
  return `${path}.${Date.now()}`;
}
```

### Case Sensitivity

The configuration preserves case for components but enforces lowercase for routes:

```typescript
// Components (preserved case)
Button.tsx
CardList.tsx
NavBar.tsx

// Routes (lowercase)
app/blog/
app/about/
app/contact/
```

### Asset Organization

The configuration ensures proper asset organization:

```typescript
// Image handling
public/
  └─ images/
     ├─ hero.jpg       // Valid
     ├─ about.webp     // Valid
     └─ logo.svg       // Valid

// Font handling
public/
  └─ fonts/
     ├─ Inter.woff2    // Valid
     ├─ Roboto.ttf     // Valid
     └─ font.exe       // Invalid (blocked by extension)

// Style handling
styles/
  ├─ globals.css          // Valid
  ├─ components/
  │  └─ button.module.css // Valid
  └─ utils/
     └─ variables.scss    // Valid
```

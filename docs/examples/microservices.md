# Microservices Path Configuration

This example shows path handling configuration for a microservices architecture with multiple services, shared libraries, and infrastructure code.

## Tree Structure

```
services/
├─ auth/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ models/
│  │  └─ services/
│  ├─ test/
│  └─ Dockerfile
├─ users/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ models/
│  │  └─ services/
│  ├─ test/
│  └─ Dockerfile
├─ shared/
│  ├─ logger/
│  ├─ database/
│  └─ validation/
└─ infrastructure/
   ├─ kubernetes/
   ├─ terraform/
   └─ docker-compose.yml
```

## Configuration

```typescript
const microservicesConfig: ForgeConfig = {
  pathValidation: {
    maxDepth: 5,
    allowedChars: "^[a-z0-9-_.]+$",
    enforceCase: "lower",  // Consistent lowercase
    disallowedNames: [
      "node_modules", "dist", ".git",
      "coverage", "tmp", "temp"
    ],
    allowedExtensions: [
      // Source code
      ".ts", ".js", ".proto",
      // Config
      ".yml", ".yaml", ".json", ".env",
      // Infrastructure
      ".tf", ".hcl", "Dockerfile"
    ],
    uniquePaths: true,
    uniqueNames: true,  // No duplicate service names
    resolveRelative: false
  },

  pathConflict: {
    onDuplicatePath: "error",  // No duplicate services
    onDuplicateName: "error",  // No duplicate files
    onInvalidChars: "replace",
    onLongPath: "error",
    mergeStrategy: {
      files: (path, conflict) => {
        // Special handling for different file types
        if (path.endsWith('.env')) {
          return 'skip';  // Don't overwrite env files
        }
        if (path.endsWith('.yaml') || path.endsWith('.yml')) {
          return 'merge-recursive';  // Deep merge YAML
        }
        if (path.endsWith('.json')) {
          return 'keep-newer';  // Keep newer JSON
        }
        return 'error';  // Error on other duplicates
      },
      directories: "merge-recursive"
    }
  },

  pathNormalization: {
    style: "unix",
    base: "relative",
    case: "lower"
  }
};
```

## Usage Examples

### Service Structure

```typescript
// Valid service paths
services/auth/
services/user-management/
services/email-service/

// Invalid paths (will error)
services/Auth/           // Uppercase
services/user_mgmt/      // Underscore
services/email.service/  // Dot in directory
```

### Infrastructure Files

```typescript
// Valid infrastructure paths
infrastructure/
  ├─ kubernetes/
  │  ├─ auth-deployment.yaml
  │  ├─ user-service.yaml
  │  └─ ingress.yaml
  ├─ terraform/
  │  ├─ main.tf
  │  ├─ variables.tf
  │  └─ outputs.tf
  └─ docker/
     ├─ auth.Dockerfile
     └─ user.Dockerfile

// Invalid paths (will error)
infrastructure/
  ├─ Kubernetes/         // Uppercase
  ├─ terraform.old/      // Invalid chars
  └─ docker/test.sh      // Unauthorized extension
```

### Environment Files

```typescript
// Valid env file paths
services/
  ├─ auth/
  │  ├─ .env.example
  │  └─ .env.test
  └─ users/
     ├─ .env.example
     └─ .env.test

// Special handling in merge strategy
mergeStrategy: {
  files: (path) => {
    if (path.endsWith('.env')) {
      return 'skip';  // Never overwrite env files
    }
  }
}
```

## Special Cases

### Kubernetes Resources

```typescript
// Valid Kubernetes paths
kubernetes/
  ├─ deployments/
  │  ├─ auth.yaml
  │  └─ users.yaml
  ├─ services/
  │  ├─ auth-svc.yaml
  │  └─ users-svc.yaml
  └─ config/
     ├─ auth-config.yaml
     └─ users-config.yaml

// YAML merge strategy
mergeStrategy: {
  files: (path) => {
    if (path.endsWith('.yaml')) {
      return 'merge-recursive';  // Deep merge YAML
    }
  }
}
```

### Shared Libraries

```typescript
// Valid shared library paths
shared/
  ├─ logger/
  │  ├─ src/
  │  │  └─ index.ts
  │  └─ package.json
  └─ database/
     ├─ src/
     │  └─ index.ts
     └─ package.json

// Invalid paths (will error)
shared/
  ├─ Logger/           // Uppercase
  └─ database.utils/   // Dot in name
```

### Service Configuration

```typescript
// Valid config paths
services/auth/
  ├─ config/
  │  ├─ default.json
  │  ├─ production.json
  │  └─ development.json
  └─ src/
     └─ config.ts

// JSON merge strategy
mergeStrategy: {
  files: (path) => {
    if (path.endsWith('.json')) {
      return 'keep-newer';  // Keep newer JSON files
    }
  }
}
```

### Protocol Definitions

```typescript
// Valid proto file paths
protos/
  ├─ auth/
  │  └─ v1/
  │     ├─ auth.proto
  │     └─ users.proto
  └─ shared/
     └─ common.proto

// Extension validation
allowedExtensions: [
  ".proto",  // Protocol buffers
  ".thrift", // Thrift definitions
  ".avsc"    // Avro schemas
]
```

### Test Organization

```typescript
// Valid test paths
services/auth/
  └─ test/
     ├─ unit/
     │  └─ auth.test.ts
     ├─ integration/
     │  └─ auth.spec.ts
     └─ e2e/
        └─ auth.e2e.ts

// Test file pattern
allowedChars: "^[a-z0-9-_.]+$"  // Allow dots for test files
```

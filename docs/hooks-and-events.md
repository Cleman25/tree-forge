# Hooks and Events

## Overview

The forge-tree tool provides a comprehensive hooks and events system for customizing and monitoring the initialization process. This system allows you to:

- Execute code at specific points in the initialization lifecycle
- Monitor the progress of initialization
- Handle errors and validation
- Customize behavior based on conditions
- Track performance and metrics

## Hooks

Hooks are functions that run at specific points in a detector's lifecycle. They can be used to prepare resources, clean up, or modify behavior.

### Available Hooks

```typescript
interface DetectorHooks {
  preDetect?: () => Promise<void>;     // Before detection phase
  postDetect?: () => Promise<void>;    // After detection phase
  preValidate?: () => Promise<void>;   // Before validation
  postValidate?: () => Promise<void>;  // After validation
  prePrompt?: () => Promise<void>;     // Before user prompts
  postPrompt?: () => Promise<void>;    // After user prompts
  preGenerate?: () => Promise<void>;   // Before generation
  postGenerate?: () => Promise<void>;  // After generation
  preProcess?: () => Promise<void>;    // Before post-processing
  postProcess?: () => Promise<void>;   // After post-processing
  onError?: (error: Error) => Promise<void>;  // Error handling
  onComplete?: () => Promise<void>;    // Completion handling
}
```

### Using Hooks

```typescript
const MyDetector: Detector = {
  id: "my-detector",
  // ... other required fields ...
  hooks: {
    preGenerate: async () => {
      // Setup before generation
      await prepareResources();
    },
    postGenerate: async () => {
      // Cleanup after generation
      await cleanupResources();
    },
    onError: async (error) => {
      // Handle errors
      await logError(error);
    }
  }
};
```

## Events

Events provide a way to monitor and react to the initialization process. They carry detailed information about each phase.

### Available Events

```typescript
interface DetectorEvents {
  'init:start': { 
    detectorId: string;
    node: TreeNode;
  };
  'init:validate': {
    detectorId: string;
    node: TreeNode;
    isValid: boolean;
  };
  'init:prompt': {
    detectorId: string;
    node: TreeNode;
    confirmed: boolean;
  };
  'init:generate': {
    detectorId: string;
    node: TreeNode;
    actions: PlanAction[];
  };
  'init:complete': {
    detectorId: string;
    node: TreeNode;
    success: boolean;
  };
  'init:error': {
    detectorId: string;
    node: TreeNode;
    error: Error;
  };
}
```

### Using Events

```typescript
// Subscribe to events
detectorManager.on('init:start', ({ detectorId, node }) => {
  console.log(`Starting initialization of ${node.path}`);
});

detectorManager.on('init:generate', ({ actions }) => {
  console.log(`Generated ${actions.length} actions`);
});

detectorManager.on('init:error', ({ error }) => {
  console.error('Initialization failed:', error);
});

// Unsubscribe when done
detectorManager.off('init:start', handler);
```

## Validation

Both hooks and events are validated to ensure correct usage:

### Hook Validation

- All hooks must be async functions
- Hook names must match the defined interface
- Hooks are optional but must be valid if provided

### Event Validation

- Event data must contain all required fields
- Field types are validated (e.g., actions must be an array)
- Error events must contain valid Error instances
- Event handlers must be functions

## Error Handling

The system provides multiple layers of error handling:

1. **Hook Errors**
   - Caught and logged
   - Emitted as error events
   - Can be handled by onError hook

2. **Event Handler Errors**
   - Caught and logged
   - Re-emitted as error events
   - Won't break other handlers

3. **Validation Errors**
   - Thrown immediately
   - Prevent invalid usage
   - Clear error messages

## Best Practices

1. **Hook Usage**
   - Keep hooks focused and simple
   - Use async/await consistently
   - Clean up resources in post hooks
   - Handle errors appropriately

2. **Event Handling**
   - Subscribe early in the process
   - Unsubscribe when done
   - Keep handlers lightweight
   - Handle errors gracefully

3. **Error Handling**
   - Always provide error handlers
   - Log errors appropriately
   - Clean up resources on error
   - Provide user feedback

## Examples

### Complete Detector with Hooks

```typescript
const CompleteDetector: Detector = {
  id: "complete-detector",
  match: (node, cfg) => true,
  validate: async (node, cfg) => true,
  prompt: async (node) => true,
  generate: async (node, cfg) => ({
    actions: [],
    description: "Complete detector example"
  }),
  hooks: {
    preDetect: async () => {
      console.log("Starting detection");
    },
    postDetect: async () => {
      console.log("Detection complete");
    },
    preValidate: async () => {
      console.log("Starting validation");
    },
    postValidate: async () => {
      console.log("Validation complete");
    },
    prePrompt: async () => {
      console.log("Preparing prompts");
    },
    postPrompt: async () => {
      console.log("Prompts complete");
    },
    preGenerate: async () => {
      console.log("Starting generation");
    },
    postGenerate: async () => {
      console.log("Generation complete");
    },
    onError: async (error) => {
      console.error("Error occurred:", error);
    },
    onComplete: async () => {
      console.log("All operations complete");
    }
  }
};
```

### Comprehensive Event Monitoring

```typescript
function setupEventMonitoring(manager: DetectorManager) {
  // Track overall progress
  let totalActions = 0;
  let completedActions = 0;

  manager.on('init:start', ({ detectorId, node }) => {
    console.log(`📦 Starting ${detectorId} for ${node.path}`);
  });

  manager.on('init:validate', ({ detectorId, node, isValid }) => {
    console.log(`✓ Validation ${isValid ? 'passed' : 'failed'} for ${node.path}`);
  });

  manager.on('init:prompt', ({ detectorId, node, confirmed }) => {
    console.log(`👤 User ${confirmed ? 'confirmed' : 'declined'} ${node.path}`);
  });

  manager.on('init:generate', ({ detectorId, node, actions }) => {
    totalActions += actions.length;
    console.log(`⚡ Generated ${actions.length} actions for ${node.path}`);
  });

  manager.on('init:complete', ({ detectorId, node, success }) => {
    completedActions++;
    const progress = (completedActions / totalActions) * 100;
    console.log(`✨ ${detectorId} complete: ${progress.toFixed(1)}%`);
  });

  manager.on('init:error', ({ detectorId, node, error }) => {
    console.error(`❌ Error in ${detectorId}:`, error.message);
  });
}
```

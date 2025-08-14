# Troubleshooting Guide

## Common Issues and Solutions

### Tree Parsing Issues

1. **Empty or Guide-Only Lines**
   ```
   Problem:
   root/
   │           <-- These lines are now skipped
   ├─ src/
   │
   └─ dist/    <-- Valid line
   ```
   Solution: Guide-only lines are automatically skipped. No action needed.

2. **Invalid Indentation**
   ```
   Problem:
   root/
     src/
         dist/   <-- Too much indentation
   ```
   Solution: Ensure each level increases by one indentation unit (default 2 spaces).

3. **Mixed Indentation**
   ```
   Problem:
   root/
   ⎵⎵src/      <-- Spaces
   ⇥dist/      <-- Tab
   ```
   Solution: Use consistent indentation (spaces or tabs) and set `tabIndentationSize`.

### Path Issues

1. **Duplicate Paths**
   ```
   Problem:
   root/
   ├─ src/
   │  └─ index.ts
   └─ src/      <-- Duplicate
      └─ main.ts
   ```
   Solution:
   - Use unique directory names
   - Configure `pathConflict.onDuplicatePath`
   - Use merge strategies for intentional duplicates

2. **Invalid Characters**
   ```
   Problem:
   root/
   ├─ src<1>/   <-- Invalid chars
   └─ test:2/   <-- Invalid chars
   ```
   Solution:
   - Use allowed characters (configure `allowedChars`)
   - Use `pathConflict.onInvalidChars` strategy
   - Consider transliteration for special characters

3. **Long Paths**
   ```
   Problem:
   very/deep/nested/structure/with/many/levels/and/long/names/file.ts
   ```
   Solution:
   - Reduce path depth
   - Use shorter names
   - Configure `maxPathLength` and `onLongPath` strategy

### Configuration Issues

1. **Conflicting Rules**
   ```typescript
   Problem:
   {
     pathValidation: {
       enforceCase: "lower",
       allowedChars: "^[A-Z]+$"  // Conflicts with lowercase requirement
     }
   }
   ```
   Solution: Ensure validation rules don't contradict each other.

2. **Invalid Merge Strategies**
   ```typescript
   Problem:
   {
     pathConflict: {
       onDuplicatePath: "merge",
       mergeStrategy: undefined  // Missing merge strategy
     }
   }
   ```
   Solution: Always provide merge strategies when using merge resolution.

3. **Incorrect Extensions**
   ```typescript
   Problem:
   {
     pathValidation: {
       allowedExtensions: ["ts"],  // Missing dot
       requireExtensions: true
     }
   }
   ```
   Solution: Use complete extensions with dots (e.g., [".ts", ".js"]).

### Performance Issues

1. **Deep Directory Structures**
   ```
   Problem:
   Extremely deep nesting causing slow validation
   ```
   Solution:
   - Set reasonable `maxDepth`
   - Use `pathValidation.resolveRelative = false`
   - Consider flatter structure

2. **Large Number of Files**
   ```
   Problem:
   Thousands of files causing slow path validation
   ```
   Solution:
   - Use `uniquePaths: false` if not needed
   - Disable unnecessary validations
   - Consider batch processing

3. **Complex Regex Patterns**
   ```typescript
   Problem:
   {
     pathValidation: {
       allowedChars: "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)[A-Za-z\\d]{8,}$"
     }
   }
   ```
   Solution: Use simpler patterns or split into multiple rules.

### Error Messages

1. **Understanding Validation Errors**
   ```
   Error: Invalid tree structure:
   Line 5: Path "src" is duplicated
   Line 10: Invalid characters in name
   ```
   - Line number indicates where the error occurred
   - Error message describes the specific issue
   - Context shows the problematic line

2. **Warning vs. Error**
   ```typescript
   {
     pathConflict: {
       onDuplicatePath: "warn"  // Warning instead of error
     }
   }
   ```
   - Warnings allow operation to continue
   - Errors stop processing
   - Configure severity per rule

3. **Debug Mode**
   ```typescript
   {
     logging: {
       level: "debug",
       includeMetadata: true
     }
   }
   ```
   - Shows detailed validation steps
   - Includes rule evaluations
   - Helps identify specific issues

## Best Practices

1. **Start Simple**
   ```typescript
   // Begin with basic validation
   const config: ForgeConfig = {
     pathValidation: {
       maxDepth: 5,
       allowedChars: "^[a-z0-9-]+$"
     }
   };
   ```

2. **Add Rules Gradually**
   ```typescript
   // Add more rules as needed
   config.pathValidation = {
     ...config.pathValidation,
     enforceCase: "lower",
     uniquePaths: true
   };
   ```

3. **Test Configuration**
   ```typescript
   // Test with sample structures
   const testTree = `
   root/
   ├─ src/
   └─ test/
   `;
   ```

4. **Monitor Performance**
   ```typescript
   // Enable performance logging
   config.logging = {
     level: "debug",
     includeDuration: true
   };
   ```

## Quick Fixes

1. **Duplicate Paths**
   ```typescript
   // Auto-rename duplicates
   pathConflict: {
     onDuplicatePath: "numbered",
     counterStart: 1
   }
   ```

2. **Invalid Characters**
   ```typescript
   // Replace invalid chars
   pathConflict: {
     onInvalidChars: "replace",
     replacementChar: "-"
   }
   ```

3. **Long Paths**
   ```typescript
   // Auto-shorten paths
   pathConflict: {
     onLongPath: "shorten",
     preserveExtension: true
   }
   ```

## Getting Help

1. Check error messages for line numbers and context
2. Enable debug logging for detailed information
3. Test configuration with smaller trees first
4. Use validation warnings instead of errors during setup
5. Consider using custom resolution functions for special cases

# Browser Configuration Guide

The `forge-tree` log viewer supports extensive browser configuration options to customize how logs and statistics are displayed.

## Browser Selection

### Supported Browsers

| Browser | Windows | macOS | Linux | Notes |
|---------|---------|-------|-------|-------|
| Chrome | ✓ | ✓ | ✓ | Default choice |
| Firefox | ✓ | ✓ | ✓ | Full support |
| Edge | ✓ | ✓ | ✓ | Windows preferred |
| Safari | - | ✓ | - | macOS only |
| Opera | ✓ | ✓ | ✓ | Full support |
| Brave | ✓ | ✓ | ✓ | Full support |
| Custom | ✓ | ✓ | ✓ | Any executable |

### Basic Usage

```bash
# Use Firefox
forge-tree --browser firefox my-project.tree
forge-tree -b firefox my-project.tree  # Short version

# Use system default
forge-tree --browser default my-project.tree

# Use custom browser
forge-tree --browser chromium-browser my-project.tree
```

## Browser Modes

### Incognito/Private Mode

Each browser has its own incognito flag:
- Chrome/Brave: `--incognito`
- Firefox: `-private`
- Edge: `-inprivate`

The tool automatically uses the correct flag:
```bash
# Open in incognito mode
forge-tree --browser firefox --incognito my-project.tree
forge-tree -b firefox -i my-project.tree  # Short version
```

### New Window Mode

```bash
# Always open in new window (default)
forge-tree --new-window my-project.tree
forge-tree -nw my-project.tree  # Short version

# Use existing window
forge-tree --no-new-window my-project.tree
```

## Browser Arguments

### Basic Arguments

```bash
# Single argument
forge-tree --browser-args="--kiosk" my-project.tree

# Multiple arguments
forge-tree --browser-args="--kiosk,--disable-gpu" my-project.tree
forge-tree -ba="--kiosk,--disable-gpu" my-project.tree  # Short version
```

### Common Arguments

Chrome/Edge:
```bash
# Kiosk mode
--browser-args="--kiosk"

# Disable GPU
--browser-args="--disable-gpu"

# Custom profile
--browser-args="--user-data-dir=/path/to/profile"

# App mode
--browser-args="--app=true"
```

Firefox:
```bash
# Private browsing
--browser-args="-private"

# Custom profile
--browser-args="-P,myprofile"

# Safe mode
--browser-args="-safe-mode"
```

## Process Control

### Wait Mode

```bash
# Wait for browser to close
forge-tree --wait-for-browser my-project.tree
forge-tree -wb my-project.tree  # Short version
```

This is useful in scripts:
```bash
# Generate and wait for review
forge-tree --wait-for-browser project.tree && echo "Review complete"
```

## Troubleshooting

### Common Issues

1. **Browser Not Found**
   ```bash
   # Check if browser is in PATH
   forge-tree --browser chromium my-project.tree
   Error: Failed to open in chromium
   ```
   Solution:
   - Use `--browser default` to fall back to system default
   - Add browser to PATH
   - Use full path: `--browser "/path/to/browser"`

2. **Arguments Not Working**
   ```bash
   # Arguments with spaces
   forge-tree --browser-args="--user-data-dir=My Profile"  # Wrong
   forge-tree --browser-args="--user-data-dir=My\ Profile" # Right
   ```

3. **Platform-Specific Issues**
   ```bash
   # Windows paths
   forge-tree --browser-args="--user-data-dir=C:\Profile" # Wrong
   forge-tree --browser-args="--user-data-dir=C:\\Profile" # Right
   ```

### Debug Mode

Enable verbose logging:
```bash
# Show browser launch details
forge-tree --log-level verbose my-project.tree

# Log to file
forge-tree --log-level debug --log-file browser.log my-project.tree
```

## Configuration File

You can set default browser preferences in your configuration:

```json
{
  "viewer": {
    "browser": "firefox",
    "browserArgs": ["--kiosk", "--disable-gpu"],
    "incognito": true,
    "newWindow": true,
    "waitForBrowser": false
  }
}
```

## Best Practices

1. **Browser Selection**
   - Use Chrome/Firefox for best compatibility
   - Use `default` for system integration
   - Test custom browsers thoroughly

2. **Arguments**
   - Keep arguments minimal for reliability
   - Use platform-agnostic arguments when possible
   - Document custom arguments in your project

3. **Process Management**
   - Use `--wait-for-browser` in scripts
   - Consider `--no-viewer` for CI/CD
   - Handle browser exit codes appropriately

4. **Security**
   - Use `--incognito` for sensitive logs
   - Avoid storing credentials in arguments
   - Consider browser sandbox settings

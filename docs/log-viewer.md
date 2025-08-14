# Forge Tree Log Viewer

The Log Viewer is a powerful web-based tool for visualizing and analyzing logs and statistics from Forge Tree operations. It provides real-time monitoring, interactive visualizations, and detailed insights into your project generation process.

## Features

### 1. Real-Time Log Monitoring

- **Live Tailing**: Watch logs in real-time as they are generated
- **In-Memory Storage**: Logs are stored in memory and browser cache for fast access
- **Automatic Updates**: Visualizations update automatically when new logs arrive
- **Status Indicator**: Clear visual feedback when tailing is active

### 2. Log Entry Management

- **Collapsible Entries**: Each log entry can be expanded/collapsed for better overview
- **Metadata Display**: JSON metadata is pretty-printed and collapsible
- **Path Highlighting**: File paths are highlighted for better visibility
- **Duration Display**: Operation durations are clearly displayed
- **Timestamp Formatting**: Clean timestamp display without duplication

### 3. Filtering and Search

- **Level Filtering**: Toggle between different log levels (ERROR, WARN, INFO, DEBUG)
- **Full-Text Search**: Search through all log entries in real-time
- **Combined Filters**: Use both level filters and search simultaneously
- **Visual Feedback**: Active filters are clearly indicated

### 4. Statistics and Visualizations

#### Timeline Chart
- Shows operation durations over time
- Interactive tooltips with detailed information
- Smooth animations and transitions
- Automatic scaling and axis labels

#### Treemap Chart
- Visual representation of operation distribution
- Size represents operation frequency
- Color-coded by operation type
- Shows percentages and counts
- Interactive tooltips with detailed statistics
- Auto-updates during tailing
- Sorts operations by frequency

#### File System Statistics
- Directory operations (created, skipped, failed)
- File operations (created, modified, skipped, failed)
- Initializer operations (total, successful, failed, skipped)
- Success rates and totals
- Real-time updates

### 5. Configuration Display

- **Core Settings**: Target directory, tab size, ASCII guides, etc.
- **Logging Settings**: Format, levels, output options
- **Feature Flags**: Active features and their states
- **Git Settings**: Git and GitHub related configurations
- **Collapsible Sections**: Each settings group can be collapsed

### 6. Export Options

- **PDF Export**: Generate PDF reports with all log entries and statistics
- **CSV Export**: Export logs in CSV format for spreadsheet analysis
- **JSON Export**: Export raw log data in JSON format
- **Progress Indicators**: Visual feedback during export operations

### 7. UI/UX Features

- **Dark/Light Mode**: Toggle between dark and light themes
- **Responsive Design**: Works on all screen sizes
- **Custom Scrollbars**: Improved scrolling experience
- **Collapsible Sections**: All major sections can be collapsed
- **Visual Feedback**: Hover effects and transitions
- **Error Handling**: Graceful error displays and fallbacks

## Usage

### Starting the Log Viewer

The log viewer automatically opens when running Forge Tree commands with logging enabled. You can also manually open log files:

1. Click "Choose File" in the Log File section
2. Optionally load a stats file for additional insights
3. Use the toolbar to filter and search through logs

### Real-Time Monitoring

1. Click "Start Tailing" to begin monitoring
2. The viewer will automatically:
   - Switch to the treemap visualization
   - Expand the statistics section
   - Show a tailing indicator
3. New logs will appear automatically
4. Click "Stop Tailing" to pause monitoring

### Filtering and Searching

1. Use the level buttons (ERROR, WARN, INFO, DEBUG) to filter by log level
2. Enter text in the search box to filter by content
3. Combine both filters for precise results

### Exporting Data

1. Choose your export format (PDF, CSV, JSON)
2. Wait for the export to complete
3. The file will automatically download

### Customizing the View

1. Toggle dark/light mode using the theme button
2. Collapse/expand sections by clicking headers
3. Collapse/expand individual log entries by clicking them
4. Use the visualization tabs to switch between different views

## Technical Details

### Data Storage

- Logs are stored in memory for fast access
- Browser localStorage is used for persistence
- No server dependency for basic functionality
- Automatic data parsing and formatting

### Performance Optimizations

- Efficient log parsing and filtering
- Lazy loading of visualizations
- Throttled updates during tailing
- Memory-efficient data structures

### Browser Support

- Works in all modern browsers
- Requires JavaScript enabled
- Uses standard web technologies
- No external dependencies needed

## Best Practices

1. **Memory Management**:
   - Clear old logs periodically
   - Use filters to focus on relevant data
   - Export important logs for permanent storage

2. **Real-Time Monitoring**:
   - Use tailing for active operations
   - Switch visualizations as needed
   - Monitor success rates and errors

3. **Troubleshooting**:
   - Use search to find specific issues
   - Check operation metadata for details
   - Export logs for sharing/analysis

4. **Customization**:
   - Adjust theme for your environment
   - Collapse unused sections
   - Configure view based on needs
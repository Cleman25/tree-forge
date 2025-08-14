import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

interface ScanNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: ScanNode[];
  isPlaceholder?: boolean;
  placeholderReason?: string;
}

const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.cache'
];

const LARGE_FILE_EXTENSIONS = [
  '.map',    // Source maps
  '.lock',   // Lock files
  '.min.js', // Minified files
  '.min.css' // Minified files
];

const SIZE_LIMIT = 1024 * 1024; // 1MB

export function scanDirectory(dir: string): ScanNode {
  const name = path.basename(dir);
  const stats = fs.statSync(dir);
  
  // For excluded directories, return a placeholder
  if (stats.isDirectory() && EXCLUDED_DIRS.includes(name)) {
    return { 
      name, 
      path: dir, 
      isDirectory: true, 
      children: [],
      isPlaceholder: true,
      placeholderReason: 'contents omitted'
    };
  }

  if (!stats.isDirectory()) {
    // Skip large files or files with excluded extensions
    if (stats.size > SIZE_LIMIT || LARGE_FILE_EXTENSIONS.some(ext => name.endsWith(ext))) {
      return { 
        name, 
        path: dir, 
        isDirectory: false, 
        children: [],
        isPlaceholder: true,
        placeholderReason: 'large file'
      };
    }
    return { name, path: dir, isDirectory: false, children: [] };
  }

  const children = fs.readdirSync(dir)
    .map(item => {
      const itemPath = path.join(dir, item);
      return scanDirectory(itemPath);
    })
    .sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return { name, path: dir, isDirectory: true, children };
}

interface TreeStyle {
  vertical: string;
  horizontal: string;
  corner: string;
  branch: string;
  indent: string;
}

const DEFAULT_STYLE: TreeStyle = {
  vertical: '│',
  horizontal: '─',
  corner: '└',
  branch: '├',
  indent: '  '
};

const SIMPLE_STYLE: TreeStyle = {
  vertical: '|',
  horizontal: '-',
  corner: 'L',
  branch: '+',
  indent: '  '
};

function detectTreeStyle(treeText: string | undefined): TreeStyle {
  if (!treeText) return DEFAULT_STYLE;

  // Check if the tree uses simple ASCII characters
  const usesSimple = treeText.includes('|-') || treeText.includes('|  ') || treeText.includes('L-') || treeText.includes('+-');
  return usesSimple ? SIMPLE_STYLE : DEFAULT_STYLE;
}

export function formatTree(
  node: ScanNode, 
  style: TreeStyle = DEFAULT_STYLE,
  prefix = '', 
  isLast = true, 
  isRoot = true
): string {
  const lines: string[] = [];
  
  if (!isRoot) {
    const marker = isLast 
      ? style.corner + style.horizontal + ' '
      : style.branch + style.horizontal + ' ';
    
    let displayText = node.name;
    if (node.isPlaceholder) {
      displayText += chalk.dim(` # ${node.placeholderReason}`);
    }
    
    const color = node.isDirectory ? chalk.blue : chalk.white;
    lines.push(prefix + marker + color(displayText));
  }

  const childPrefix = prefix + (isRoot ? '' : (isLast ? style.indent : style.vertical + style.indent));
  
  node.children.forEach((child, index) => {
    const isLastChild = index === node.children.length - 1;
    lines.push(formatTree(child, style, childPrefix, isLastChild, false));
  });

  return lines.join('\n');
}

function parseExpectedTree(treeText: string): Set<string> {
  return new Set(
    treeText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove tree characters and get path
        const cleanLine = line.replace(/[│├└─]/g, '').trim();
        return cleanLine;
      })
  );
}

export function displayGeneratedStructure(targetDir: string, treeText?: string): void {
  if (!treeText) {
    console.log(chalk.blue('\n📂 Generated Structure:'));
    console.log(chalk.dim('─'.repeat(40)));
    try {
      const tree = scanDirectory(targetDir);
      console.log(formatTree(tree, DEFAULT_STYLE));
      console.log(chalk.dim('─'.repeat(40)));
    } catch (error) {
      console.error(chalk.red('Error scanning generated structure:'), error);
    }
    return;
  }

  console.log(chalk.blue('\n📊 Structure Comparison:'));
  console.log(chalk.dim('─'.repeat(40)));
  
  try {
    const tree = scanDirectory(targetDir);
    const style = detectTreeStyle(treeText);
    
    // Get all paths from actual structure
    const actualPaths = new Set<string>();
    function collectPaths(node: ScanNode, parentPath = '') {
      const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
      actualPaths.add(fullPath);
      node.children.forEach(child => collectPaths(child, fullPath));
    }
    collectPaths(tree);

    // Get expected paths
    const expectedPaths = parseExpectedTree(treeText);

    // Find missing and extra paths
    const missingPaths = Array.from(expectedPaths).filter(p => !actualPaths.has(p));
    const extraPaths = Array.from(actualPaths).filter(p => !expectedPaths.has(p));

    // Display current structure
    console.log(chalk.blue('Current Structure:'));
    console.log(formatTree(tree, style));
    
    // Show missing paths if any
    if (missingPaths.length > 0) {
      console.log(chalk.yellow('\nMissing Items:'));
      missingPaths
        .sort()
        .forEach(path => console.log(chalk.yellow(`  • ${path}`)));
    }

    // Show extra paths if any
    if (extraPaths.length > 0) {
      console.log(chalk.cyan('\nAdditional Items:'));
      extraPaths
        .sort()
        .forEach(path => console.log(chalk.cyan(`  • ${path}`)));
    }

    // Show completion percentage
    const expectedCount = expectedPaths.size;
    const actualCount = actualPaths.size;
    const completedCount = Array.from(expectedPaths).filter(p => actualPaths.has(p)).length;
    const percentage = (completedCount / expectedCount) * 100;

    console.log(chalk.dim('\nCompletion Status:'));
    console.log(chalk.dim(`  • Expected Items: ${expectedCount}`));
    console.log(chalk.dim(`  • Generated Items: ${actualCount}`));
    console.log(chalk[percentage === 100 ? 'green' : 'yellow'](`  • Completion: ${percentage.toFixed(1)}%`));
    
    console.log(chalk.dim('─'.repeat(40)));
  } catch (error) {
    console.error(chalk.red('Error scanning generated structure:'), error);
  }
}

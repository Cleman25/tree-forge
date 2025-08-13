# Forge Tree

[![npm](https://img.shields.io/npm/v/forge-tree.svg)](https://www.npmjs.com/package/forge-tree)
[![npm downloads](https://img.shields.io/npm/dm/forge-tree.svg)](https://www.npmjs.com/package/forge-tree)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Interactive CLI to scaffold projects from an **ASCII directory tree**. It parses hierarchies, generates files/folders, creates dotfiles/formatters, and can smart-run tools like `create-next-app`, `firebase init`, or `npm init` where appropriate.

## Quick Start
```bash
# one-off
npx forge-tree --help

# or install globally
npm i -g forge-tree
forge-tree --help
```

## Install

```bash
npm i -g forge-tree
# or
pnpm add -g forge-tree
```


### Git + GitHub (optional)

```bash
# git only
forge-tree ./app --tree "root/\n  a.txt" --git

# git + create GitHub repo (using gh if available), private, push
forge-tree ./app --tree "root/\n  a.txt" --git --github my-repo --private

# set branch and skip push
forge-tree ./app --tree "root/\n  a.txt" --git --github --branch develop --no-push
```


## Examples
```bash
# Create a simple folder structure
forge-tree ./my-app --tree "root/\n  index.js\n  package.json"

# Generate with nested folders and dotfiles
forge-tree ./project --tree "src/\n  index.ts\n  utils/\n    helpers.ts\n.editorconfig"

# Scaffold a Next.js app with extra files
forge-tree ./next-app --tree "root/\n  README.md" --run create-next-app

# Git + GitHub repo creation
forge-tree ./app --tree "root/\n  a.txt" --git --github my-repo --private

# Set branch and skip push
forge-tree ./app --tree "root/\n  a.txt" --git --github --branch develop --no-push
```

## CLI Flags
| Flag / Option      | Description                                                                                  | Default |
| ------------------ | -------------------------------------------------------------------------------------------- | ------- |
| `--tree "<ascii>"` | ASCII tree string defining the folder/file structure.                                        | None    |
| `--git`            | Initialize a Git repository.                                                                 | false   |
| `--github [name]`  | Create a GitHub repository (requires `gh` CLI). Optional repo name; defaults to folder name. | None    |
| `--private`        | When using `--github`, make the repo private.                                                | false   |
| `--branch <name>`  | Set initial Git branch name.                                                                 | main    |
| `--no-push`        | Skip pushing changes to remote after Git init.                                               | false   |
| `--run <command>`  | Run a command in the project root after creation (e.g., `create-next-app`).                  | None    |
| `--yes` / `-y`     | Skip all prompts and use defaults.                                                           | false   |
| `--help`           | Show help text.                                                                              | —       |
| `--version`        | Show CLI version.                                                                            | —       |


## License
This project is licensed under the MIT License.
See the [LICENSE](https://github.com/Cleman25/tree-forge/blob/main/LICENSE) file for details.
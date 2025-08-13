# forge-tree

Interactive CLI to scaffold projects from an **ASCII directory tree**. It parses hierarchies, generates files/folders, creates dotfiles/formatters, and can smart-run tools like `create-next-app`, `firebase init`, or `npm init` where appropriate.

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

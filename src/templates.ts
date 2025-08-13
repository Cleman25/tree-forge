export const gitignore = `node_modules
dist
.turbo
.next
coverage
*.log
.env*
pnpm-lock.yaml
yarn.lock
package-lock.json
.DS_Store
`;

export const prettierrc = JSON.stringify(
  {
    semi: true,
    singleQuote: false,
    printWidth: 100
  },
  null,
  2
) + "\n";

export const editorconfig = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
`;

export const turbo = JSON.stringify(
  {
    $schema: "https://turbo.build/schema.json",
    pipeline: {
      build: { dependsOn: ["^build"], outputs: ["dist/**", ".next/**"] },
      dev: { cache: false, persistent: true },
      lint: {},
      test: {}
    }
  },
  null,
  2
) + "\n";

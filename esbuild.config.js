// eslint-disable-next-line @typescript-eslint/no-var-requires
const { build } = require("esbuild")

build({
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js",
  external: ["vscode"],
  platform: "node",
  sourcemap: "linked",
  minify: true,
  bundle: true,
}).catch((error) => {
  console.error(error)
  process.exit(1)
})

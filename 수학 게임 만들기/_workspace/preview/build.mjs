import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["C:/Users/vamos/Desktop/코딩/수학 게임 만들기/_workspace/preview/entry.jsx"],
  bundle: true,
  format: "iife",
  outfile: "C:/Users/vamos/Desktop/코딩/수학 게임 만들기/_workspace/preview/bundle.js",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  nodePaths: ["C:/Users/vamos/Desktop/코딩/수학 게임 만들기/_workspace/preview/node_modules"],
  logLevel: "info",
});
console.log("BUILD OK");

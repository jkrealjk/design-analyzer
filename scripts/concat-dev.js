const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const files = [
  "src/core/namespace.js",
  "src/core/validation.js",
  "src/dom/helpers.js",
  "src/core/context.js",
  "src/core/output-validation.js",
  "src/core/runtime-checks.js",
  "src/roles/infer-role.js",
  "src/collect/text.js",
  "src/collect/selected-element.js",
  "src/collect/child-tree.js",
  "src/collect/typography.js",
  "src/collect/raw-details.js",
  "src/markdown/render-report.js",
  "src/analyzer.js",
  "src/index.js",
];

const chunks = files.map((file) => {
  const absolutePath = path.join(rootDir, file);
  return ["// ---- " + file + " ----", fs.readFileSync(absolutePath, "utf8")].join("\n");
});

const output = [
  "(function () {",
  '"use strict";',
  chunks.join("\n\n"),
  "})();",
  "",
].join("\n");

fs.writeFileSync(path.join(rootDir, "dist/analyzer.dev.js"), output);
console.log("Built dist/analyzer.dev.js");

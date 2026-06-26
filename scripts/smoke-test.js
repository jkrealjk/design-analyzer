const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const fixturePath = path.join(rootDir, "fixtures/manual/header-basic.html");
const analyzerPath = path.join(rootDir, "dist/analyzer.dev.js");

const REQUIRED_SECTIONS = [
  "## Selected Element",
  "## Child Elements — Annotated Structure",
  "## Typography",
  "<details><summary>Raw Details</summary>",
];

const REMOVED_PLACEHOLDERS = [
  "Child analysis is not implemented yet.",
  "Typography collection is not implemented yet.",
  "Minimum Raw Details placeholder.",
];

const VISIBLE_LABELS = [
  "Acme",
  "Product",
  "Resources",
  "Customers",
  "Pricing",
  "Log in",
  "Sign up",
];

const HIDDEN_LABELS = [
  "Hidden Mobile Menu",
  "Invisible Tracking Text",
  "Template Hidden Text",
  "Script Hidden Text",
  "Style Hidden Text",
];

const RAW_DETAIL_GROUPS = [
  "Raw Rect",
  "Layout:",
  "Visual:",
  "Typography:",
  "Spacing:",
  "Children:",
];

const CHILD_TREE_INCLUDES = [
  "```text",
  "Logo Link (a)",
  "Navigation (nav)",
  "List (ul)",
  "Link (a)",
  "Action Group (div)",
  "Product",
  "Resources",
  "Log in",
  "Sign up",
];

const QUALITY_INCLUDES = [
  "| Element | `Header (header)` |",
  "| Selector | `header#fixture-header` |",
  "| Text | `Acme · Product · Resources · Customers · Pricing · Log in · Sign up` |",
  "### Summary",
  "### Text Details",
  "selector: span.fixture-logo-text",
  "selector: a.fixture-button",
  "#### Identity",
  "| Source Path | `header#fixture-header` |",
];

const QUALITY_EXCLUDES = [
  "AcmeProductResourcesCustomersPricing",
  "Action Group (span)",
  "span.fixture-buttonItem.fixture-buttonItem",
  " / selector: `header#fixture-header >",
  " / selector: `body >",
];

const CLASS_STYLES = {
  "fixture-header": {
    display: "block",
    width: "100%",
    minHeight: "96px",
    paddingTop: "24px",
    paddingRight: "32px",
    paddingBottom: "24px",
    paddingLeft: "32px",
    borderBottomWidth: "1px",
    backgroundColor: "rgb(255, 255, 255)",
    color: "rgb(17, 24, 39)",
    fontFamily: "Inter, Arial, sans-serif",
  },
  "fixture-header__container": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "960px",
    minHeight: "48px",
    marginTop: "0px",
    marginRight: "auto",
    marginBottom: "0px",
    marginLeft: "auto",
    paddingTop: "0px",
    paddingRight: "20px",
    paddingBottom: "0px",
    paddingLeft: "20px",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    borderBottomRightRadius: "12px",
    borderBottomLeftRadius: "12px",
    gap: "28px",
    rowGap: "28px",
    columnGap: "28px",
    backgroundColor: "rgb(248, 250, 252)",
  },
  "fixture-logo": {
    display: "inline-flex",
    width: "96px",
    height: "40px",
    gap: "8px",
    color: "rgb(15, 23, 42)",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "24px",
    letterSpacing: "0px",
  },
  "fixture-logo-mark": {
    display: "inline-flex",
    width: "28px",
    height: "28px",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    borderBottomRightRadius: "8px",
    borderBottomLeftRadius: "8px",
    color: "rgb(255, 255, 255)",
    backgroundColor: "rgb(15, 23, 42)",
    fontSize: "16px",
    lineHeight: "20px",
  },
  "fixture-logo-text": {
    display: "inline-block",
    color: "rgb(15, 23, 42)",
  },
  "fixture-actions": {
    display: "flex",
    gap: "12px",
    rowGap: "12px",
    columnGap: "12px",
  },
  "fixture-button": {
    display: "inline-flex",
    width: "92px",
    height: "38px",
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    borderBottomRightRadius: "8px",
    borderBottomLeftRadius: "8px",
    color: "rgb(15, 23, 42)",
    backgroundColor: "rgb(255, 255, 255)",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: "18px",
    letterSpacing: "0px",
  },
  "fixture-button--primary": {
    width: "96px",
    color: "rgb(255, 255, 255)",
    backgroundColor: "rgb(37, 99, 235)",
  },
  "fixture-nav": {
    display: "block",
  },
  "fixture-guard-text": {
    display: "inline-block",
    width: "120px",
    height: "1px",
    overflow: "hidden",
    color: "rgb(71, 85, 105)",
    fontSize: "12px",
    lineHeight: "16px",
  },
  "fixture-hidden": {
    display: "none",
  },
  "fixture-invisible": {
    opacity: "0",
  },
};

const TAG_STYLES = {
  a: {
    display: "inline",
    color: "rgb(51, 65, 85)",
    fontSize: "15px",
    fontWeight: "500",
    lineHeight: "20px",
    letterSpacing: "0px",
  },
  body: {
    display: "block",
    marginTop: "0px",
    marginRight: "0px",
    marginBottom: "0px",
    marginLeft: "0px",
    backgroundColor: "rgb(244, 247, 251)",
    color: "rgb(17, 24, 39)",
    fontFamily: "Inter, Arial, sans-serif",
  },
  div: {
    display: "block",
  },
  header: {
    display: "block",
  },
  li: {
    display: "list-item",
  },
  nav: {
    display: "block",
  },
  script: {
    display: "none",
  },
  span: {
    display: "inline",
  },
  style: {
    display: "none",
  },
  template: {
    display: "none",
  },
  ul: {
    display: "flex",
    gap: "24px",
    rowGap: "24px",
    columnGap: "24px",
  },
};

const DEFAULT_STYLE = {
  display: "block",
  visibility: "visible",
  opacity: "1",
  position: "static",
  boxSizing: "border-box",
  overflow: "visible",
  zIndex: "auto",
  backgroundColor: "rgba(0, 0, 0, 0)",
  color: "rgb(17, 24, 39)",
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: "16px",
  lineHeight: "normal",
  fontWeight: "400",
  letterSpacing: "normal",
  paddingTop: "0px",
  paddingRight: "0px",
  paddingBottom: "0px",
  paddingLeft: "0px",
  marginTop: "0px",
  marginRight: "0px",
  marginBottom: "0px",
  marginLeft: "0px",
  borderTopWidth: "0px",
  borderRightWidth: "0px",
  borderBottomWidth: "0px",
  borderLeftWidth: "0px",
  borderTopLeftRadius: "0px",
  borderTopRightRadius: "0px",
  borderBottomRightRadius: "0px",
  borderBottomLeftRadius: "0px",
  gap: "0px",
  rowGap: "0px",
  columnGap: "0px",
};

class FakeText {
  constructor(value) {
    this.nodeType = 3;
    this.nodeValue = value;
  }
}

class FakeElement {
  constructor(tagName, attributes, ownerDocument) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attributes = attributes || {};
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
    this.children = [];
    this.childNodes = [];
    this.id = this.attributes.id || "";
    this.className = this.attributes.class || "";
    this.hidden = Object.prototype.hasOwnProperty.call(this.attributes, "hidden");
  }

  appendChild(node) {
    if (node && node.nodeType === 1) {
      node.parentElement = this;
      this.children.push(node);
    }

    this.childNodes.push(node);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name);
  }

  querySelectorAll() {
    return [];
  }

  get textContent() {
    return this.childNodes.map((node) => {
      if (!node) {
        return "";
      }

      if (node.nodeType === 3) {
        return node.nodeValue;
      }

      if (node.nodeType === 1) {
        return node.textContent;
      }

      return "";
    }).join("");
  }

  getBoundingClientRect() {
    const style = this.ownerDocument.defaultView.getComputedStyle(this);

    if (style.display === "none" || style.opacity === "0") {
      return createRect(0, 0);
    }

    const width = parsePixelValue(style.width) || inferWidth(this);
    const height = parsePixelValue(style.height) || parsePixelValue(style.minHeight) || inferHeight(this);

    return createRect(width, height);
  }
}

class FakeDocument {
  constructor() {
    this.defaultView = null;
    this.documentElement = new FakeElement("html", {}, this);
    this.body = new FakeElement("body", {}, this);
    this.documentElement.appendChild(this.body);
  }

  getElementById(id) {
    return findElement(this.documentElement, (el) => el.id === id);
  }
}

function createRect(width, height) {
  return {
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
  };
}

function parsePixelValue(value) {
  const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/);

  return match ? Number(match[1]) : 0;
}

function inferWidth(el) {
  const tagName = el.tagName.toLowerCase();

  if (tagName === "header") {
    return 1024;
  }

  if (tagName === "nav") {
    return 380;
  }

  if (tagName === "ul") {
    return 360;
  }

  if (tagName === "li") {
    return 90;
  }

  if (tagName === "span") {
    return 40;
  }

  return 80;
}

function inferHeight(el) {
  const tagName = el.tagName.toLowerCase();

  if (tagName === "header") {
    return 96;
  }

  if (tagName === "ul" || tagName === "nav") {
    return 40;
  }

  return 24;
}

function findElement(root, predicate) {
  if (predicate(root)) {
    return root;
  }

  for (const child of root.children) {
    const match = findElement(child, predicate);

    if (match) {
      return match;
    }
  }

  return null;
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*"([^"]*)")?/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    attributes[match[1]] = typeof match[2] === "string" ? match[2] : "";
  }

  return attributes;
}

function parseFixture(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const document = new FakeDocument();
  const stack = [document.body];
  const tokenPattern = /<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g;
  let tokenMatch;

  while ((tokenMatch = tokenPattern.exec(bodyHtml)) !== null) {
    const token = tokenMatch[0];

    if (!token || token.startsWith("<!--")) {
      continue;
    }

    if (token.startsWith("</")) {
      stack.pop();
      continue;
    }

    if (token.startsWith("<")) {
      const openMatch = token.match(/^<\s*([a-zA-Z0-9-]+)([^>]*)>/);

      if (!openMatch) {
        continue;
      }

      const element = new FakeElement(openMatch[1], parseAttributes(openMatch[2] || ""), document);
      stack[stack.length - 1].appendChild(element);

      if (!token.endsWith("/>")) {
        stack.push(element);
      }

      continue;
    }

    if (token.trim()) {
      stack[stack.length - 1].appendChild(new FakeText(token));
    }
  }

  return document;
}

function getComputedStyle(el) {
  const tagName = el.tagName.toLowerCase();
  const classNames = el.className ? el.className.split(/\s+/).filter(Boolean) : [];
  const style = Object.assign({}, DEFAULT_STYLE, TAG_STYLES[tagName] || {});

  for (const className of classNames) {
    Object.assign(style, CLASS_STYLES[className] || {});
  }

  if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden")) {
    style.display = "none";
  }

  return style;
}

function createHarness(html) {
  const document = parseFixture(html);
  const window = {
    document,
    console,
    CSS: {
      escape(value) {
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
      },
    },
    getComputedStyle,
  };

  document.defaultView = window;
  window.window = window;
  window.globalThis = window;

  return window;
}

function loadAnalyzer(window) {
  const source = fs.readFileSync(analyzerPath, "utf8");
  const context = vm.createContext(window);

  vm.runInContext(source, context, {
    filename: analyzerPath,
  });

  return context;
}

function checkIncludes(name, output, expectedValues) {
  const missing = expectedValues.filter((value) => !output.includes(value));

  if (missing.length > 0) {
    return {
      name,
      ok: false,
      detail: "Missing: " + missing.join(", "),
    };
  }

  return {
    name,
    ok: true,
  };
}

function checkExcludes(name, output, forbiddenValues) {
  const present = forbiddenValues.filter((value) => output.includes(value));

  if (present.length > 0) {
    return {
      name,
      ok: false,
      detail: "Unexpected: " + present.join(", "),
    };
  }

  return {
    name,
    ok: true,
  };
}

function getChildTreeSection(output) {
  const match = output.match(/## Child Elements — Annotated Structure\n\n([\s\S]*?)\n\n## Typography/);

  return match ? match[1] : "";
}

function checkChildTreeReadability(output) {
  const tree = getChildTreeSection(output);
  const meaningfulRoles = ["Logo Link", "Navigation", "List", "Link", "Action Group"];
  const missing = CHILD_TREE_INCLUDES.filter((value) => !tree.includes(value));
  const hasMeaningfulRole = meaningfulRoles.some((role) => tree.includes(role));
  const onlyElementWrappers = tree.includes("Element (div)") && !hasMeaningfulRole;

  if (missing.length > 0 || onlyElementWrappers) {
    return {
      name: "Child tree readability",
      ok: false,
      detail: missing.length > 0
        ? "Missing: " + missing.join(", ")
        : "Child tree collapsed into Element div wrappers.",
    };
  }

  return {
    name: "Child tree readability",
    ok: true,
  };
}

function runSmokeTest() {
  const fixtureHtml = fs.readFileSync(fixturePath, "utf8");
  const window = createHarness(fixtureHtml);
  const context = loadAnalyzer(window);
  const root = context.document.getElementById("fixture-header");
  const results = [];
  let output = "";

  results.push({
    name: "Public API exists",
    ok: Boolean(
      context.DA &&
        typeof context.DA.analyzeSelectedElementReadable === "function" &&
        typeof context.analyzeSelectedElementReadable === "function"
    ),
  });

  if (results[0].ok) {
    output = context.analyzeSelectedElementReadable(root, {
      hasExplicitRoot: true,
    });
  }

  results.push({
    name: "Analyzer returns a string",
    ok: typeof output === "string",
    detail: typeof output === "string" ? "" : "Returned: " + typeof output,
  });
  results.push(checkIncludes("Required sections exist", output, REQUIRED_SECTIONS));
  results.push(checkExcludes("Placeholders removed", output, REMOVED_PLACEHOLDERS));
  results.push(checkIncludes("Visible fixture labels included", output, VISIBLE_LABELS));
  results.push(checkExcludes("Hidden fixture labels excluded", output, HIDDEN_LABELS));
  results.push(checkChildTreeReadability(output));
  results.push(checkIncludes("Raw Details groups exist", output, RAW_DETAIL_GROUPS));
  results.push(checkIncludes("Quality readable text and selectors", output, QUALITY_INCLUDES));
  results.push(checkExcludes("Quality avoids glued text and long typography selectors", output, QUALITY_EXCLUDES));

  return results;
}

function printResults(results) {
  let passed = true;

  console.log("DevTools Design Analyzer smoke test");
  console.log("");

  for (const result of results) {
    if (result.ok) {
      console.log("PASS " + result.name);
      continue;
    }

    passed = false;
    console.log("FAIL " + result.name);

    if (result.detail) {
      console.log(result.detail);
    }
  }

  console.log("");

  if (passed) {
    console.log("Smoke test passed.");
    return 0;
  }

  console.log("Smoke test failed.");
  return 1;
}

try {
  process.exitCode = printResults(runSmokeTest());
} catch (error) {
  console.log("DevTools Design Analyzer smoke test");
  console.log("");
  console.log("FAIL Smoke test runtime");
  console.log(error && error.stack ? error.stack : String(error));
  console.log("");
  console.log("Smoke test failed.");
  process.exitCode = 1;
}

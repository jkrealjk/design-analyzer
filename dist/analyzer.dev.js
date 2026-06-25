(function () {
"use strict";
// ---- src/core/namespace.js ----
(function initNamespace(global) {
  "use strict";

  if (!global) {
    return;
  }

  var DA = global.DA || {};

  DA.core = DA.core || {};
  DA.dom = DA.dom || {};
  DA.collect = DA.collect || {};
  DA.roles = DA.roles || {};
  DA.formatters = DA.formatters || {};
  DA.markdown = DA.markdown || {};

  global.DA = DA;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/core/validation.js ----
(function initValidation(global) {
  "use strict";

  var DA = global.DA;
  var INVALID_ROOT_MESSAGE =
    "DevTools Design Analyzer: valid root element is required. Select an element in DevTools or pass a DOM Element.";

  function resolveRoot(root, options) {
    var hasExplicitRoot = Boolean(options && options.hasExplicitRoot);

    if (hasExplicitRoot) {
      return root;
    }

    return typeof global.$0 !== "undefined" ? global.$0 : null;
  }

  function isElement(value) {
    return Boolean(
      value &&
        value.nodeType === 1 &&
        value.ownerDocument &&
        typeof value.querySelectorAll === "function"
    );
  }

  function validateRoot(root) {
    if (!isElement(root)) {
      throw new Error(INVALID_ROOT_MESSAGE);
    }

    return root;
  }

  DA.core.INVALID_ROOT_MESSAGE = INVALID_ROOT_MESSAGE;
  DA.core.resolveRoot = resolveRoot;
  DA.core.validateRoot = validateRoot;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/dom/helpers.js ----
(function initDomHelpers(global) {
  "use strict";

  var DA = global.DA;

  function ensureDomRegistry() {
    if (!DA.dom || (typeof Object.isExtensible === "function" && !Object.isExtensible(DA.dom))) {
      DA.dom = {};
    }

    return DA.dom;
  }

  function getElementCache(context, name) {
    return context && context.cache && context.cache.elements
      ? context.cache.elements[name]
      : null;
  }

  function isElementLike(value) {
    return Boolean(
      value &&
        value.nodeType === 1 &&
        value.ownerDocument &&
        typeof value.querySelectorAll === "function"
    );
  }

  function getStyle(el, context) {
    var cache = getElementCache(context, "style");
    var view;
    var style;

    if (!isElementLike(el)) {
      return null;
    }

    if (cache && cache.has(el)) {
      return cache.get(el);
    }

    view = el.ownerDocument && el.ownerDocument.defaultView;
    style = view && typeof view.getComputedStyle === "function"
      ? view.getComputedStyle(el)
      : null;

    if (cache) {
      cache.set(el, style);
    }

    return style;
  }

  function getRect(el, context) {
    var cache = getElementCache(context, "rect");
    var rect;

    if (!isElementLike(el)) {
      return null;
    }

    if (cache && cache.has(el)) {
      return cache.get(el);
    }

    rect = typeof el.getBoundingClientRect === "function"
      ? el.getBoundingClientRect()
      : null;

    if (cache) {
      cache.set(el, rect);
    }

    return rect;
  }

  function hasHiddenAttribute(el) {
    return Boolean(
      el &&
        (el.hidden ||
          el.getAttribute("hidden") !== null ||
          el.getAttribute("aria-hidden") === "true" ||
          el.hasAttribute("inert"))
    );
  }

  function isVisible(el, context) {
    var cache = getElementCache(context, "visibility");
    var style;
    var rect;
    var visible;

    if (!isElementLike(el)) {
      return false;
    }

    if (cache && cache.has(el)) {
      return cache.get(el);
    }

    style = getStyle(el, context);
    rect = getRect(el, context);
    visible = !hasHiddenAttribute(el);

    if (style) {
      visible = visible &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.visibility !== "collapse" &&
        style.opacity !== "0";
    }

    if (rect) {
      visible = visible && (rect.width > 0 || rect.height > 0);
    }

    if (cache) {
      cache.set(el, visible);
    }

    return visible;
  }

  function escapeSelectorPart(value) {
    if (global.CSS && typeof global.CSS.escape === "function") {
      return global.CSS.escape(value);
    }

    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function getElementSelectorPart(el) {
    var part = el.tagName ? el.tagName.toLowerCase() : "element";
    var className;
    var classParts;
    var index;

    if (el.id) {
      return part + "#" + escapeSelectorPart(el.id);
    }

    className = typeof el.className === "string" ? el.className.trim() : "";

    if (className) {
      classParts = className.split(/\s+/).slice(0, 3);

      for (index = 0; index < classParts.length; index += 1) {
        part += "." + escapeSelectorPart(classParts[index]);
      }
    }

    return part;
  }

  function getSelector(el, context) {
    var cache = getElementCache(context, "selector");
    var parts = [];
    var current = el;
    var documentElement;

    if (!isElementLike(el)) {
      return "";
    }

    if (cache && cache.has(el)) {
      return cache.get(el);
    }

    documentElement = el.ownerDocument && el.ownerDocument.documentElement;

    while (isElementLike(current) && current !== documentElement) {
      parts.unshift(getElementSelectorPart(current));

      if (current.id) {
        break;
      }

      current = current.parentElement;
    }

    if (cache) {
      cache.set(el, parts.join(" > "));
    }

    return parts.join(" > ");
  }

  function getConciseSelector(el, context) {
    var cache = getElementCache(context, "conciseSelector");
    var part;
    var className;
    var classParts;
    var concise;
    var sourcePath;
    var index;

    if (!isElementLike(el)) {
      return "";
    }

    if (cache && cache.has(el)) {
      return cache.get(el);
    }

    part = el.tagName ? el.tagName.toLowerCase() : "element";

    if (el.id) {
      concise = part + "#" + escapeSelectorPart(el.id);
    } else {
      className = typeof el.className === "string" ? el.className.trim() : "";
      concise = part;

      if (className) {
        classParts = className.split(/\s+/).slice(0, 2);

        for (index = 0; index < classParts.length; index += 1) {
          concise += "." + escapeSelectorPart(classParts[index]);
        }
      }

      sourcePath = getSelector(el, context);

      if (concise.length > 72 && sourcePath) {
        concise = sourcePath;
      }
    }

    if (cache) {
      cache.set(el, concise);
    }

    return concise;
  }

  function getSourcePath(el, context) {
    var cache = getElementCache(context, "sourcePath");
    var sourcePath;

    if (!isElementLike(el)) {
      return "";
    }

    if (cache && cache.has(el)) {
      return cache.get(el);
    }

    sourcePath = getSelector(el, context);

    if (cache) {
      cache.set(el, sourcePath);
    }

    return sourcePath;
  }

  function getElementChildren(el) {
    return isElementLike(el) ? Array.prototype.slice.call(el.children || []) : [];
  }

  Object.assign(ensureDomRegistry(), {
    isElementLike: isElementLike,
    getStyle: getStyle,
    getRect: getRect,
    isVisible: isVisible,
    getSelector: getSelector,
    getConciseSelector: getConciseSelector,
    getSourcePath: getSourcePath,
    getElementChildren: getElementChildren,
  });
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/core/context.js ----
(function initContext(global) {
  "use strict";

  var DA = global.DA;

  function freeze(value) {
    return typeof Object.freeze === "function" ? Object.freeze(value) : value;
  }

  function copyRegistry(registry) {
    var copy = {};
    var key;

    if (!registry) {
      return freeze(copy);
    }

    for (key in registry) {
      if (Object.prototype.hasOwnProperty.call(registry, key)) {
        copy[key] = registry[key];
      }
    }

    return freeze(copy);
  }

  function createElementCache() {
    return freeze({
      style: new WeakMap(),
      rect: new WeakMap(),
      visibility: new WeakMap(),
      selector: new WeakMap(),
      conciseSelector: new WeakMap(),
      sourcePath: new WeakMap(),
    });
  }

  function createExecutionCache() {
    return freeze({
      elements: createElementCache(),
      values: new Map(),
    });
  }

  function createRoleContext(root, options, cache, dom) {
    return freeze({
      root: root,
      options: options,
      cache: cache,
      dom: dom,
    });
  }

  /**
   * Creates one read-only context per analysis run.
   * Cache contents may be updated by helper modules, but the context object is not replaced.
   */
  function createAnalyzerContext(root, options) {
    var contextOptions = freeze({
      hasExplicitRoot: Boolean(options && options.hasExplicitRoot),
    });
    var contextCache = createExecutionCache();
    var contextDom = copyRegistry(DA.dom);

    return freeze({
      root: root,
      options: contextOptions,
      limits: freeze({
        maxDepth: 12,
        maxChildren: 80,
      }),
      cache: contextCache,
      dom: contextDom,
      collect: copyRegistry(DA.collect),
      roles: copyRegistry(DA.roles),
      formatters: copyRegistry(DA.formatters),
      markdown: copyRegistry(DA.markdown),
      roleContext: createRoleContext(root, contextOptions, contextCache, contextDom),
    });
  }

  DA.core.createAnalyzerContext = createAnalyzerContext;
  DA.core.createExecutionCache = createExecutionCache;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/core/output-validation.js ----
(function initOutputValidation(global) {
  "use strict";

  var DA = global.DA;
  var REQUIRED_MARKDOWN_SECTIONS = [
    "## Selected Element",
    "## Child Elements — Annotated Structure",
    "## Typography",
    "<details><summary>Raw Details</summary>",
  ];
  var INVALID_OUTPUT_MESSAGE =
    "DevTools Design Analyzer: Markdown output is missing required sections.";

  function getMissingMarkdownSections(markdown) {
    var missing = [];
    var index;

    if (typeof markdown !== "string") {
      return REQUIRED_MARKDOWN_SECTIONS.slice();
    }

    for (index = 0; index < REQUIRED_MARKDOWN_SECTIONS.length; index += 1) {
      if (markdown.indexOf(REQUIRED_MARKDOWN_SECTIONS[index]) === -1) {
        missing.push(REQUIRED_MARKDOWN_SECTIONS[index]);
      }
    }

    return missing;
  }

  function hasRequiredSections(markdown) {
    return getMissingMarkdownSections(markdown).length === 0;
  }

  function validateMarkdownOutput(markdown) {
    var missing = getMissingMarkdownSections(markdown);

    if (missing.length > 0) {
      throw new Error(INVALID_OUTPUT_MESSAGE + " Missing: " + missing.join(", "));
    }

    return markdown;
  }

  DA.core.REQUIRED_MARKDOWN_SECTIONS = REQUIRED_MARKDOWN_SECTIONS.slice();
  DA.core.INVALID_OUTPUT_MESSAGE = INVALID_OUTPUT_MESSAGE;
  DA.core.getMissingMarkdownSections = getMissingMarkdownSections;
  DA.core.hasRequiredSections = hasRequiredSections;
  DA.core.validateMarkdownOutput = validateMarkdownOutput;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/core/runtime-checks.js ----
(function initRuntimeChecks(global) {
  "use strict";

  var DA = global.DA;

  function checkRuntime() {
    return {
      namespace: typeof global.DA === "object",
      internalApi: Boolean(DA && typeof DA.analyzeSelectedElementReadable === "function"),
      publicApi: typeof global.analyzeSelectedElementReadable === "function",
      contextApi: Boolean(DA && DA.core && typeof DA.core.createAnalyzerContext === "function"),
      domApi: Boolean(
        DA &&
          DA.dom &&
          typeof DA.dom.getStyle === "function" &&
          typeof DA.dom.getRect === "function" &&
          typeof DA.dom.isVisible === "function" &&
          typeof DA.dom.getSelector === "function" &&
          typeof DA.dom.getConciseSelector === "function" &&
          typeof DA.dom.getSourcePath === "function"
      ),
      outputValidationApi: Boolean(
        DA && DA.core && typeof DA.core.validateMarkdownOutput === "function"
      ),
    };
  }

  function smokeTest(root) {
    var markdown = DA.analyzeSelectedElementReadable(root, {
      hasExplicitRoot: arguments.length > 0,
    });

    return {
      markdownType: typeof markdown,
      hasRequiredSections: DA.core.hasRequiredSections(markdown),
      markdown: markdown,
    };
  }

  DA.core.checkRuntime = checkRuntime;
  DA.core.smokeTest = smokeTest;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/roles/infer-role.js ----
(function initInferRole(global) {
  "use strict";

  var DA = global.DA;

  function inferRole(el, context) {
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";

    if (tag === "header") {
      return "Header";
    }

    if (tag === "nav") {
      return "Navigation";
    }

    if (tag === "main") {
      return "Main";
    }

    if (tag === "footer") {
      return "Footer";
    }

    if (tag === "section") {
      return "Section";
    }

    if (tag === "form") {
      return "Form";
    }

    if (tag === "ul" || tag === "ol") {
      return "List";
    }

    if (tag === "li") {
      return "List Item";
    }

    if (tag === "button") {
      return "Button";
    }

    if (tag === "a") {
      return "Link";
    }

    if (tag === "img" || tag === "picture" || tag === "video" || tag === "canvas" || tag === "svg") {
      return "Asset";
    }

    if (tag === "input" || tag === "select" || tag === "textarea") {
      return "Field";
    }

    if (tag === "h1") {
      return "Heading 1";
    }

    if (tag === "h2") {
      return "Heading 2";
    }

    if (tag === "h3") {
      return "Heading 3";
    }

    if (tag === "h4") {
      return "Heading 4";
    }

    if (tag === "h5") {
      return "Heading 5";
    }

    if (tag === "h6") {
      return "Heading 6";
    }

    if (tag === "p") {
      return "Paragraph";
    }

    if (tag === "span") {
      return "Text";
    }

    return "Element";
  }

  DA.roles.inferRole = inferRole;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/collect/text.js ----
(function initTextCollectorHelpers(global) {
  "use strict";

  var DA = global.DA;
  var SKIPPED_TEXT_TAGS = {
    script: true,
    style: true,
    template: true,
    meta: true,
    link: true,
    noscript: true,
  };

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function truncateText(text, maxLength) {
    var normalized = normalizeText(text);
    var limit = maxLength || 80;

    if (normalized.length <= limit) {
      return normalized;
    }

    return normalized.slice(0, limit - 1).trim() + "...";
  }

  function shouldSkipTextElement(el) {
    var tagName = el && el.tagName ? el.tagName.toLowerCase() : "";

    return Boolean(SKIPPED_TEXT_TAGS[tagName]);
  }

  function appendVisibleText(el, context, state) {
    var nodes;
    var index;
    var node;
    var text;

    if (
      state.length >= state.maxLength ||
      shouldSkipTextElement(el) ||
      !context.dom.isVisible(el, context)
    ) {
      return;
    }

    nodes = el && el.childNodes ? el.childNodes : [];

    for (index = 0; index < nodes.length; index += 1) {
      if (state.length >= state.maxLength) {
        return;
      }

      node = nodes[index];

      if (!node) {
        continue;
      }

      if (node.nodeType === 3) {
        text = normalizeText(node.nodeValue);

        if (text) {
          state.parts.push(text);
          state.length += text.length + 1;
        }

        continue;
      }

      if (node.nodeType === 1) {
        appendVisibleText(node, context, state);
      }
    }
  }

  function summarizeVisibleText(el, context, maxLength, emptyText) {
    var state = {
      parts: [],
      length: 0,
      maxLength: maxLength || 80,
    };
    var text;

    appendVisibleText(el, context, state);
    text = truncateText(state.parts.join(" "), state.maxLength);

    return text || emptyText || "";
  }

  function getDirectText(el) {
    var nodes = el && el.childNodes ? el.childNodes : [];
    var parts = [];
    var index;
    var node;
    var text;

    for (index = 0; index < nodes.length; index += 1) {
      node = nodes[index];

      if (node && node.nodeType === 3) {
        text = normalizeText(node.nodeValue);

        if (text) {
          parts.push(text);
        }
      }
    }

    return normalizeText(parts.join(" "));
  }

  DA.collect.normalizeText = normalizeText;
  DA.collect.truncateText = truncateText;
  DA.collect.shouldSkipTextElement = shouldSkipTextElement;
  DA.collect.summarizeVisibleText = summarizeVisibleText;
  DA.collect.getDirectText = getDirectText;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/collect/selected-element.js ----
(function initSelectedElementCollector(global) {
  "use strict";

  var DA = global.DA;
  var MAX_TEXT_LENGTH = 140;

  function summarizeSize(rect) {
    if (!rect || typeof rect.width !== "number" || typeof rect.height !== "number") {
      return "Unavailable";
    }

    return Math.round(rect.width) + " x " + Math.round(rect.height) + " px";
  }

  function collectSelectedElement(el, context) {
    var tagName = el.tagName ? el.tagName.toLowerCase() : "element";
    var rect = context.dom.getRect(el, context);
    var visible = context.dom.isVisible(el, context);

    return {
      tagName: tagName,
      role: context.roles.inferRole(el, context.roleContext),
      selector: context.dom.getConciseSelector(el, context),
      textSummary: visible
        ? context.collect.summarizeVisibleText(el, context, MAX_TEXT_LENGTH, "No visible text")
        : "Hidden element",
      sizeSummary: summarizeSize(rect),
      visibility: visible ? "Visible" : "Hidden",
      sourcePath: context.dom.getSourcePath(el, context),
    };
  }

  DA.collect.collectSelectedElement = collectSelectedElement;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/collect/child-tree.js ----
(function initChildTreeCollector(global) {
  "use strict";

  var DA = global.DA;
  var MAX_TEXT_LENGTH = 80;
  var DEFAULT_MAX_DEPTH = 3;
  var DEFAULT_MAX_NODES = 40;
  var SKIPPED_TAGS = {
    script: true,
    style: true,
    template: true,
    meta: true,
    link: true,
    noscript: true,
  };

  function summarizeText(el, context) {
    return context.collect.summarizeVisibleText(el, context, MAX_TEXT_LENGTH, "");
  }

  function summarizeSize(rect) {
    if (!rect || typeof rect.width !== "number" || typeof rect.height !== "number") {
      return "Unavailable";
    }

    return Math.round(rect.width) + " x " + Math.round(rect.height) + " px";
  }

  function shouldSkipElement(el) {
    var tagName = el && el.tagName ? el.tagName.toLowerCase() : "";

    return Boolean(SKIPPED_TAGS[tagName]);
  }

  function createTreeNode(el, context, depth) {
    var tagName = el.tagName ? el.tagName.toLowerCase() : "element";
    var rect = context.dom.getRect(el, context);
    var visible = context.dom.isVisible(el, context);

    return {
      tagName: tagName,
      role: context.roles.inferRole(el, context.roleContext),
      selector: context.dom.getConciseSelector(el, context),
      textSummary: visible ? summarizeText(el, context) : "Hidden element",
      sizeSummary: summarizeSize(rect),
      visibility: visible ? "Visible" : "Hidden",
      sourcePath: context.dom.getSourcePath(el, context),
      depth: depth,
      children: [],
    };
  }

  function appendChildren(parentEl, parentNode, context, state, depth) {
    var children;
    var index;
    var child;
    var childNode;

    if (depth > state.maxDepth || state.count >= state.maxNodes) {
      return;
    }

    children = context.dom.getElementChildren(parentEl);

    for (index = 0; index < children.length; index += 1) {
      if (state.count >= state.maxNodes) {
        return;
      }

      child = children[index];

      if (shouldSkipElement(child) || !context.dom.isVisible(child, context)) {
        continue;
      }

      childNode = createTreeNode(child, context, depth);
      state.count += 1;
      parentNode.children.push(childNode);
      appendChildren(child, childNode, context, state, depth + 1);
    }
  }

  function collectChildTree(root, context) {
    var state = {
      count: 0,
      maxDepth: DEFAULT_MAX_DEPTH,
      maxNodes: DEFAULT_MAX_NODES,
    };
    var tree = {
      children: [],
    };

    appendChildren(root, tree, context, state, 1);

    return tree.children;
  }

  DA.collect.collectChildTree = collectChildTree;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/collect/typography.js ----
(function initTypographyCollector(global) {
  "use strict";

  var DA = global.DA;
  var MAX_TEXT_LENGTH = 80;
  var DEFAULT_MAX_ITEMS = 30;
  var SKIPPED_TAGS = {
    script: true,
    style: true,
    template: true,
    meta: true,
    link: true,
    noscript: true,
  };

  function summarizeText(value) {
    return DA.collect.truncateText(value, MAX_TEXT_LENGTH);
  }

  function shouldSkipElement(el) {
    var tagName = el && el.tagName ? el.tagName.toLowerCase() : "";

    return Boolean(SKIPPED_TAGS[tagName]);
  }

  function normalizeColor(value) {
    var match = String(value || "").match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);

    if (!match) {
      return value || "Unavailable";
    }

    return "#" + [match[1], match[2], match[3]].map(function toHex(part) {
      var valueNumber = Math.max(0, Math.min(255, parseInt(part, 10)));
      var hex = valueNumber.toString(16).toUpperCase();

      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  function getStyleValue(style, name) {
    return style && style[name] ? style[name] : "Unavailable";
  }

  function createTypographyItem(el, context, text) {
    var style = context.dom.getStyle(el, context);

    return {
      textSample: summarizeText(text),
      tagName: el.tagName ? el.tagName.toLowerCase() : "element",
      selector: context.dom.getConciseSelector(el, context),
      fontFamily: getStyleValue(style, "fontFamily"),
      fontSize: getStyleValue(style, "fontSize"),
      lineHeight: getStyleValue(style, "lineHeight"),
      fontWeight: getStyleValue(style, "fontWeight"),
      letterSpacing: getStyleValue(style, "letterSpacing"),
      color: normalizeColor(getStyleValue(style, "color")),
      sourcePath: context.dom.getSourcePath(el, context),
    };
  }

  function getDedupeKey(item) {
    return [
      item.textSample,
      item.selector,
      item.fontFamily,
      item.fontSize,
      item.lineHeight,
      item.fontWeight,
      item.letterSpacing,
      item.color,
    ].join("|");
  }

  function appendTypographyItems(el, context, state) {
    var text;
    var item;
    var key;
    var children;
    var index;

    if (state.items.length >= state.maxItems || shouldSkipElement(el)) {
      return;
    }

    if (!context.dom.isVisible(el, context)) {
      return;
    }

    text = context.collect.getDirectText(el);

    if (text) {
      item = createTypographyItem(el, context, text);
      key = getDedupeKey(item);

      if (!state.seen[key]) {
        state.seen[key] = true;
        state.items.push(item);
      }
    }

    if (state.items.length >= state.maxItems) {
      return;
    }

    children = context.dom.getElementChildren(el);

    for (index = 0; index < children.length; index += 1) {
      appendTypographyItems(children[index], context, state);

      if (state.items.length >= state.maxItems) {
        return;
      }
    }
  }

  function collectTypography(root, context) {
    var state = {
      items: [],
      maxItems: DEFAULT_MAX_ITEMS,
      seen: {},
    };

    appendTypographyItems(root, context, state);

    return state.items;
  }

  DA.collect.collectTypography = collectTypography;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/collect/raw-details.js ----
(function initRawDetailsCollector(global) {
  "use strict";

  var DA = global.DA;

  function fallback(value) {
    return value === null || typeof value === "undefined" || value === "" ? "n/a" : value;
  }

  function normalizeColor(value) {
    var match = String(value || "").match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);

    if (!match) {
      return fallback(value);
    }

    return "#" + [match[1], match[2], match[3]].map(function toHex(part) {
      var valueNumber = Math.max(0, Math.min(255, parseInt(part, 10)));
      var hex = valueNumber.toString(16).toUpperCase();

      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  function getStyleValue(style, name, notes) {
    if (!style || !style[name]) {
      notes.push(name + " unavailable");
      return "n/a";
    }

    return style[name];
  }

  function getRectValue(rect, name, notes) {
    if (!rect || typeof rect[name] !== "number") {
      notes.push("rect." + name + " unavailable");
      return "n/a";
    }

    return Math.round(rect[name] * 100) / 100;
  }

  function getSpacing(style, names, notes) {
    var values = [];
    var index;

    for (index = 0; index < names.length; index += 1) {
      values.push(getStyleValue(style, names[index], notes));
    }

    return values.join(" ");
  }

  function isZeroSpacing(value) {
    return /^(0px\s*)+$/.test(String(value || ""));
  }

  function getReadableSpacing(style, names, notes) {
    var spacing = getSpacing(style, names, notes);

    if (isZeroSpacing(spacing)) {
      return "n/a";
    }

    return spacing;
  }

  function getReadableStyleValue(style, name, notes) {
    var value = getStyleValue(style, name, notes);

    if (value === "0px") {
      return "n/a";
    }

    return value;
  }

  function countVisibleChildren(children, context) {
    var count = 0;
    var index;

    for (index = 0; index < children.length; index += 1) {
      if (context.dom.isVisible(children[index], context)) {
        count += 1;
      }
    }

    return count;
  }

  function collectRawDetails(root, context) {
    var notes = [];
    var style = context.dom.getStyle(root, context);
    var rect = context.dom.getRect(root, context);
    var children = context.dom.getElementChildren(root);
    var visibleChildCount = countVisibleChildren(children, context);
    var tagName = root.tagName ? root.tagName.toLowerCase() : "element";
    var backgroundColor = getStyleValue(style, "backgroundColor", notes);
    var color = getStyleValue(style, "color", notes);
    var rawDetails;

    rawDetails = {
      tagName: tagName,
      selector: fallback(context.dom.getSelector(root, context)),
      sourcePath: fallback(context.dom.getSourcePath(root, context)),
      visibility: context.dom.isVisible(root, context) ? "visible" : "hidden",
      rect: {
        width: getRectValue(rect, "width", notes),
        height: getRectValue(rect, "height", notes),
        top: getRectValue(rect, "top", notes),
        left: getRectValue(rect, "left", notes),
      },
      layout: {
        display: getStyleValue(style, "display", notes),
        position: getStyleValue(style, "position", notes),
        boxSizing: getStyleValue(style, "boxSizing", notes),
        overflow: getStyleValue(style, "overflow", notes),
        zIndex: getStyleValue(style, "zIndex", notes),
      },
      visual: {
        opacity: getStyleValue(style, "opacity", notes),
        backgroundColor: normalizeColor(backgroundColor),
        color: normalizeColor(color),
      },
      typography: {
        fontFamily: getStyleValue(style, "fontFamily", notes),
        fontSize: getStyleValue(style, "fontSize", notes),
        lineHeight: getStyleValue(style, "lineHeight", notes),
        fontWeight: getStyleValue(style, "fontWeight", notes),
      },
      spacing: {
        padding: getReadableSpacing(style, [
          "paddingTop",
          "paddingRight",
          "paddingBottom",
          "paddingLeft",
        ], notes),
        margin: getReadableSpacing(style, [
          "marginTop",
          "marginRight",
          "marginBottom",
          "marginLeft",
        ], notes),
        borderWidth: getReadableSpacing(style, [
          "borderTopWidth",
          "borderRightWidth",
          "borderBottomWidth",
          "borderLeftWidth",
        ], notes),
        borderRadius: getReadableSpacing(style, [
          "borderTopLeftRadius",
          "borderTopRightRadius",
          "borderBottomRightRadius",
          "borderBottomLeftRadius",
        ], notes),
        gap: getReadableStyleValue(style, "gap", notes),
        rowGap: getReadableStyleValue(style, "rowGap", notes),
        columnGap: getReadableStyleValue(style, "columnGap", notes),
      },
      children: {
        direct: children.length,
        visible: visibleChildCount,
        skipped: Math.max(0, children.length - visibleChildCount),
      },
      notes: notes.length > 0 ? notes : ["none"],
    };

    return rawDetails;
  }

  DA.collect.collectRawDetails = collectRawDetails;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/markdown/render-report.js ----
(function initRenderReport(global) {
  "use strict";

  var DA = global.DA;

  function formatInlineCode(value) {
    return "`" + String(value || "Unavailable").replace(/`/g, "\\`") + "`";
  }

  function formatTreeNodeSummary(node) {
    var parts = [node.role + " (`" + node.tagName + "`)"];

    if (node.sizeSummary && node.sizeSummary !== "Unavailable") {
      parts.push(node.sizeSummary);
    }

    if (node.textSummary && node.textSummary !== "Hidden element") {
      parts.push("text: " + node.textSummary);
    }

    return parts.join(" — ");
  }

  function appendTreeNodeLines(lines, node, depth) {
    var indent = new Array(depth + 1).join("  ");
    var children = node.children || [];
    var index;

    lines.push(indent + "- " + formatTreeNodeSummary(node));

    for (index = 0; index < children.length; index += 1) {
      appendTreeNodeLines(lines, children[index], depth + 1);
    }
  }

  function renderChildElements(childElements) {
    var lines = [];
    var index;

    if (!childElements || childElements.length === 0) {
      return "- No visible child elements found.";
    }

    for (index = 0; index < childElements.length; index += 1) {
      appendTreeNodeLines(lines, childElements[index], 0);
    }

    return lines.join("\n");
  }

  function renderTypographyItem(item) {
    return [
      "- " + item.textSample,
      " — " + item.fontSize,
      " / " + item.lineHeight,
      " / " + item.fontWeight,
      " / color: " + item.color,
      " / selector: " + formatInlineCode(item.selector),
    ].join("");
  }

  function renderTypography(typography) {
    var lines = [];
    var index;

    if (!typography || typography.length === 0) {
      return "- No visible typography found.";
    }

    for (index = 0; index < typography.length; index += 1) {
      lines.push(renderTypographyItem(typography[index]));
    }

    return lines.join("\n");
  }

  function formatRawValue(value) {
    return String(value === null || typeof value === "undefined" || value === "" ? "n/a" : value);
  }

  function formatRawRect(rect) {
    var rawRect = rect || {};

    return [
      "width " + formatRawValue(rawRect.width),
      "height " + formatRawValue(rawRect.height),
      "top " + formatRawValue(rawRect.top),
      "left " + formatRawValue(rawRect.left),
    ].join(" / ");
  }

  function renderRawNotes(notes) {
    var rawNotes = notes && notes.length > 0 ? notes : ["none"];

    return rawNotes.join(", ");
  }

  function renderRawDetails(rawDetails) {
    var details = rawDetails || {};
    var layout = details.layout || {};
    var visual = details.visual || {};
    var typography = details.typography || {};
    var spacing = details.spacing || {};
    var children = details.children || {};

    return [
      "- Tag: `" + formatRawValue(details.tagName) + "`",
      "- Selector: " + formatInlineCode(details.selector || "n/a"),
      "- Source Path: " + formatInlineCode(details.sourcePath || "n/a"),
      "- Visibility: " + formatRawValue(details.visibility),
      "- Raw Rect: " + formatRawRect(details.rect),
      "- Layout: display " + formatRawValue(layout.display) +
        " / position " + formatRawValue(layout.position) +
        " / box sizing " + formatRawValue(layout.boxSizing) +
        " / overflow " + formatRawValue(layout.overflow) +
        " / z-index " + formatRawValue(layout.zIndex),
      "- Visual: opacity " + formatRawValue(visual.opacity) +
        " / background " + formatRawValue(visual.backgroundColor) +
        " / color " + formatRawValue(visual.color),
      "- Typography: " + formatRawValue(typography.fontFamily) +
        " / " + formatRawValue(typography.fontSize) +
        " / " + formatRawValue(typography.lineHeight) +
        " / weight " + formatRawValue(typography.fontWeight),
      "- Spacing: padding " + formatRawValue(spacing.padding) +
        " / margin " + formatRawValue(spacing.margin) +
        " / border width " + formatRawValue(spacing.borderWidth) +
        " / radius " + formatRawValue(spacing.borderRadius),
      "- Gap: gap " + formatRawValue(spacing.gap) +
        " / row " + formatRawValue(spacing.rowGap) +
        " / column " + formatRawValue(spacing.columnGap),
      "- Children: direct " + formatRawValue(children.direct) +
        " / visible " + formatRawValue(children.visible) +
        " / skipped " + formatRawValue(children.skipped),
      "- Notes: " + renderRawNotes(details.notes),
    ].join("\n");
  }

  function renderReport(reportData) {
    var selected = reportData.selectedElement;
    var childElements = reportData.childElements || [];
    var typography = reportData.typography || [];
    var partialFailures = reportData.partialFailures || [];
    var rawDetailsLines = [renderRawDetails(reportData.rawDetails)];

    if (partialFailures.length > 0) {
      rawDetailsLines.push("");
      rawDetailsLines.push("Partial Failures:");
      partialFailures.forEach(function appendFailure(failure) {
        rawDetailsLines.push(
          "- " + failure.stage + ": " + failure.message
        );
      });
    }

    return [
      "## Selected Element",
      "",
      "- Role: " + selected.role,
      "- Tag: `" + selected.tagName + "`",
      "- Selector: " + formatInlineCode(selected.selector),
      "- Text: " + selected.textSummary,
      "- Size: " + selected.sizeSummary,
      "- Visibility: " + selected.visibility,
      "- Source Path: " + formatInlineCode(selected.sourcePath),
      "",
      "## Child Elements — Annotated Structure",
      "",
      renderChildElements(childElements),
      "",
      "## Typography",
      "",
      renderTypography(typography),
      "",
      "<details><summary>Raw Details</summary>",
      "",
      rawDetailsLines.join("\n"),
      "",
      "</details>",
    ].join("\n");
  }

  DA.markdown.renderReport = renderReport;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/analyzer.js ----
(function initAnalyzer(global) {
  "use strict";

  var DA = global.DA;

  function createPartialFailure(stage, error) {
    return {
      stage: stage,
      message: error && error.message ? error.message : "Unknown analysis failure",
    };
  }

  function createReportData(root, analyzerContext, partialFailures) {
    return {
      selectedElement: analyzerContext.collect.collectSelectedElement(root, analyzerContext),
      childElements: analyzerContext.collect.collectChildTree(root, analyzerContext),
      typography: analyzerContext.collect.collectTypography(root, analyzerContext),
      rawDetails: analyzerContext.collect.collectRawDetails(root, analyzerContext),
      partialFailures: partialFailures || [],
    };
  }

  function analyzeSelectedElementReadable(root, options) {
    var target = DA.core.resolveRoot(root, options);
    var validRoot = DA.core.validateRoot(target);
    var analyzerContext = DA.core.createAnalyzerContext(validRoot, options);
    var partialFailures = [];
    var reportData;
    var markdown;

    try {
      reportData = createReportData(validRoot, analyzerContext, partialFailures);
    } catch (error) {
      partialFailures.push(createPartialFailure("report-data", error));
      reportData = {
        selectedElement: {
          tagName: validRoot.tagName.toLowerCase(),
          role: "Element",
          selector: "",
          textSummary: "Unavailable",
          sizeSummary: "Unavailable",
          visibility: "Unavailable",
          sourcePath: "",
        },
        childElements: [],
        typography: [],
        rawDetails: {
          notes: ["report-data unavailable"],
        },
        partialFailures: partialFailures,
      };
    }

    markdown = DA.markdown.renderReport(reportData, analyzerContext);

    return DA.core.validateMarkdownOutput(markdown);
  }

  DA.analyzeSelectedElementReadable = analyzeSelectedElementReadable;
})(typeof window !== "undefined" ? window : globalThis);


// ---- src/index.js ----
(function initPublicApi(global) {
  "use strict";

  var DA = global.DA;

  if (!DA || typeof DA.analyzeSelectedElementReadable !== "function") {
    throw new Error("DevTools Design Analyzer: DA analyzer is not initialized.");
  }

  global.analyzeSelectedElementReadable = function analyzeSelectedElementReadable(root) {
    return DA.analyzeSelectedElementReadable(root, {
      hasExplicitRoot: arguments.length > 0,
    });
  };
})(typeof window !== "undefined" ? window : globalThis);

})();

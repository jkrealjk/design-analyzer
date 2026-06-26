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

  function getUniqueClassParts(className, limit) {
    var rawParts = String(className || "").trim().split(/\s+/);
    var classParts = [];
    var seen = {};
    var index;
    var classPart;

    for (index = 0; index < rawParts.length; index += 1) {
      classPart = rawParts[index];

      if (!classPart || seen[classPart]) {
        continue;
      }

      seen[classPart] = true;
      classParts.push(classPart);

      if (classParts.length >= limit) {
        break;
      }
    }

    return classParts;
  }

  function appendClassSelectorParts(part, className, limit) {
    var classParts = getUniqueClassParts(className, limit);
    var selectorPart = part;
    var index;

    for (index = 0; index < classParts.length; index += 1) {
      selectorPart += "." + escapeSelectorPart(classParts[index]);
    }

    return selectorPart;
  }

  function getElementSelectorPart(el) {
    var part = el.tagName ? el.tagName.toLowerCase() : "element";
    var className;

    if (el.id) {
      return part + "#" + escapeSelectorPart(el.id);
    }

    className = typeof el.className === "string" ? el.className.trim() : "";

    return className ? appendClassSelectorParts(part, className, 3) : part;
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
    var concise;
    var sourcePath;

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

      concise = className ? appendClassSelectorParts(concise, className, 2) : concise;

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

  function getAttributeValue(el, name) {
    return el && typeof el.getAttribute === "function" ? el.getAttribute(name) || "" : "";
  }

  function getEvidenceText(el) {
    var parent = el && el.parentElement ? el.parentElement : null;

    return [
      el && el.id ? el.id : "",
      el && typeof el.className === "string" ? el.className : "",
      getAttributeValue(el, "aria-label"),
      getAttributeValue(el, "title"),
      getAttributeValue(el, "href"),
      parent && parent.id ? parent.id : "",
      parent && typeof parent.className === "string" ? parent.className : "",
    ].join(" ");
  }

  function hasToken(value, pattern) {
    return pattern.test(String(value || ""));
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function appendVisibleText(el, context, state) {
    var nodes;
    var index;
    var node;

    if (
      !el ||
      state.length >= state.maxLength ||
      (context && context.dom && !context.dom.isVisible(el, context))
    ) {
      return;
    }

    nodes = el.childNodes || [];

    for (index = 0; index < nodes.length; index += 1) {
      if (state.length >= state.maxLength) {
        return;
      }

      node = nodes[index];

      if (!node) {
        continue;
      }

      if (node.nodeType === 3) {
        state.parts.push(node.nodeValue);
        state.length += String(node.nodeValue || "").length;
      }

      if (node.nodeType === 1) {
        appendVisibleText(node, context, state);
      }
    }
  }

  function getVisibleTextEvidence(el, context) {
    var state = {
      parts: [],
      length: 0,
      maxLength: 120,
    };

    appendVisibleText(el, context, state);

    return normalizeText(state.parts.join(" "));
  }

  function hasMainNavText(value) {
    return hasToken(value, /\bProduct\b/i) &&
      hasToken(value, /\bResources\b/i) &&
      hasToken(value, /\b(Customers|Pricing|Now|Contact)\b/i);
  }

  function hasMostlyActionText(value) {
    var text = normalizeText(value);

    if (!text || hasMainNavText(text)) {
      return false;
    }

    return hasToken(text, /\b(Log in|Sign up|Get started|Contact sales|Book demo)\b/i);
  }

  function isActionEvidence(value) {
    return hasToken(value, /buttons?|actions?|cta|button[-_\s]?items?|buttonItem/i);
  }

  function isNavigationEvidence(value) {
    return hasToken(value, /nav[-_\s]?items|navigation|nav[-_\s]?group|site navigation/i);
  }

  function isLogoEvidence(value) {
    return hasToken(value, /(^|[-_\s])(logo|brand|home)($|[-_\s])/i);
  }

  function inferRole(el, context) {
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";
    var evidence = getEvidenceText(el);
    var ariaLabel = getAttributeValue(el, "aria-label");
    var visibleText = "";
    var groupEvidence;

    if (tag === "a" && (isLogoEvidence(evidence) || hasToken(ariaLabel, /home/i))) {
      return "Logo Link";
    }

    if (tag === "svg" && (isLogoEvidence(evidence) || hasToken(ariaLabel, /linear|logo|brand|home/i))) {
      return "Logo";
    }

    if (tag === "svg" && (ariaLabel || getAttributeValue(el, "title"))) {
      return "Icon";
    }

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

    if (tag === "ul" || tag === "ol" || tag === "div") {
      visibleText = getVisibleTextEvidence(el, context);
      groupEvidence = evidence + " " + visibleText;

      if (!hasMainNavText(visibleText) && isActionEvidence(groupEvidence)) {
        return "Action Group";
      }

      if ((tag === "ul" || tag === "ol") && hasMostlyActionText(visibleText)) {
        return "Action Group";
      }
    }

    if ((tag === "ul" || tag === "ol") && isNavigationEvidence(evidence + " " + ariaLabel)) {
      return "Navigation List";
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

    if (tag === "div" || tag === "span") {
      if (isNavigationEvidence(evidence)) {
        return "Nav Group";
      }

      if (tag === "div" && isActionEvidence(evidence)) {
        return "Action Group";
      }
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
  var DEFAULT_MAX_DEPTH = 6;
  var DEFAULT_MAX_NODES = 40;
  var SEMANTIC_TAGS = {
    header: true,
    nav: true,
    main: true,
    section: true,
    footer: true,
    form: true,
    ul: true,
    ol: true,
    li: true,
    a: true,
    button: true,
    input: true,
    select: true,
    textarea: true,
    svg: true,
  };
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

  function hasMeaningfulAttribute(el) {
    var ariaLabel = el && el.getAttribute ? el.getAttribute("aria-label") : "";
    var role = el && el.getAttribute ? el.getAttribute("role") : "";

    return Boolean(ariaLabel || role);
  }

  function getVisibleChildren(el, context) {
    var children = context.dom.getElementChildren(el);
    var visibleChildren = [];
    var index;
    var child;

    for (index = 0; index < children.length; index += 1) {
      child = children[index];

      if (!shouldSkipElement(child) && context.dom.isVisible(child, context)) {
        visibleChildren.push(child);
      }
    }

    return visibleChildren;
  }

  function isBoringWrapper(el, context, role, visibleChildren) {
    var tagName = el && el.tagName ? el.tagName.toLowerCase() : "";

    if (tagName !== "div" && tagName !== "span") {
      return false;
    }

    if (SEMANTIC_TAGS[tagName] || role !== "Element") {
      return false;
    }

    if (hasMeaningfulAttribute(el) || context.collect.getDirectText(el)) {
      return false;
    }

    return visibleChildren.length > 0 && visibleChildren.length <= 3;
  }

  function hasMeaningfulTreeRole(role) {
    return Boolean(role && role !== "Element" && role !== "Text");
  }

  function isInteractiveOrAssetRole(role) {
    return role === "Link" ||
      role === "Button" ||
      role === "Logo Link" ||
      role === "Logo" ||
      role === "Icon" ||
      role === "Asset";
  }

  function hasMeaningfulVisibleDescendant(children, context, depth) {
    var index;
    var child;
    var role;
    var childChildren;

    if (!children || children.length === 0 || depth > 3) {
      return false;
    }

    for (index = 0; index < children.length; index += 1) {
      child = children[index];
      role = context.roles.inferRole(child, context.roleContext);

      if (hasMeaningfulTreeRole(role) || context.collect.getDirectText(child)) {
        return true;
      }

      childChildren = getVisibleChildren(child, context);

      if (hasMeaningfulVisibleDescendant(childChildren, context, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  function isTinyLayoutRect(rect) {
    if (!rect || typeof rect.width !== "number" || typeof rect.height !== "number") {
      return false;
    }

    return rect.height === 0 || rect.width <= 12 || rect.height <= 1;
  }

  function isLayoutOnlySpacer(el, context, role, visibleChildren) {
    var tagName = el && el.tagName ? el.tagName.toLowerCase() : "";
    var rect;

    if (tagName !== "div" && tagName !== "span") {
      return false;
    }

    if (SEMANTIC_TAGS[tagName] || hasMeaningfulTreeRole(role)) {
      return false;
    }

    rect = context.dom.getRect(el, context);

    return isTinyLayoutRect(rect) &&
      !summarizeText(el, context) &&
      !hasMeaningfulVisibleDescendant(visibleChildren, context, 1);
  }

  function isSingleTextSpanWrapper(el, context, role, visibleChildren) {
    var tagName = el && el.tagName ? el.tagName.toLowerCase() : "";
    var childRole;

    if (tagName !== "span" || hasMeaningfulAttribute(el) || hasMeaningfulTreeRole(role)) {
      return false;
    }

    if (visibleChildren.length === 0) {
      return Boolean(context.collect.getDirectText(el));
    }

    if (visibleChildren.length !== 1) {
      return false;
    }

    childRole = context.roles.inferRole(visibleChildren[0], context.roleContext);

    return isInteractiveOrAssetRole(childRole);
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
    var role;
    var visibleChildren;
    var childNode;

    if (depth > state.maxDepth || state.count >= state.maxNodes) {
      return;
    }

    children = getVisibleChildren(parentEl, context);

    for (index = 0; index < children.length; index += 1) {
      if (state.count >= state.maxNodes) {
        return;
      }

      child = children[index];
      role = context.roles.inferRole(child, context.roleContext);
      visibleChildren = getVisibleChildren(child, context);

      if (isLayoutOnlySpacer(child, context, role, visibleChildren)) {
        continue;
      }

      if (isSingleTextSpanWrapper(child, context, role, visibleChildren)) {
        appendChildren(child, parentNode, context, state, depth);
        continue;
      }

      if (isBoringWrapper(child, context, role, visibleChildren)) {
        appendChildren(child, parentNode, context, state, depth);
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
  var MAX_DISPLAY_TEXT_LENGTH = 140;

  function formatInlineCode(value) {
    return "`" + String(value || "Unavailable").replace(/`/g, "\\`") + "`";
  }

  function escapeTableCell(value) {
    return String(value === null || typeof value === "undefined" || value === "" ? "n/a" : value)
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  }

  function formatCodeTableCell(value) {
    return escapeTableCell(formatInlineCode(value));
  }

  function normalizeDisplayText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function truncateDisplayText(value) {
    var text = normalizeDisplayText(value);

    if (text.length <= MAX_DISPLAY_TEXT_LENGTH) {
      return text;
    }

    return text.slice(0, MAX_DISPLAY_TEXT_LENGTH - 1).trim() + "...";
  }

  function hasSentencePunctuation(value) {
    return /[.!?](?:\s|$)/.test(String(value || ""));
  }

  function matchCommonPhrase(words, index) {
    var twoWordPhrase = words.slice(index, index + 2).join(" ");
    var normalizedPhrase = twoWordPhrase.replace(/\s*[→↗]\s*$/, "");
    var trailingSymbol = twoWordPhrase.match(/\s*([→↗])\s*$/);
    var commonPhrases = {
      "Log in": true,
      "Sign up": true,
      "Get started": true,
      "Learn more": true,
      "AI era": true,
      "Coding Sessions": true,
    };

    if (!commonPhrases[normalizedPhrase]) {
      return null;
    }

    return {
      value: normalizedPhrase + (trailingSymbol ? " " + trailingSymbol[1] : ""),
      length: 2,
    };
  }

  function splitLabelText(value) {
    var text = truncateDisplayText(value);
    var words;
    var parts = [];
    var index;
    var phrase;
    var word;

    if (!text || text.indexOf(" · ") !== -1) {
      return text ? [text] : [];
    }

    if (/^(no visible text|hidden element|unavailable)$/i.test(text)) {
      return [text];
    }

    if (hasSentencePunctuation(text) || /[,;:]/.test(text)) {
      return [text];
    }

    words = text.split(" ");
    index = 0;

    while (index < words.length) {
      phrase = matchCommonPhrase(words, index);

      if (phrase) {
        parts.push(phrase.value);
        index += phrase.length;
        continue;
      }

      word = words[index];

      if (!/^[A-Z0-9][A-Za-z0-9+&'’.-]*(?:[→↗])?$/.test(word)) {
        return [text];
      }

      parts.push(word);
      index += 1;
    }

    return parts.length > 1 ? parts : [text];
  }

  function appendReadableSegments(segments, value) {
    var parts = splitLabelText(value);
    var index;

    for (index = 0; index < parts.length; index += 1) {
      if (parts[index]) {
        segments.push(parts[index]);
      }
    }
  }

  function getReadableText(value, segments) {
    var normalizedSegments = [];
    var index;
    var text = truncateDisplayText(value);

    if (segments && segments.length > 0) {
      for (index = 0; index < segments.length; index += 1) {
        appendReadableSegments(normalizedSegments, segments[index]);
      }

      if (normalizedSegments.length > 1) {
        return truncateDisplayText(normalizedSegments.join(" · "));
      }
    }

    return splitLabelText(text).join(" · ");
  }

  function isUsableTextSummary(value) {
    var text = normalizeDisplayText(value);

    return Boolean(text && text !== "Hidden element" && text !== "No visible text");
  }

  function collectNodeTextSegments(node, segments) {
    var children = node && node.children ? node.children : [];
    var childSegments = [];
    var index;

    if (!node) {
      return;
    }

    if ((node.role === "Link" || node.role === "Button") && isUsableTextSummary(node.textSummary)) {
      for (index = 0; index < children.length; index += 1) {
        collectNodeTextSegments(children[index], childSegments);
      }

      if (childSegments.length > 1) {
        for (index = 0; index < childSegments.length; index += 1) {
          segments.push(childSegments[index]);
        }

        return;
      }

      segments.push(node.textSummary);
      return;
    }

    if (children.length === 0) {
      if (isUsableTextSummary(node.textSummary)) {
        segments.push(node.textSummary);
      }

      return;
    }

    for (index = 0; index < children.length; index += 1) {
      collectNodeTextSegments(children[index], segments);
    }
  }

  function getNodeTextSegments(nodes) {
    var segments = [];
    var index;

    for (index = 0; index < nodes.length; index += 1) {
      collectNodeTextSegments(nodes[index], segments);
    }

    return segments;
  }

  function formatSizeSummary(value) {
    return String(value || "Unavailable")
      .replace(/\s*x\s*/i, "×")
      .replace(/\s*px\b/i, "px");
  }

  function formatElementLabel(role, tagName) {
    return String(role || "Element") + " (" + String(tagName || "element") + ")";
  }

  function renderSelectedElement(selected, childElements) {
    var selectedElement = selected || {};
    var textSegments = getNodeTextSegments(childElements || []);
    var rows = [
      ["Element", formatInlineCode(formatElementLabel(selectedElement.role, selectedElement.tagName))],
      ["Selector", formatInlineCode(selectedElement.selector)],
      ["Text", formatInlineCode(getReadableText(selectedElement.textSummary || "No visible text", textSegments))],
      ["Rendered Size", formatInlineCode(formatSizeSummary(selectedElement.sizeSummary))],
      ["Visibility", formatInlineCode(selectedElement.visibility || "Unavailable")],
      ["Source Path", formatInlineCode(selectedElement.sourcePath || "Unavailable")],
    ];
    var lines = ["| Item | Value |", "|---|---|"];
    var index;

    for (index = 0; index < rows.length; index += 1) {
      lines.push("| " + escapeTableCell(rows[index][0]) + " | " + escapeTableCell(rows[index][1]) + " |");
    }

    return lines.join("\n");
  }

  function appendTreeNodeLines(lines, node, prefix, isLast) {
    var children = node.children || [];
    var childPrefix = prefix + (isLast ? "  " : "│ ");
    var branch = prefix ? prefix + (isLast ? "└ " : "├ ") : "";
    var textSegments = getNodeTextSegments(children);
    var index;

    lines.push(branch + formatElementLabel(node.role, node.tagName));

    if (node.sizeSummary && node.sizeSummary !== "Unavailable") {
      lines.push(childPrefix + "size: " + formatSizeSummary(node.sizeSummary));
    }

    if (node.textSummary && node.textSummary !== "Hidden element") {
      lines.push(childPrefix + "text: " + getReadableText(node.textSummary, textSegments));
    }

    for (index = 0; index < children.length; index += 1) {
      if (index > 0 || node.sizeSummary || node.textSummary) {
        lines.push(childPrefix.replace(/\s+$/g, ""));
      }

      appendTreeNodeLines(lines, children[index], childPrefix, index === children.length - 1);
    }
  }

  function renderChildElements(childElements) {
    var lines = [];
    var index;

    if (!childElements || childElements.length === 0) {
      return "```text\nNo visible child elements found.\n```";
    }

    for (index = 0; index < childElements.length; index += 1) {
      if (index > 0) {
        lines.push("");
      }

      appendTreeNodeLines(lines, childElements[index], "", index === childElements.length - 1);
    }

    return "```text\n" + lines.join("\n") + "\n```";
  }

  function getTypographyGroupKey(item) {
    return [
      item.fontFamily,
      item.fontSize,
      item.lineHeight,
      item.fontWeight,
      item.letterSpacing,
      item.color,
    ].join("|");
  }

  function renderTypographySummary(typography) {
    var groups = {};
    var orderedGroups = [];
    var lines = [
      "### Summary",
      "",
      "| Font | Size | Line Height | Weight | Letter Spacing | Color | Text |",
      "|---|---:|---:|---:|---:|---|---|",
    ];
    var index;
    var item;
    var key;
    var group;

    for (index = 0; index < typography.length; index += 1) {
      item = typography[index];
      key = getTypographyGroupKey(item);

      if (!groups[key]) {
        groups[key] = {
          fontFamily: item.fontFamily,
          fontSize: item.fontSize,
          lineHeight: item.lineHeight,
          fontWeight: item.fontWeight,
          letterSpacing: item.letterSpacing,
          color: item.color,
          text: [],
        };
        orderedGroups.push(groups[key]);
      }

      groups[key].text.push(item.textSample);
    }

    for (index = 0; index < orderedGroups.length; index += 1) {
      group = orderedGroups[index];
      lines.push([
        "| " + escapeTableCell(group.fontFamily),
        escapeTableCell(group.fontSize),
        escapeTableCell(group.lineHeight),
        escapeTableCell(group.fontWeight),
        escapeTableCell(group.letterSpacing),
        escapeTableCell(group.color),
        escapeTableCell(getReadableText(group.text.join(" "), group.text)) + " |",
      ].join(" | "));
    }

    return lines.join("\n");
  }

  function renderTypographyDetails(typography) {
    var lines = ["### Text Details", "", "```text"];
    var index;
    var item;

    for (index = 0; index < typography.length; index += 1) {
      item = typography[index];
      lines.push(
        getReadableText(item.textSample) +
          " — " +
          item.fontSize +
          " / " +
          item.lineHeight +
          " / " +
          item.fontWeight +
          " / " +
          item.color +
          " / selector: " +
          item.selector
      );
    }

    lines.push("```");

    return lines.join("\n");
  }

  function renderTypography(typography) {
    if (!typography || typography.length === 0) {
      return "- No visible typography found.";
    }

    return [
      renderTypographySummary(typography),
      "",
      renderTypographyDetails(typography),
    ].join("\n");
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

  function renderKeyValueTable(rows) {
    var lines = ["| Item | Value |", "|---|---|"];
    var index;

    for (index = 0; index < rows.length; index += 1) {
      lines.push("| " + escapeTableCell(rows[index][0]) + " | " + escapeTableCell(rows[index][1]) + " |");
    }

    return lines.join("\n");
  }

  function renderRawDetails(rawDetails) {
    var details = rawDetails || {};
    var layout = details.layout || {};
    var visual = details.visual || {};
    var typography = details.typography || {};
    var spacing = details.spacing || {};
    var children = details.children || {};

    return [
      "#### Identity",
      "",
      renderKeyValueTable([
        ["Tag", formatCodeTableCell(formatRawValue(details.tagName))],
        ["Selector", formatCodeTableCell(details.selector || "n/a")],
        ["Source Path", formatCodeTableCell(details.sourcePath || "n/a")],
        ["Visibility", formatRawValue(details.visibility)],
      ]),
      "",
      "#### Raw Rect",
      "",
      renderKeyValueTable([
        ["Rect", formatRawRect(details.rect)],
      ]),
      "",
      "#### Layout:",
      "",
      renderKeyValueTable([
        ["Display", formatRawValue(layout.display)],
        ["Position", formatRawValue(layout.position)],
        ["Box Sizing", formatRawValue(layout.boxSizing)],
        ["Overflow", formatRawValue(layout.overflow)],
        ["Z Index", formatRawValue(layout.zIndex)],
      ]),
      "",
      "#### Visual:",
      "",
      renderKeyValueTable([
        ["Opacity", formatRawValue(visual.opacity)],
        ["Background", formatRawValue(visual.backgroundColor)],
        ["Color", formatRawValue(visual.color)],
      ]),
      "",
      "#### Typography:",
      "",
      renderKeyValueTable([
        ["Font Family", formatRawValue(typography.fontFamily)],
        ["Font Size", formatRawValue(typography.fontSize)],
        ["Line Height", formatRawValue(typography.lineHeight)],
        ["Weight", formatRawValue(typography.fontWeight)],
      ]),
      "",
      "#### Spacing:",
      "",
      renderKeyValueTable([
        ["Padding", formatRawValue(spacing.padding)],
        ["Margin", formatRawValue(spacing.margin)],
        ["Border Width", formatRawValue(spacing.borderWidth)],
        ["Radius", formatRawValue(spacing.borderRadius)],
        ["Gap", formatRawValue(spacing.gap)],
        ["Row Gap", formatRawValue(spacing.rowGap)],
        ["Column Gap", formatRawValue(spacing.columnGap)],
      ]),
      "",
      "#### Children:",
      "",
      renderKeyValueTable([
        ["Direct", formatRawValue(children.direct)],
        ["Visible", formatRawValue(children.visible)],
        ["Skipped", formatRawValue(children.skipped)],
      ]),
      "",
      "#### Notes",
      "",
      renderKeyValueTable([
        ["Notes", renderRawNotes(details.notes)],
      ]),
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
      renderSelectedElement(selected, childElements),
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

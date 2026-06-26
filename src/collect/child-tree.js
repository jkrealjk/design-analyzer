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

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

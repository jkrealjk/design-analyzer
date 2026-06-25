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

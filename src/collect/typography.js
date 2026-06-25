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

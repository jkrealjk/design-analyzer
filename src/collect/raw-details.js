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

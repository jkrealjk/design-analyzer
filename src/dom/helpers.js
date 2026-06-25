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

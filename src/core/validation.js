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

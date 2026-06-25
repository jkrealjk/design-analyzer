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

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

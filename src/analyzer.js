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

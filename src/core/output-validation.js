(function initOutputValidation(global) {
  "use strict";

  var DA = global.DA;
  var REQUIRED_MARKDOWN_SECTIONS = [
    "## Selected Element",
    "## Child Elements — Annotated Structure",
    "## Typography",
    "<details><summary>Raw Details</summary>",
  ];
  var INVALID_OUTPUT_MESSAGE =
    "DevTools Design Analyzer: Markdown output is missing required sections.";

  function getMissingMarkdownSections(markdown) {
    var missing = [];
    var index;

    if (typeof markdown !== "string") {
      return REQUIRED_MARKDOWN_SECTIONS.slice();
    }

    for (index = 0; index < REQUIRED_MARKDOWN_SECTIONS.length; index += 1) {
      if (markdown.indexOf(REQUIRED_MARKDOWN_SECTIONS[index]) === -1) {
        missing.push(REQUIRED_MARKDOWN_SECTIONS[index]);
      }
    }

    return missing;
  }

  function hasRequiredSections(markdown) {
    return getMissingMarkdownSections(markdown).length === 0;
  }

  function validateMarkdownOutput(markdown) {
    var missing = getMissingMarkdownSections(markdown);

    if (missing.length > 0) {
      throw new Error(INVALID_OUTPUT_MESSAGE + " Missing: " + missing.join(", "));
    }

    return markdown;
  }

  DA.core.REQUIRED_MARKDOWN_SECTIONS = REQUIRED_MARKDOWN_SECTIONS.slice();
  DA.core.INVALID_OUTPUT_MESSAGE = INVALID_OUTPUT_MESSAGE;
  DA.core.getMissingMarkdownSections = getMissingMarkdownSections;
  DA.core.hasRequiredSections = hasRequiredSections;
  DA.core.validateMarkdownOutput = validateMarkdownOutput;
})(typeof window !== "undefined" ? window : globalThis);

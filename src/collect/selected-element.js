(function initSelectedElementCollector(global) {
  "use strict";

  var DA = global.DA;
  var MAX_TEXT_LENGTH = 140;

  function summarizeSize(rect) {
    if (!rect || typeof rect.width !== "number" || typeof rect.height !== "number") {
      return "Unavailable";
    }

    return Math.round(rect.width) + " x " + Math.round(rect.height) + " px";
  }

  function collectSelectedElement(el, context) {
    var tagName = el.tagName ? el.tagName.toLowerCase() : "element";
    var rect = context.dom.getRect(el, context);
    var visible = context.dom.isVisible(el, context);

    return {
      tagName: tagName,
      role: context.roles.inferRole(el, context.roleContext),
      selector: context.dom.getConciseSelector(el, context),
      textSummary: visible
        ? context.collect.summarizeVisibleText(el, context, MAX_TEXT_LENGTH, "No visible text")
        : "Hidden element",
      sizeSummary: summarizeSize(rect),
      visibility: visible ? "Visible" : "Hidden",
      sourcePath: context.dom.getSourcePath(el, context),
    };
  }

  DA.collect.collectSelectedElement = collectSelectedElement;
})(typeof window !== "undefined" ? window : globalThis);

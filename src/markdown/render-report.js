(function initRenderReport(global) {
  "use strict";

  var DA = global.DA;

  function formatInlineCode(value) {
    return "`" + String(value || "Unavailable").replace(/`/g, "\\`") + "`";
  }

  function formatTreeNodeSummary(node) {
    var parts = [node.role + " (`" + node.tagName + "`)"];

    if (node.sizeSummary && node.sizeSummary !== "Unavailable") {
      parts.push(node.sizeSummary);
    }

    if (node.textSummary && node.textSummary !== "Hidden element") {
      parts.push("text: " + node.textSummary);
    }

    return parts.join(" — ");
  }

  function appendTreeNodeLines(lines, node, depth) {
    var indent = new Array(depth + 1).join("  ");
    var children = node.children || [];
    var index;

    lines.push(indent + "- " + formatTreeNodeSummary(node));

    for (index = 0; index < children.length; index += 1) {
      appendTreeNodeLines(lines, children[index], depth + 1);
    }
  }

  function renderChildElements(childElements) {
    var lines = [];
    var index;

    if (!childElements || childElements.length === 0) {
      return "- No visible child elements found.";
    }

    for (index = 0; index < childElements.length; index += 1) {
      appendTreeNodeLines(lines, childElements[index], 0);
    }

    return lines.join("\n");
  }

  function renderTypographyItem(item) {
    return [
      "- " + item.textSample,
      " — " + item.fontSize,
      " / " + item.lineHeight,
      " / " + item.fontWeight,
      " / color: " + item.color,
      " / selector: " + formatInlineCode(item.selector),
    ].join("");
  }

  function renderTypography(typography) {
    var lines = [];
    var index;

    if (!typography || typography.length === 0) {
      return "- No visible typography found.";
    }

    for (index = 0; index < typography.length; index += 1) {
      lines.push(renderTypographyItem(typography[index]));
    }

    return lines.join("\n");
  }

  function formatRawValue(value) {
    return String(value === null || typeof value === "undefined" || value === "" ? "n/a" : value);
  }

  function formatRawRect(rect) {
    var rawRect = rect || {};

    return [
      "width " + formatRawValue(rawRect.width),
      "height " + formatRawValue(rawRect.height),
      "top " + formatRawValue(rawRect.top),
      "left " + formatRawValue(rawRect.left),
    ].join(" / ");
  }

  function renderRawNotes(notes) {
    var rawNotes = notes && notes.length > 0 ? notes : ["none"];

    return rawNotes.join(", ");
  }

  function renderRawDetails(rawDetails) {
    var details = rawDetails || {};
    var layout = details.layout || {};
    var visual = details.visual || {};
    var typography = details.typography || {};
    var spacing = details.spacing || {};
    var children = details.children || {};

    return [
      "- Tag: `" + formatRawValue(details.tagName) + "`",
      "- Selector: " + formatInlineCode(details.selector || "n/a"),
      "- Source Path: " + formatInlineCode(details.sourcePath || "n/a"),
      "- Visibility: " + formatRawValue(details.visibility),
      "- Raw Rect: " + formatRawRect(details.rect),
      "- Layout: display " + formatRawValue(layout.display) +
        " / position " + formatRawValue(layout.position) +
        " / box sizing " + formatRawValue(layout.boxSizing) +
        " / overflow " + formatRawValue(layout.overflow) +
        " / z-index " + formatRawValue(layout.zIndex),
      "- Visual: opacity " + formatRawValue(visual.opacity) +
        " / background " + formatRawValue(visual.backgroundColor) +
        " / color " + formatRawValue(visual.color),
      "- Typography: " + formatRawValue(typography.fontFamily) +
        " / " + formatRawValue(typography.fontSize) +
        " / " + formatRawValue(typography.lineHeight) +
        " / weight " + formatRawValue(typography.fontWeight),
      "- Spacing: padding " + formatRawValue(spacing.padding) +
        " / margin " + formatRawValue(spacing.margin) +
        " / border width " + formatRawValue(spacing.borderWidth) +
        " / radius " + formatRawValue(spacing.borderRadius),
      "- Gap: gap " + formatRawValue(spacing.gap) +
        " / row " + formatRawValue(spacing.rowGap) +
        " / column " + formatRawValue(spacing.columnGap),
      "- Children: direct " + formatRawValue(children.direct) +
        " / visible " + formatRawValue(children.visible) +
        " / skipped " + formatRawValue(children.skipped),
      "- Notes: " + renderRawNotes(details.notes),
    ].join("\n");
  }

  function renderReport(reportData) {
    var selected = reportData.selectedElement;
    var childElements = reportData.childElements || [];
    var typography = reportData.typography || [];
    var partialFailures = reportData.partialFailures || [];
    var rawDetailsLines = [renderRawDetails(reportData.rawDetails)];

    if (partialFailures.length > 0) {
      rawDetailsLines.push("");
      rawDetailsLines.push("Partial Failures:");
      partialFailures.forEach(function appendFailure(failure) {
        rawDetailsLines.push(
          "- " + failure.stage + ": " + failure.message
        );
      });
    }

    return [
      "## Selected Element",
      "",
      "- Role: " + selected.role,
      "- Tag: `" + selected.tagName + "`",
      "- Selector: " + formatInlineCode(selected.selector),
      "- Text: " + selected.textSummary,
      "- Size: " + selected.sizeSummary,
      "- Visibility: " + selected.visibility,
      "- Source Path: " + formatInlineCode(selected.sourcePath),
      "",
      "## Child Elements — Annotated Structure",
      "",
      renderChildElements(childElements),
      "",
      "## Typography",
      "",
      renderTypography(typography),
      "",
      "<details><summary>Raw Details</summary>",
      "",
      rawDetailsLines.join("\n"),
      "",
      "</details>",
    ].join("\n");
  }

  DA.markdown.renderReport = renderReport;
})(typeof window !== "undefined" ? window : globalThis);

(function initRenderReport(global) {
  "use strict";

  var DA = global.DA;
  var MAX_DISPLAY_TEXT_LENGTH = 140;

  function formatInlineCode(value) {
    return "`" + String(value || "Unavailable").replace(/`/g, "\\`") + "`";
  }

  function escapeTableCell(value) {
    return String(value === null || typeof value === "undefined" || value === "" ? "n/a" : value)
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  }

  function formatCodeTableCell(value) {
    return escapeTableCell(formatInlineCode(value));
  }

  function normalizeDisplayText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function truncateDisplayText(value) {
    var text = normalizeDisplayText(value);

    if (text.length <= MAX_DISPLAY_TEXT_LENGTH) {
      return text;
    }

    return text.slice(0, MAX_DISPLAY_TEXT_LENGTH - 1).trim() + "...";
  }

  function hasSentencePunctuation(value) {
    return /[.!?](?:\s|$)/.test(String(value || ""));
  }

  function matchCommonPhrase(words, index) {
    var twoWordPhrase = words.slice(index, index + 2).join(" ");
    var normalizedPhrase = twoWordPhrase.replace(/\s*[→↗]\s*$/, "");
    var trailingSymbol = twoWordPhrase.match(/\s*([→↗])\s*$/);
    var commonPhrases = {
      "Log in": true,
      "Sign up": true,
      "Get started": true,
      "Learn more": true,
      "AI era": true,
      "Coding Sessions": true,
    };

    if (!commonPhrases[normalizedPhrase]) {
      return null;
    }

    return {
      value: normalizedPhrase + (trailingSymbol ? " " + trailingSymbol[1] : ""),
      length: 2,
    };
  }

  function splitLabelText(value) {
    var text = truncateDisplayText(value);
    var words;
    var parts = [];
    var index;
    var phrase;
    var word;

    if (!text || text.indexOf(" · ") !== -1) {
      return text ? [text] : [];
    }

    if (/^(no visible text|hidden element|unavailable)$/i.test(text)) {
      return [text];
    }

    if (hasSentencePunctuation(text) || /[,;:]/.test(text)) {
      return [text];
    }

    words = text.split(" ");
    index = 0;

    while (index < words.length) {
      phrase = matchCommonPhrase(words, index);

      if (phrase) {
        parts.push(phrase.value);
        index += phrase.length;
        continue;
      }

      word = words[index];

      if (!/^[A-Z0-9][A-Za-z0-9+&'’.-]*(?:[→↗])?$/.test(word)) {
        return [text];
      }

      parts.push(word);
      index += 1;
    }

    return parts.length > 1 ? parts : [text];
  }

  function appendReadableSegments(segments, value) {
    var parts = splitLabelText(value);
    var index;

    for (index = 0; index < parts.length; index += 1) {
      if (parts[index]) {
        segments.push(parts[index]);
      }
    }
  }

  function getReadableText(value, segments) {
    var normalizedSegments = [];
    var index;
    var text = truncateDisplayText(value);

    if (segments && segments.length > 0) {
      for (index = 0; index < segments.length; index += 1) {
        appendReadableSegments(normalizedSegments, segments[index]);
      }

      if (normalizedSegments.length > 1) {
        return truncateDisplayText(normalizedSegments.join(" · "));
      }
    }

    return splitLabelText(text).join(" · ");
  }

  function isUsableTextSummary(value) {
    var text = normalizeDisplayText(value);

    return Boolean(text && text !== "Hidden element" && text !== "No visible text");
  }

  function collectNodeTextSegments(node, segments) {
    var children = node && node.children ? node.children : [];
    var childSegments = [];
    var index;

    if (!node) {
      return;
    }

    if ((node.role === "Link" || node.role === "Button") && isUsableTextSummary(node.textSummary)) {
      for (index = 0; index < children.length; index += 1) {
        collectNodeTextSegments(children[index], childSegments);
      }

      if (childSegments.length > 1) {
        for (index = 0; index < childSegments.length; index += 1) {
          segments.push(childSegments[index]);
        }

        return;
      }

      segments.push(node.textSummary);
      return;
    }

    if (children.length === 0) {
      if (isUsableTextSummary(node.textSummary)) {
        segments.push(node.textSummary);
      }

      return;
    }

    for (index = 0; index < children.length; index += 1) {
      collectNodeTextSegments(children[index], segments);
    }
  }

  function getNodeTextSegments(nodes) {
    var segments = [];
    var index;

    for (index = 0; index < nodes.length; index += 1) {
      collectNodeTextSegments(nodes[index], segments);
    }

    return segments;
  }

  function formatSizeSummary(value) {
    return String(value || "Unavailable")
      .replace(/\s*x\s*/i, "×")
      .replace(/\s*px\b/i, "px");
  }

  function formatElementLabel(role, tagName) {
    return String(role || "Element") + " (" + String(tagName || "element") + ")";
  }

  function renderSelectedElement(selected, childElements) {
    var selectedElement = selected || {};
    var textSegments = getNodeTextSegments(childElements || []);
    var rows = [
      ["Element", formatInlineCode(formatElementLabel(selectedElement.role, selectedElement.tagName))],
      ["Selector", formatInlineCode(selectedElement.selector)],
      ["Text", formatInlineCode(getReadableText(selectedElement.textSummary || "No visible text", textSegments))],
      ["Rendered Size", formatInlineCode(formatSizeSummary(selectedElement.sizeSummary))],
      ["Visibility", formatInlineCode(selectedElement.visibility || "Unavailable")],
      ["Source Path", formatInlineCode(selectedElement.sourcePath || "Unavailable")],
    ];
    var lines = ["| Item | Value |", "|---|---|"];
    var index;

    for (index = 0; index < rows.length; index += 1) {
      lines.push("| " + escapeTableCell(rows[index][0]) + " | " + escapeTableCell(rows[index][1]) + " |");
    }

    return lines.join("\n");
  }

  function appendTreeNodeLines(lines, node, prefix, isLast) {
    var children = node.children || [];
    var childPrefix = prefix + (isLast ? "  " : "│ ");
    var branch = prefix ? prefix + (isLast ? "└ " : "├ ") : "";
    var textSegments = getNodeTextSegments(children);
    var index;

    lines.push(branch + formatElementLabel(node.role, node.tagName));

    if (node.sizeSummary && node.sizeSummary !== "Unavailable") {
      lines.push(childPrefix + "size: " + formatSizeSummary(node.sizeSummary));
    }

    if (node.textSummary && node.textSummary !== "Hidden element") {
      lines.push(childPrefix + "text: " + getReadableText(node.textSummary, textSegments));
    }

    for (index = 0; index < children.length; index += 1) {
      if (index > 0 || node.sizeSummary || node.textSummary) {
        lines.push(childPrefix.replace(/\s+$/g, ""));
      }

      appendTreeNodeLines(lines, children[index], childPrefix, index === children.length - 1);
    }
  }

  function renderChildElements(childElements) {
    var lines = [];
    var index;

    if (!childElements || childElements.length === 0) {
      return "```text\nNo visible child elements found.\n```";
    }

    for (index = 0; index < childElements.length; index += 1) {
      if (index > 0) {
        lines.push("");
      }

      appendTreeNodeLines(lines, childElements[index], "", index === childElements.length - 1);
    }

    return "```text\n" + lines.join("\n") + "\n```";
  }

  function getTypographyGroupKey(item) {
    return [
      item.fontFamily,
      item.fontSize,
      item.lineHeight,
      item.fontWeight,
      item.letterSpacing,
      item.color,
    ].join("|");
  }

  function renderTypographySummary(typography) {
    var groups = {};
    var orderedGroups = [];
    var lines = [
      "### Summary",
      "",
      "| Font | Size | Line Height | Weight | Letter Spacing | Color | Text |",
      "|---|---:|---:|---:|---:|---|---|",
    ];
    var index;
    var item;
    var key;
    var group;

    for (index = 0; index < typography.length; index += 1) {
      item = typography[index];
      key = getTypographyGroupKey(item);

      if (!groups[key]) {
        groups[key] = {
          fontFamily: item.fontFamily,
          fontSize: item.fontSize,
          lineHeight: item.lineHeight,
          fontWeight: item.fontWeight,
          letterSpacing: item.letterSpacing,
          color: item.color,
          text: [],
        };
        orderedGroups.push(groups[key]);
      }

      groups[key].text.push(item.textSample);
    }

    for (index = 0; index < orderedGroups.length; index += 1) {
      group = orderedGroups[index];
      lines.push([
        "| " + escapeTableCell(group.fontFamily),
        escapeTableCell(group.fontSize),
        escapeTableCell(group.lineHeight),
        escapeTableCell(group.fontWeight),
        escapeTableCell(group.letterSpacing),
        escapeTableCell(group.color),
        escapeTableCell(getReadableText(group.text.join(" "), group.text)) + " |",
      ].join(" | "));
    }

    return lines.join("\n");
  }

  function renderTypographyDetails(typography) {
    var lines = ["### Text Details", "", "```text"];
    var index;
    var item;

    for (index = 0; index < typography.length; index += 1) {
      item = typography[index];
      lines.push(
        getReadableText(item.textSample) +
          " — " +
          item.fontSize +
          " / " +
          item.lineHeight +
          " / " +
          item.fontWeight +
          " / " +
          item.color +
          " / selector: " +
          item.selector
      );
    }

    lines.push("```");

    return lines.join("\n");
  }

  function renderTypography(typography) {
    if (!typography || typography.length === 0) {
      return "- No visible typography found.";
    }

    return [
      renderTypographySummary(typography),
      "",
      renderTypographyDetails(typography),
    ].join("\n");
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

  function renderKeyValueTable(rows) {
    var lines = ["| Item | Value |", "|---|---|"];
    var index;

    for (index = 0; index < rows.length; index += 1) {
      lines.push("| " + escapeTableCell(rows[index][0]) + " | " + escapeTableCell(rows[index][1]) + " |");
    }

    return lines.join("\n");
  }

  function renderRawDetails(rawDetails) {
    var details = rawDetails || {};
    var layout = details.layout || {};
    var visual = details.visual || {};
    var typography = details.typography || {};
    var spacing = details.spacing || {};
    var children = details.children || {};

    return [
      "#### Identity",
      "",
      renderKeyValueTable([
        ["Tag", formatCodeTableCell(formatRawValue(details.tagName))],
        ["Selector", formatCodeTableCell(details.selector || "n/a")],
        ["Source Path", formatCodeTableCell(details.sourcePath || "n/a")],
        ["Visibility", formatRawValue(details.visibility)],
      ]),
      "",
      "#### Raw Rect",
      "",
      renderKeyValueTable([
        ["Rect", formatRawRect(details.rect)],
      ]),
      "",
      "#### Layout:",
      "",
      renderKeyValueTable([
        ["Display", formatRawValue(layout.display)],
        ["Position", formatRawValue(layout.position)],
        ["Box Sizing", formatRawValue(layout.boxSizing)],
        ["Overflow", formatRawValue(layout.overflow)],
        ["Z Index", formatRawValue(layout.zIndex)],
      ]),
      "",
      "#### Visual:",
      "",
      renderKeyValueTable([
        ["Opacity", formatRawValue(visual.opacity)],
        ["Background", formatRawValue(visual.backgroundColor)],
        ["Color", formatRawValue(visual.color)],
      ]),
      "",
      "#### Typography:",
      "",
      renderKeyValueTable([
        ["Font Family", formatRawValue(typography.fontFamily)],
        ["Font Size", formatRawValue(typography.fontSize)],
        ["Line Height", formatRawValue(typography.lineHeight)],
        ["Weight", formatRawValue(typography.fontWeight)],
      ]),
      "",
      "#### Spacing:",
      "",
      renderKeyValueTable([
        ["Padding", formatRawValue(spacing.padding)],
        ["Margin", formatRawValue(spacing.margin)],
        ["Border Width", formatRawValue(spacing.borderWidth)],
        ["Radius", formatRawValue(spacing.borderRadius)],
        ["Gap", formatRawValue(spacing.gap)],
        ["Row Gap", formatRawValue(spacing.rowGap)],
        ["Column Gap", formatRawValue(spacing.columnGap)],
      ]),
      "",
      "#### Children:",
      "",
      renderKeyValueTable([
        ["Direct", formatRawValue(children.direct)],
        ["Visible", formatRawValue(children.visible)],
        ["Skipped", formatRawValue(children.skipped)],
      ]),
      "",
      "#### Notes",
      "",
      renderKeyValueTable([
        ["Notes", renderRawNotes(details.notes)],
      ]),
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
      renderSelectedElement(selected, childElements),
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

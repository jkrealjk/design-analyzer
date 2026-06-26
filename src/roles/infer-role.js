(function initInferRole(global) {
  "use strict";

  var DA = global.DA;

  function getAttributeValue(el, name) {
    return el && typeof el.getAttribute === "function" ? el.getAttribute(name) || "" : "";
  }

  function getEvidenceText(el) {
    var parent = el && el.parentElement ? el.parentElement : null;

    return [
      el && el.id ? el.id : "",
      el && typeof el.className === "string" ? el.className : "",
      getAttributeValue(el, "aria-label"),
      getAttributeValue(el, "title"),
      getAttributeValue(el, "href"),
      parent && parent.id ? parent.id : "",
      parent && typeof parent.className === "string" ? parent.className : "",
    ].join(" ");
  }

  function hasToken(value, pattern) {
    return pattern.test(String(value || ""));
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function appendVisibleText(el, context, state) {
    var nodes;
    var index;
    var node;

    if (
      !el ||
      state.length >= state.maxLength ||
      (context && context.dom && !context.dom.isVisible(el, context))
    ) {
      return;
    }

    nodes = el.childNodes || [];

    for (index = 0; index < nodes.length; index += 1) {
      if (state.length >= state.maxLength) {
        return;
      }

      node = nodes[index];

      if (!node) {
        continue;
      }

      if (node.nodeType === 3) {
        state.parts.push(node.nodeValue);
        state.length += String(node.nodeValue || "").length;
      }

      if (node.nodeType === 1) {
        appendVisibleText(node, context, state);
      }
    }
  }

  function getVisibleTextEvidence(el, context) {
    var state = {
      parts: [],
      length: 0,
      maxLength: 120,
    };

    appendVisibleText(el, context, state);

    return normalizeText(state.parts.join(" "));
  }

  function hasMainNavText(value) {
    return hasToken(value, /\bProduct\b/i) &&
      hasToken(value, /\bResources\b/i) &&
      hasToken(value, /\b(Customers|Pricing|Now|Contact)\b/i);
  }

  function hasMostlyActionText(value) {
    var text = normalizeText(value);

    if (!text || hasMainNavText(text)) {
      return false;
    }

    return hasToken(text, /\b(Log in|Sign up|Get started|Contact sales|Book demo)\b/i);
  }

  function isActionEvidence(value) {
    return hasToken(value, /buttons?|actions?|cta|button[-_\s]?items?|buttonItem/i);
  }

  function isNavigationEvidence(value) {
    return hasToken(value, /nav[-_\s]?items|navigation|nav[-_\s]?group|site navigation/i);
  }

  function isLogoEvidence(value) {
    return hasToken(value, /(^|[-_\s])(logo|brand|home)($|[-_\s])/i);
  }

  function inferRole(el, context) {
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";
    var evidence = getEvidenceText(el);
    var ariaLabel = getAttributeValue(el, "aria-label");
    var visibleText = "";
    var groupEvidence;

    if (tag === "a" && (isLogoEvidence(evidence) || hasToken(ariaLabel, /home/i))) {
      return "Logo Link";
    }

    if (tag === "svg" && (isLogoEvidence(evidence) || hasToken(ariaLabel, /linear|logo|brand|home/i))) {
      return "Logo";
    }

    if (tag === "svg" && (ariaLabel || getAttributeValue(el, "title"))) {
      return "Icon";
    }

    if (tag === "header") {
      return "Header";
    }

    if (tag === "nav") {
      return "Navigation";
    }

    if (tag === "main") {
      return "Main";
    }

    if (tag === "footer") {
      return "Footer";
    }

    if (tag === "section") {
      return "Section";
    }

    if (tag === "form") {
      return "Form";
    }

    if (tag === "ul" || tag === "ol" || tag === "div") {
      visibleText = getVisibleTextEvidence(el, context);
      groupEvidence = evidence + " " + visibleText;

      if (!hasMainNavText(visibleText) && isActionEvidence(groupEvidence)) {
        return "Action Group";
      }

      if ((tag === "ul" || tag === "ol") && hasMostlyActionText(visibleText)) {
        return "Action Group";
      }
    }

    if ((tag === "ul" || tag === "ol") && isNavigationEvidence(evidence + " " + ariaLabel)) {
      return "Navigation List";
    }

    if (tag === "ul" || tag === "ol") {
      return "List";
    }

    if (tag === "li") {
      return "List Item";
    }

    if (tag === "button") {
      return "Button";
    }

    if (tag === "a") {
      return "Link";
    }

    if (tag === "img" || tag === "picture" || tag === "video" || tag === "canvas" || tag === "svg") {
      return "Asset";
    }

    if (tag === "input" || tag === "select" || tag === "textarea") {
      return "Field";
    }

    if (tag === "div" || tag === "span") {
      if (isNavigationEvidence(evidence)) {
        return "Nav Group";
      }

      if (isActionEvidence(evidence)) {
        return "Action Group";
      }
    }

    if (tag === "h1") {
      return "Heading 1";
    }

    if (tag === "h2") {
      return "Heading 2";
    }

    if (tag === "h3") {
      return "Heading 3";
    }

    if (tag === "h4") {
      return "Heading 4";
    }

    if (tag === "h5") {
      return "Heading 5";
    }

    if (tag === "h6") {
      return "Heading 6";
    }

    if (tag === "p") {
      return "Paragraph";
    }

    if (tag === "span") {
      return "Text";
    }

    return "Element";
  }

  DA.roles.inferRole = inferRole;
})(typeof window !== "undefined" ? window : globalThis);

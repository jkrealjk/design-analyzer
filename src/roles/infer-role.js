(function initInferRole(global) {
  "use strict";

  var DA = global.DA;

  function inferRole(el, context) {
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";

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

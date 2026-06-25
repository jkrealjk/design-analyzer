(function initNamespace(global) {
  "use strict";

  if (!global) {
    return;
  }

  var DA = global.DA || {};

  DA.core = DA.core || {};
  DA.dom = DA.dom || {};
  DA.collect = DA.collect || {};
  DA.roles = DA.roles || {};
  DA.formatters = DA.formatters || {};
  DA.markdown = DA.markdown || {};

  global.DA = DA;
})(typeof window !== "undefined" ? window : globalThis);

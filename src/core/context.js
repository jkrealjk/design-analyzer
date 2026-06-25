(function initContext(global) {
  "use strict";

  var DA = global.DA;

  function freeze(value) {
    return typeof Object.freeze === "function" ? Object.freeze(value) : value;
  }

  function copyRegistry(registry) {
    var copy = {};
    var key;

    if (!registry) {
      return freeze(copy);
    }

    for (key in registry) {
      if (Object.prototype.hasOwnProperty.call(registry, key)) {
        copy[key] = registry[key];
      }
    }

    return freeze(copy);
  }

  function createElementCache() {
    return freeze({
      style: new WeakMap(),
      rect: new WeakMap(),
      visibility: new WeakMap(),
      selector: new WeakMap(),
      conciseSelector: new WeakMap(),
      sourcePath: new WeakMap(),
    });
  }

  function createExecutionCache() {
    return freeze({
      elements: createElementCache(),
      values: new Map(),
    });
  }

  function createRoleContext(root, options, cache, dom) {
    return freeze({
      root: root,
      options: options,
      cache: cache,
      dom: dom,
    });
  }

  /**
   * Creates one read-only context per analysis run.
   * Cache contents may be updated by helper modules, but the context object is not replaced.
   */
  function createAnalyzerContext(root, options) {
    var contextOptions = freeze({
      hasExplicitRoot: Boolean(options && options.hasExplicitRoot),
    });
    var contextCache = createExecutionCache();
    var contextDom = copyRegistry(DA.dom);

    return freeze({
      root: root,
      options: contextOptions,
      limits: freeze({
        maxDepth: 12,
        maxChildren: 80,
      }),
      cache: contextCache,
      dom: contextDom,
      collect: copyRegistry(DA.collect),
      roles: copyRegistry(DA.roles),
      formatters: copyRegistry(DA.formatters),
      markdown: copyRegistry(DA.markdown),
      roleContext: createRoleContext(root, contextOptions, contextCache, contextDom),
    });
  }

  DA.core.createAnalyzerContext = createAnalyzerContext;
  DA.core.createExecutionCache = createExecutionCache;
})(typeof window !== "undefined" ? window : globalThis);

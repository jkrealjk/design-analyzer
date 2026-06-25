function analyzeSelectedElementReadable(root = $0) {
  const config = {
    maxNodes: 180,
    maxDepth: 8,
    minWidth: 2,
    minHeight: 2,

    printToConsole: true,
    copyToClipboard: false,
    showCopyButton: true,

    stopAtClickTarget: true,
    stopAtMedia: true,
    includeSvgAssetSummary: true,
    includeDirectClickTargetSummary: true,

    includeSelectedElement: true,
    includeAnnotatedStructure: true,

    includeTypographySection: true,
    includeTypographySummary: true,
    includeTypographyTextDetails: true,

    includeRawDetails: true,
    includeChildBoxLayoutValues: true,
    includeRawTextTypography: false,

    hideDecorativeSvgInAnnotatedStructure: true,
    hideOverlayMenuTriggersInAnnotatedStructure: true,
    hideEmptyChildSections: true,
  };

  if (!root || !(root instanceof Element)) {
    console.warn("분석할 요소가 없습니다. Elements 패널에서 요소를 선택한 뒤 다시 실행하세요.");
    return {
      message: "No element selected",
    };
  }

  const SKIP_TAGS = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "defs",
    "clippath",
    "mask",
    "lineargradient",
    "radialgradient",
    "metadata",
  ]);

  const IMPORTANT_TAGS = new Set([
    "header",
    "main",
    "section",
    "nav",
    "ul",
    "ol",
    "li",
    "a",
    "button",
    "img",
    "picture",
    "svg",
    "canvas",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "label",
    "div",
  ]);

  const px = (value) => Number.parseFloat(value) || 0;

  const pxNumber = (value) => {
    if (typeof value === "number") return value;
    return Number.parseFloat(String(value).replace("px", "")) || 0;
  };

  const fmtPx = (value) => {
    const n = pxNumber(value);

    if (!Number.isFinite(n)) return "-";
    if (Number.isInteger(n)) return `${n}px`;

    return `${n.toFixed(2).replace(/\.?0+$/, "")}px`;
  };

  const fmtSize = (width, height) => {
    return `${fmtPx(width)} × ${fmtPx(height)}`;
  };

  const normalizeText = (text) => {
    return String(text || "").replace(/\s+/g, " ").trim();
  };

  const escapeMd = (value) => {
    return String(value ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  };

  const truncateText = (value, max = 140) => {
    const text = normalizeText(value);

    if (!text) return "";
    if (text.length <= max) return text;

    return `${text.slice(0, max)}…`;
  };

  const isTransparent = (color) => {
    return (
      !color ||
      color === "transparent" ||
      color === "rgba(0, 0, 0, 0)" ||
      color === "rgba(0,0,0,0)"
    );
  };

  const toHexPair = (value) => {
    const n = Math.max(0, Math.min(255, Number.parseInt(value, 10) || 0));
    return n.toString(16).padStart(2, "0").toUpperCase();
  };

  const rgbToHex = (value) => {
    const text = String(value || "").trim();

    const match = text.match(
      /^rgb\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i
    );

    if (!match) return null;

    return `#${toHexPair(match[1])}${toHexPair(match[2])}${toHexPair(match[3])}`;
  };

  const parseColorToRgb = (value) => {
    const text = String(value || "").trim();

    if (!text || text === "none" || text === "transparent") {
      return null;
    }

    const rgbMatch = text.match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
    );

    if (rgbMatch) {
      const alpha = rgbMatch[4] === undefined ? 1 : Number.parseFloat(rgbMatch[4]);

      if (alpha === 0) return null;

      return {
        r: Number.parseFloat(rgbMatch[1]),
        g: Number.parseFloat(rgbMatch[2]),
        b: Number.parseFloat(rgbMatch[3]),
        a: alpha,
      };
    }

    const hexMatch = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

    if (hexMatch) {
      let hex = hexMatch[1];

      if (hex.length === 3) {
        hex = hex.split("").map((char) => char + char).join("");
      }

      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }

    return null;
  };

  const getRelativeLuminance = (rgb) => {
    if (!rgb) return null;

    const toLinear = (channel) => {
      const value = channel / 255;

      if (value <= 0.03928) {
        return value / 12.92;
      }

      return Math.pow((value + 0.055) / 1.055, 2.4);
    };

    const r = toLinear(rgb.r);
    const g = toLinear(rgb.g);
    const b = toLinear(rgb.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const isDarkColor = (color) => {
    const rgb = parseColorToRgb(color);
    const luminance = getRelativeLuminance(rgb);

    if (luminance === null) return false;

    return luminance < 0.32;
  };

  const isLightColor = (color) => {
    const rgb = parseColorToRgb(color);
    const luminance = getRelativeLuminance(rgb);

    if (luminance === null) return false;

    return luminance > 0.82;
  };

  const hasNonTransparentColor = (color) => {
    return Boolean(parseColorToRgb(color));
  };

  const formatColorValue = (value) => {
    if (!value) return "none";
    if (value === "none") return "none";
    if (value === "0px") return "none";
    if (isTransparent(value)) return "none";

    const hex = rgbToHex(value);

    if (hex) return hex;

    return value;
  };

  const formatShadowValue = (value) => {
    if (!value) return "none";
    if (value === "none") return "none";
    if (value === "0px") return "none";
    if (isTransparent(value)) return "none";

    return value;
  };

  const getClassText = (el) => {
    return typeof el.className === "string"
      ? el.className
      : el.getAttribute("class") || "";
  };

  const getElementSelector = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";

    const classes = getClassText(el)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => `.${name}`)
      .join("");

    return `${tag}${id}${classes}`;
  };

  const getDirectText = (el) => {
    return normalizeText(
      Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.nodeValue)
        .join(" ")
    );
  };

  const isClickTarget = (el) => {
    const tag = el.tagName.toLowerCase();

    return (
      tag === "a" ||
      tag === "button" ||
      el.getAttribute("role") === "button"
    );
  };

  const isTextLike = (el) => {
    const tag = el.tagName.toLowerCase();

    return [
      "a",
      "button",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "label",
    ].includes(tag);
  };

  const isMediaElement = (el) => {
    const tag = el.tagName.toLowerCase();

    return tag === "svg" || tag === "img" || tag === "picture" || tag === "canvas";
  };

  const isDisplayContentsElement = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);

    return cs.display === "contents";
  };

  const isPopoverOpen = (el) => {
    if (!el || !el.hasAttribute("popover")) return false;

    try {
      return el.matches(":popover-open");
    } catch {
      return el.matches("[popover][open]");
    }
  };

  const isElementHiddenForAnalysis = (el) => {
    if (!el || !(el instanceof Element)) return true;

    let current = el;

    while (current && current !== document.documentElement) {
      if (current !== root) {
        if (current.hasAttribute("hidden")) return true;
        if (current.hasAttribute("inert")) return true;
        if (current.getAttribute("aria-hidden") === "true") return true;

        if (current.hasAttribute("popover") && !isPopoverOpen(current)) {
          return true;
        }

        const role = current.getAttribute("role");
        const ariaHidden = current.getAttribute("aria-hidden");

        if ((role === "dialog" || role === "menu") && ariaHidden === "true") {
          return true;
        }
      }

      const cs = getComputedStyle(current);

      if (cs.display === "none") return true;
      if (cs.visibility === "hidden") return true;
      if (Number.parseFloat(cs.opacity) === 0) return true;

      current = current.parentElement;
    }

    return false;
  };

  const isTextNodeVisibleForAnalysis = (node) => {
    const parent = node.parentElement;
    if (!parent) return false;

    if (isElementHiddenForAnalysis(parent)) return false;

    const text = normalizeText(node.nodeValue);
    if (!text) return false;

    return true;
  };

  const getVisibleTextOnly = (el) => {
    if (!el || !(el instanceof Element)) return "";

    const texts = [];

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!isTextNodeVisibleForAnalysis(node)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      const text = normalizeText(walker.currentNode.nodeValue);
      if (text) texts.push(text);
    }

    const uniqueTexts = [];

    for (const text of texts) {
      if (!uniqueTexts.includes(text)) {
        uniqueTexts.push(text);
      }
    }

    return uniqueTexts.join(" ").slice(0, 160);
  };

  const getVisibleText = (el) => {
    if (!el || !(el instanceof Element)) return "";

    if (isElementHiddenForAnalysis(el)) return "";

    const aria = normalizeText(el.getAttribute("aria-label"));
    const title = normalizeText(el.getAttribute("title"));

    if (aria) return aria.slice(0, 160);
    if (title) return title.slice(0, 160);

    return getVisibleTextOnly(el);
  };

  const getReportTextField = (data) => {
    const visibleText = truncateText(getVisibleTextOnly(data.el), 140);
    const ariaLabel = truncateText(data.el.getAttribute("aria-label"), 140);
    const title = truncateText(data.el.getAttribute("title"), 140);
    const fallback = truncateText(data.text, 140);

    if (visibleText) {
      return {
        label: "text",
        value: escapeMd(visibleText),
      };
    }

    if (ariaLabel) {
      return {
        label: "label",
        value: escapeMd(ariaLabel),
      };
    }

    if (title) {
      return {
        label: "title",
        value: escapeMd(title),
      };
    }

    if (fallback) {
      return {
        label: "text",
        value: escapeMd(fallback),
      };
    }

    return {
      label: "text",
      value: "none",
    };
  };

  const getMetaText = (el) => {
    const tag = el.tagName?.toLowerCase();
    const isInteractive =
      tag === "a" || tag === "button" || el.getAttribute("role") === "button";

    return [
      tag,
      el.id,
      getClassText(el),
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("role"),
      el.getAttribute("href"),
      el.getAttribute("type"),
      el.getAttribute("data-state"),
      el.getAttribute("data-show"),
      el.getAttribute("data-hide"),
      el.getAttribute("data-nav-id"),
      el.getAttribute("data-cdp-scope"),
      el.getAttribute("data-globalnav-item-name"),
      el.getAttribute("data-analytics-title"),
      el.getAttribute("data-topnav-flyout-label"),
      el.getAttribute("data-topnav-flyout-trigger-regular"),
      el.getAttribute("data-topnav-flyout-trigger-compact"),
      getDirectText(el),
      isInteractive ? getVisibleText(el) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  const getInteractiveLabelForIntent = (el) => {
    if (!el || !(el instanceof Element)) return "";

    return [
      getVisibleTextOnly(el),
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("href"),
      getClassText(el),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  const isAuthOrCTAIntent = (value) => {
    const text = String(value || "").toLowerCase();

    return (
      text.includes("log in") ||
      text.includes("login") ||
      text.includes("sign in") ||
      text.includes("signin") ||
      text.includes("sign up") ||
      text.includes("signup") ||
      text.includes("get started") ||
      text.includes("start free") ||
      text.includes("contact sales") ||
      text.includes("book a demo") ||
      text.includes("get a demo") ||
      text.includes("download")
    );
  };

  const isPrimaryCTAIntent = (value) => {
    const text = String(value || "").toLowerCase();

    return (
      text.includes("sign up") ||
      text.includes("signup") ||
      text.includes("get started") ||
      text.includes("start free") ||
      text.includes("contact sales") ||
      text.includes("book a demo") ||
      text.includes("download")
    );
  };

  const isSecondaryCTAIntent = (value) => {
    const text = String(value || "").toLowerCase();

    return (
      text.includes("log in") ||
      text.includes("login") ||
      text.includes("sign in") ||
      text.includes("signin") ||
      text.includes("get a demo") ||
      text.includes("demo")
    );
  };

  const isMenuTrigger = (el) => {
    const tag = el.tagName.toLowerCase();
    const meta = getMetaText(el);

    if (tag !== "button") return false;

    return (
      el.hasAttribute("aria-expanded") ||
      el.hasAttribute("aria-controls") ||
      el.hasAttribute("aria-haspopup") ||
      meta.includes("trigger") ||
      meta.includes("menu trigger") ||
      meta.includes("mobilemenutrigger") ||
      meta.includes("mobile-menu-trigger")
    );
  };

  const isMobileMenuTrigger = (el) => {
    const meta = getMetaText(el);

    return (
      meta.includes("mobile") ||
      el.getAttribute("aria-haspopup") === "dialog" ||
      normalizeText(el.getAttribute("aria-label")).toLowerCase().includes("open menu")
    );
  };

  const getUtilityLabel = (el) => {
    const label = [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      getVisibleTextOnly(el),
      getClassText(el),
      el.getAttribute("href"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (label.includes("search")) return "Search";
    if (label.includes("shopping bag")) return "Shopping Bag";
    if (label.includes("bag")) return "Shopping Bag";
    if (label.includes("cart")) return "Cart";
    if (label.includes("account")) return "Account";
    if (label.includes("profile")) return "Profile";

    const aria = normalizeText(el.getAttribute("aria-label"));
    const title = normalizeText(el.getAttribute("title"));

    return aria || title || "";
  };

  const isUtilityIconControl = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (!isClickTarget(el)) return false;
    if (!isInHeader(el) && !el.closest("nav")) return false;

    const label = [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      getClassText(el),
      el.getAttribute("href"),
      el.getAttribute("data-analytics-title"),
      el.getAttribute("data-globalnav-item-name"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const visibleText = normalizeText(getVisibleTextOnly(el));

    const isSearch =
      label.includes("search") ||
      label.includes("globalnav-link-search");

    const isBag =
      label.includes("shopping bag") ||
      label.includes("globalnav-bag") ||
      label.includes("globalnav-link-bag") ||
      label.includes("/bag") ||
      label.includes("bag");

    const isCart =
      label.includes("cart") ||
      label.includes("/cart");

    const isAccount =
      label.includes("account") ||
      label.includes("profile");

    const looksLikeUtility = isSearch || isBag || isCart || isAccount;

    if (!looksLikeUtility) return false;

    if (visibleText && visibleText.length > 24) return false;

    if (label.includes("menu") && !isSearch && !isBag && !isCart && !isAccount) {
      return false;
    }

    return true;
  };

  const isOverlayMenuTrigger = (el, dataLike = null) => {
    if (!el || !(el instanceof Element)) return false;

    const tag = el.tagName.toLowerCase();
    if (tag !== "button") return false;
    if (!isMenuTrigger(el)) return false;

    const cs = dataLike?.layout ? null : getComputedStyle(el);

    const position = dataLike?.layout?.position || cs?.position || "";
    const meta = getMetaText(el);
    const classText = getClassText(el).toLowerCase();
    const ariaLabel = normalizeText(el.getAttribute("aria-label")).toLowerCase();
    const visibleText = normalizeText(getVisibleTextOnly(el));

    const appleStyleSubmenuTrigger =
      classText.includes("globalnav-submenu-trigger-button") ||
      el.hasAttribute("data-topnav-flyout-trigger-regular") ||
      meta.includes("topnav-flyout-trigger-regular");

    const isMenuLabelOnly =
      !visibleText &&
      Boolean(ariaLabel) &&
      ariaLabel.endsWith(" menu");

    const isAbsoluteLayer = position === "absolute";

    return appleStyleSubmenuTrigger || (isAbsoluteLayer && isMenuLabelOnly);
  };

  const hasSiblingOverlayMenuTrigger = (data) => {
    if (!data || !data.el) return false;
    if (!isClickTarget(data.el)) return false;

    const role = data.role || "";

    if (role.includes("Logo")) return false;
    if (role.includes("Utility Icon")) return false;
    if (role.includes("CTA")) return false;
    if (role.includes("Action")) return false;

    if (!(role === "Nav Link" || role.includes("Nav Link"))) {
      return false;
    }

    const triggerGroup = data.el.closest("ul.globalnav-submenu-trigger-group");

    if (!triggerGroup || !(triggerGroup instanceof Element)) {
      return false;
    }

    const directButtons = Array.from(triggerGroup.children)
      .flatMap((child) => {
        if (!(child instanceof Element)) return [];
        return Array.from(child.children).filter((grandchild) => {
          return grandchild instanceof Element && grandchild.tagName.toLowerCase() === "button";
        });
      });

    return directButtons.some((button) => {
      return button !== data.el && isOverlayMenuTrigger(button);
    });
  };

  const isPrimaryCTATextOrClass = (meta) => {
    return (
      meta.includes("sign up") ||
      meta.includes("signup") ||
      meta.includes("get started") ||
      meta.includes("start free") ||
      meta.includes("contact sales") ||
      meta.includes("book a demo") ||
      meta.includes("download") ||
      meta.includes("variant-invert") ||
      meta.includes("variant-primary") ||
      meta.includes("button--primary") ||
      meta.includes("primary-cta")
    );
  };

  const isSecondaryCTATextOrClass = (meta) => {
    return (
      meta.includes("get a demo") ||
      meta.includes("demo") ||
      meta.includes("sign in") ||
      meta.includes("signin") ||
      meta.includes("log in") ||
      meta.includes("login") ||
      meta.includes("variant-secondary") ||
      meta.includes("button--secondary") ||
      meta.includes("secondary-cta") ||
      meta.includes("secondary-on")
    );
  };

  const hasUsableRect = (rect) => {
    return rect && rect.width >= config.minWidth && rect.height >= config.minHeight;
  };

  const getRawRect = (el) => {
    return el.getBoundingClientRect();
  };

  const getMeasurementRect = (el) => {
    const rect = getRawRect(el);

    if (hasUsableRect(rect)) {
      return rect;
    }

    if (!isClickTarget(el)) {
      return rect;
    }

    let parent = el.parentElement;

    while (parent && parent !== document.documentElement) {
      if (isElementHiddenForAnalysis(parent)) {
        parent = parent.parentElement;
        continue;
      }

      const parentRect = getRawRect(parent);

      if (hasUsableRect(parentRect)) {
        return parentRect;
      }

      parent = parent.parentElement;
    }

    return rect;
  };

  const hasVisibleMediaDescendant = (el) => {
    if (!el || !(el instanceof Element)) return false;

    const mediaChildren = Array.from(el.querySelectorAll("svg, img, picture, canvas"));

    return mediaChildren.some((media) => {
      if (!(media instanceof Element)) return false;
      if (isElementHiddenForAnalysis(media)) return false;

      const rect = getRawRect(media);

      return hasUsableRect(rect);
    });
  };

  const isDecorativeSvgElement = (el, dataLike = null) => {
    if (!el || el.tagName.toLowerCase() !== "svg") return false;

    const meta = getMetaText(el);
    const rect = dataLike?.rendered || getMeasurementRect(el);
    const position = dataLike?.layout?.position || getComputedStyle(el).position;

    const hasDecorativeName =
      meta.includes("mask") ||
      meta.includes("overlay") ||
      meta.includes("background") ||
      meta.includes("decor") ||
      meta.includes("decoration") ||
      meta.includes("blob") ||
      meta.includes("glow") ||
      meta.includes("shape");

    if (hasDecorativeName) return true;

    const closestClickTarget = el.closest("a, button, [role='button']");
    const clickTargetText = closestClickTarget
      ? normalizeText(getVisibleTextOnly(closestClickTarget))
      : "";

    const isLargeAbsoluteSvg =
      position === "absolute" &&
      Boolean(clickTargetText) &&
      (rect.width > 32 || rect.height > 32);

    return isLargeAbsoluteSvg;
  };

  const isHeaderLikeElement = (el) => {
    if (!el || !(el instanceof Element)) return false;

    const tag = el.tagName.toLowerCase();

    if (tag === "header") return true;
    if (tag === "nav" && el.id === "globalnav") return true;

    const meta = getMetaText(el);
    const cs = getComputedStyle(el);
    const rect = getMeasurementRect(el);

    const hasHeaderLikeMeta =
      meta.includes("navbar") ||
      meta.includes("globalnav") ||
      meta.includes("topnav") ||
      meta.includes("site-header") ||
      meta.includes("siteheader") ||
      meta.includes("marketing-header") ||
      meta.includes("header");

    if (!hasHeaderLikeMeta) return false;

    const isTopLayer =
      cs.position === "fixed" ||
      cs.position === "sticky" ||
      rect.top <= 160;

    const reasonableHeaderHeight =
      rect.height > 0 &&
      rect.height <= 180;

    return isTopLayer && reasonableHeaderHeight;
  };

  const isInHeader = (el) => {
    if (!el || !(el instanceof Element)) return false;

    if (el.closest("header") || el.closest("nav#globalnav")) return true;

    let current = el;

    while (current && current !== document.documentElement) {
      if (isHeaderLikeElement(current)) return true;
      current = current.parentElement;
    }

    return false;
  };

  const hasLogoLikeMeta = (el) => {
    if (!el || !(el instanceof Element)) return false;

    const meta = getMetaText(el);

    return (
      meta.includes("logo") ||
      meta.includes("brand") ||
      meta.includes("wordmark") ||
      meta.includes("logocontainer") ||
      meta.includes("logo-container") ||
      meta.includes("logo container")
    );
  };

  const hasLogoLikeAncestor = (el) => {
    if (!el || !(el instanceof Element)) return false;

    let current = el;

    while (current && current !== document.documentElement) {
      if (hasLogoLikeMeta(current)) return true;
      if (isHeaderLikeElement(current) && current !== el) break;
      current = current.parentElement;
    }

    return false;
  };

  const isClearlyInsideActionMetaArea = (el) => {
    if (!el || !(el instanceof Element)) return false;

    let current = el.parentElement;

    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();

      if (tag === "header" || tag === "nav") break;

      const meta = [
        current.id,
        getClassText(current),
        current.getAttribute("aria-label"),
        current.getAttribute("role"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (
        meta.includes("action") ||
        meta.includes("actions") ||
        meta.includes("button") ||
        meta.includes("buttons") ||
        meta.includes("secondary") ||
        meta.includes("signedout") ||
        meta.includes("signed-out") ||
        meta.includes("auth") ||
        meta.includes("cta")
      ) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  };

  const isLogoLikeWithoutDeepRoleCheck = (el) => {
    if (!el || !(el instanceof Element)) return false;

    const tag = el.tagName.toLowerCase();
    if (tag !== "a") return false;

    const href = normalizeText(el.getAttribute("href"));

    const meta = [
      tag,
      el.id,
      getClassText(el),
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("href"),
      getDirectText(el),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const hasLogoAsset = Boolean(el.querySelector("svg, img, picture"));

    const isRootHref =
      href === "/" ||
      href === "./" ||
      href === "/home" ||
      href === window.location.origin ||
      href === `${window.location.origin}/`;

    return (
      hasLogoAsset &&
      isRootHref &&
      (
        meta.includes("logo") ||
        meta.includes("brand") ||
        meta.includes("wordmark") ||
        meta.includes("home") ||
        meta.includes("homepage") ||
        meta.includes("raycast") ||
        meta.includes("linear") ||
        meta.includes("stripe") ||
        meta.includes("vercel")
      )
    );
  };

  const isActionLikeMeta = (meta) => {
    return (
      meta.includes("actions") ||
      meta.includes("action") ||
      meta.includes("buttons") ||
      meta.includes("button") ||
      meta.includes("secondary") ||
      meta.includes("signedout") ||
      meta.includes("signed-out") ||
      meta.includes("auth") ||
      meta.includes("login") ||
      meta.includes("download") ||
      meta.includes("cta")
    );
  };

  const isNavigationLikeMeta = (meta) => {
    return (
      meta.includes("navigation") ||
      meta.includes("navlinks") ||
      meta.includes("nav-links") ||
      meta.includes("nav_links") ||
      meta.includes("navlist") ||
      meta.includes("nav-list") ||
      meta.includes("nav_list") ||
      meta.includes("mainnav") ||
      meta.includes("main-nav") ||
      meta.includes("menu")
    );
  };

  const isLogoLinkCandidate = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (el.tagName.toLowerCase() !== "a") return false;

    const classText = getClassText(el).toLowerCase();
    const meta = getMetaText(el);
    const href = normalizeText(el.getAttribute("href"));
    const ariaLabel = normalizeText(el.getAttribute("aria-label")).toLowerCase();
    const titleLabel = normalizeText(el.getAttribute("title")).toLowerCase();
    const visibleText = normalizeText(getVisibleTextOnly(el)).toLowerCase();
    const directText = normalizeText(getDirectText(el)).toLowerCase();
    const dataName = normalizeText(el.getAttribute("data-globalnav-item-name")).toLowerCase();
    const analyticsTitle = normalizeText(el.getAttribute("data-analytics-title")).toLowerCase();

    const text = visibleText || directText || ariaLabel || titleLabel;

    const isRootHref =
      href === "/" ||
      href === "./" ||
      href === "/home" ||
      href === window.location.origin ||
      href === `${window.location.origin}/`;

    const knownBrandNames = new Set([
      "apple",
      "stripe",
      "vercel",
      "linear",
      "github",
      "figma",
      "webflow",
      "framer",
      "notion",
      "raycast",
    ]);

    const explicitLogoClass =
      classText.includes("logo") ||
      classText.includes("brand") ||
      classText.includes("wordmark") ||
      classText.includes("globalnav-link-apple") ||
      classText.includes("marketing-header-logo");

    const explicitHomepageLogo =
      ariaLabel.includes("homepage") ||
      ariaLabel.includes("home page") ||
      ariaLabel.includes("navigate to home") ||
      ariaLabel.includes("go home") ||
      ariaLabel.includes("stripe homepage");

    const appleLogo =
      dataName === "apple" ||
      analyticsTitle === "apple home" ||
      classText.includes("globalnav-link-apple");

    const brandRootLink =
      isRootHref &&
      (
        knownBrandNames.has(text) ||
        knownBrandNames.has(ariaLabel) ||
        knownBrandNames.has(titleLabel) ||
        knownBrandNames.has(dataName)
      );

    const classBasedBrandLogo =
      explicitLogoClass &&
      (
        knownBrandNames.has(text) ||
        knownBrandNames.has(ariaLabel) ||
        knownBrandNames.has(titleLabel) ||
        knownBrandNames.has(dataName) ||
        explicitHomepageLogo
      );

    const homepageLogo =
      explicitHomepageLogo &&
      (
        isRootHref ||
        knownBrandNames.has(text) ||
        knownBrandNames.has(ariaLabel) ||
        knownBrandNames.has(titleLabel) ||
        meta.includes("homepage")
      );

    const hasLogoAssetInside = Boolean(el.querySelector("svg, img, picture"));

    const visibleTextIsEmptyOrBrand =
      !visibleText ||
      knownBrandNames.has(visibleText);

    const brandLabelWithAssetInHeader =
      isInHeader(el) &&
      hasLogoAssetInside &&
      visibleTextIsEmptyOrBrand &&
      !isUtilityIconControl(el) &&
      !isClearlyInsideActionMetaArea(el) &&
      (
        knownBrandNames.has(ariaLabel) ||
        knownBrandNames.has(titleLabel) ||
        knownBrandNames.has(dataName) ||
        knownBrandNames.has(directText) ||
        knownBrandNames.has(visibleText)
      );

    const svgOnlyLogoInLogoArea =
      isInHeader(el) &&
      isRootHref &&
      hasLogoAssetInside &&
      !visibleText &&
      !directText &&
      hasLogoLikeAncestor(el) &&
      !isUtilityIconControl(el) &&
      !isClearlyInsideActionMetaArea(el);

    if (text.includes("& home")) return false;
    if (text.includes("tv and home")) return false;
    if (text.includes("tv & home")) return false;

    return (
      appleLogo ||
      brandRootLink ||
      classBasedBrandLogo ||
      homepageLogo ||
      brandLabelWithAssetInHeader ||
      svgOnlyLogoInLogoArea
    );
  };

  const isDivNavigationContainerCandidate = (el, dataLike = null) => {
    if (!el || !(el instanceof Element)) return false;
    if (el.tagName.toLowerCase() !== "div") return false;
    if (!isInHeader(el)) return false;

    const meta = getMetaText(el);
    const classText = getClassText(el).toLowerCase();

    if (!isNavigationLikeMeta(meta)) return false;

    if (classText.includes("navbar_container")) return false;
    if (classText.includes("navbar__")) return false;
    if (meta.includes("secondary")) return false;
    if (meta.includes("signedout")) return false;
    if (meta.includes("signed-out")) return false;
    if (meta.includes("auth")) return false;
    if (meta.includes("actions")) return false;
    if (meta.includes("button")) return false;
    if (meta.includes("download")) return false;
    if (meta.includes("logo")) return false;

    const directLinks = Array.from(el.children).filter((child) => {
      return (
        child instanceof Element &&
        child.tagName.toLowerCase() === "a" &&
        isTraversableElement(child)
      );
    });

    const linkCount = directLinks.length;
    const hasEnoughLinks = linkCount >= 3;

    const hasOnlySimpleLinks =
      linkCount > 0 &&
      directLinks.every((link) => {
        const linkMeta = getMetaText(link);

        if (isLogoLinkCandidate(link)) return false;
        if (isUtilityIconControl(link)) return false;
        if (isActionLikeMeta(linkMeta)) return false;

        return true;
      });

    return hasEnoughLinks && hasOnlySimpleLinks;
  };

  const isHeaderActionCluster = (container) => {
    if (!container || !(container instanceof Element)) return false;
    if (!isInHeader(container)) return false;
    if (isDivNavigationContainerCandidate(container)) return false;

    const tag = container.tagName.toLowerCase();

    if (tag === "nav" || tag === "header") return false;

    const interactive = Array.from(
      container.querySelectorAll("a, button, [role='button']")
    ).filter((item) => {
      if (!(item instanceof Element)) return false;
      if (!isTraversableElement(item)) return false;
      if (isLogoLikeWithoutDeepRoleCheck(item)) return false;
      if (isUtilityIconControl(item)) return false;
      return true;
    });

    if (!interactive.length) return false;
    if (interactive.length > 4) return false;

    const labels = interactive.map((item) => getInteractiveLabelForIntent(item));
    const hasAuthOrCTA = labels.some((label) => isAuthOrCTAIntent(label));
    const hasPrimaryCTA = labels.some((label) => isPrimaryCTAIntent(label));
    const hasSecondaryCTA = labels.some((label) => isSecondaryCTAIntent(label));

    const meta = getMetaText(container);

    const metaLooksAction =
      meta.includes("action") ||
      meta.includes("actions") ||
      meta.includes("button") ||
      meta.includes("buttons") ||
      meta.includes("secondary") ||
      meta.includes("signedout") ||
      meta.includes("signed-out") ||
      meta.includes("auth") ||
      meta.includes("cta") ||
      meta.includes("tooltip");

    if (metaLooksAction && hasAuthOrCTA) return true;
    if (hasPrimaryCTA && hasSecondaryCTA) return true;

    if (interactive.length <= 2 && hasAuthOrCTA) {
      const hasNavLikeText = labels.some((label) => {
        return (
          label.includes("product") ||
          label.includes("resources") ||
          label.includes("customers") ||
          label.includes("pricing") ||
          label.includes("developers") ||
          label.includes("store") ||
          label.includes("blog")
        );
      });

      if (!hasNavLikeText) return true;
    }

    return false;
  };

  const isInsideHeaderActionCluster = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (!isInHeader(el)) return false;

    let current = el.parentElement;

    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();

      if (tag === "header" || tag === "nav") return false;

      if (isDivNavigationContainerCandidate(current)) return false;

      if (isHeaderActionCluster(current)) return true;

      if (isHeaderLikeElement(current)) return false;

      current = current.parentElement;
    }

    return false;
  };

  const isInsideDivNavigationArea = (el) => {
    if (!el || !(el instanceof Element)) return false;

    if (isInsideHeaderActionCluster(el)) {
      return false;
    }

    let current = el.parentElement;

    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      const meta = getMetaText(current);

      if (tag === "header" || tag === "nav") {
        return false;
      }

      if (
        isInsideActionButtonsArea(current) ||
        isHeaderActionsCandidate(current) ||
        isHeaderActionCluster(current)
      ) {
        return false;
      }

      if (
        meta.includes("secondary") ||
        meta.includes("signedout") ||
        meta.includes("signed-out") ||
        meta.includes("auth") ||
        meta.includes("actions") ||
        meta.includes("button") ||
        meta.includes("download") ||
        meta.includes("logo")
      ) {
        return false;
      }

      if (isDivNavigationContainerCandidate(current)) {
        return true;
      }

      if (isHeaderLikeElement(current)) {
        return false;
      }

      current = current.parentElement;
    }

    return false;
  };

  const isLogoWrapperCandidate = (el) => {
    if (!el || !(el instanceof Element)) return false;

    const tag = el.tagName.toLowerCase();

    if (tag !== "span") return false;
    if (isClickTarget(el)) return false;
    if (normalizeText(getDirectText(el))) return false;

    const directVisibleChildren = Array.from(el.children).filter((child) => {
      if (!(child instanceof Element)) return false;
      if (!isTraversableElement(child)) return false;
      if (isDisplayContentsElement(child)) return true;
      return true;
    });

    const directLogoLinks = directVisibleChildren.filter((child) => {
      return child.tagName.toLowerCase() === "a" && isLogoLinkCandidate(child);
    });

    const hasOnlyLogoLinkChild =
      directVisibleChildren.length === 1 &&
      directLogoLinks.length === 1;

    if (hasOnlyLogoLinkChild) return true;

    const hasLogoLinkDescendant = Boolean(
      Array.from(el.querySelectorAll("a")).some((link) => isLogoLinkCandidate(link))
    );

    if (!hasLogoLinkDescendant) return false;

    let current = el.parentElement;

    while (current && current !== document.documentElement) {
      const currentTag = current.tagName?.toLowerCase();
      const currentMeta = getMetaText(current);

      if (currentTag === "header" || currentTag === "nav" || isHeaderLikeElement(current)) break;

      if (
        currentMeta.includes("logoitem") ||
        currentMeta.includes("logo-item") ||
        currentMeta.includes("logo item") ||
        currentMeta.includes("brand")
      ) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  };

  const isLogoAreaCandidate = (el) => {
    if (!el || !(el instanceof Element)) return false;

    const tag = el.tagName.toLowerCase();
    if (tag !== "div" && tag !== "li") return false;
    if (!isInHeader(el)) return false;

    const meta = getMetaText(el);

    const hasLogoMeta =
      meta.includes("logocontainer") ||
      meta.includes("logo-container") ||
      meta.includes("logo container") ||
      meta.includes("logo") ||
      meta.includes("brand") ||
      meta.includes("wordmark");

    if (!hasLogoMeta) return false;

    const hasLogoLink = Boolean(
      Array.from(el.querySelectorAll("a")).some((link) => isLogoLinkCandidate(link))
    );

    const hasAsset = Boolean(el.querySelector("svg, img, picture"));

    return hasLogoLink || hasAsset;
  };

  const isLogoItemCandidate = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (el.tagName.toLowerCase() !== "li") return false;

    const meta = getMetaText(el);

    const explicitLogoItem =
      meta.includes("logoitem") ||
      meta.includes("logo-item") ||
      meta.includes("logo item");

    if (explicitLogoItem) return true;

    return isLogoAreaCandidate(el);
  };

  const isInsideHeaderActions = (el) => {
    const closestActionWrapper = el.closest("div");

    if (!closestActionWrapper) return false;

    let current = closestActionWrapper;

    while (current && current !== document.documentElement) {
      if (current.tagName?.toLowerCase() === "header") return false;

      const cs = getComputedStyle(current);
      const meta = getMetaText(current);
      const marginLeft = px(cs.marginLeft);
      const hasActions = Boolean(current.querySelector("a, button, [role='button']"));
      const display = cs.display;

      const looksLikeActions =
        meta.includes("ml-auto") ||
        meta.includes("actions") ||
        meta.includes("buttons") ||
        meta.includes("right");

      if (
        isInHeader(current) &&
        current.tagName.toLowerCase() === "div" &&
        display.includes("flex") &&
        hasActions &&
        (marginLeft >= 40 || looksLikeActions)
      ) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  };

  const isInsideActionButtonsArea = (el) => {
    if (!el || !(el instanceof Element)) return false;
    if (!isInHeader(el)) return false;

    if (isInsideHeaderActionCluster(el)) return true;

    let current = el.parentElement;

    while (current && current !== document.documentElement) {
      const tag = current.tagName?.toLowerCase();

      if (tag === "header") return false;

      const meta = getMetaText(current);
      const classText = getClassText(current).toLowerCase();

      const explicitActionArea =
        meta.includes("action buttons") ||
        meta.includes("actionbuttons") ||
        meta.includes("action-buttons") ||
        meta.includes("buttonslist") ||
        meta.includes("buttons-list") ||
        meta.includes("buttonitem") ||
        meta.includes("button-item") ||
        meta.includes("button item") ||
        meta.includes("auth") ||
        meta.includes("cta") ||
        meta.includes("secondary") ||
        meta.includes("signedout") ||
        meta.includes("signed-out");

      const listLooksLikeButtons =
        (tag === "ul" || tag === "ol") &&
        (
          classText.includes("buttons") ||
          classText.includes("actions") ||
          classText.includes("cta") ||
          isHeaderActionCluster(current)
        );

      const itemLooksLikeButton =
        tag === "li" &&
        (
          classText.includes("button") ||
          classText.includes("cta") ||
          meta.includes("buttonitem") ||
          meta.includes("button-item") ||
          isHeaderActionCluster(current)
        );

      const divLooksLikeActionGroup =
        tag === "div" &&
        (
          meta.includes("secondary") ||
          meta.includes("signedout") ||
          meta.includes("signed-out") ||
          meta.includes("actions") ||
          meta.includes("auth") ||
          meta.includes("buttons") ||
          isHeaderActionCluster(current)
        );

      const spanLooksLikeActionWrapper =
        tag === "span" &&
        (
          meta.includes("tooltip") ||
          isHeaderActionCluster(current)
        );

      if (
        explicitActionArea ||
        listLooksLikeButtons ||
        itemLooksLikeButton ||
        divLooksLikeActionGroup ||
        spanLooksLikeActionWrapper
      ) {
        return true;
      }

      if (tag === "nav") return false;

      if (isDivNavigationContainerCandidate(current)) {
        return false;
      }

      if (isHeaderLikeElement(current)) {
        return false;
      }

      current = current.parentElement;
    }

    return false;
  };

  const isHeaderActionsCandidate = (el, dataLike = null) => {
    if (!el || el.tagName.toLowerCase() !== "div") return false;
    if (!isInHeader(el)) return false;

    const display = dataLike?.layout?.display || getComputedStyle(el).display;
    const marginLeft = dataLike?.margin?.left ?? px(getComputedStyle(el).marginLeft);
    const hasActions = Boolean(el.querySelector("a, button, [role='button']"));
    const meta = getMetaText(el);

    if (!hasActions) return false;
    if (isDivNavigationContainerCandidate(el, dataLike)) return false;
    if (isLogoAreaCandidate(el)) return false;

    const looksLikeActionsByClass =
      meta.includes("ml-auto") ||
      meta.includes("actions") ||
      meta.includes("buttons") ||
      meta.includes("right") ||
      meta.includes("secondary") ||
      meta.includes("signedout") ||
      meta.includes("signed-out") ||
      meta.includes("auth");

    const pushedRight = marginLeft >= 40;
    const displaySuggestsGroup =
      display.includes("flex") ||
      display.includes("grid") ||
      display.includes("block");

    return displaySuggestsGroup && (pushedRight || looksLikeActionsByClass || isHeaderActionCluster(el));
  };

  const classifyHeaderActionLink = (el, dataLike, kind) => {
    const meta = getMetaText(el);
    const text = normalizeText(getVisibleTextOnly(el)).toLowerCase();
    const label = normalizeText(el.getAttribute("aria-label")).toLowerCase();
    const intentLabel = getInteractiveLabelForIntent(el);
    const combined = `${meta} ${text} ${label} ${intentLabel}`;

    const bg = dataLike?.visual?.backgroundColor || getComputedStyle(el).backgroundColor;
    const shadow = dataLike?.visual?.boxShadow || getComputedStyle(el).boxShadow;
    const hasBg = hasNonTransparentColor(bg);
    const isDarkBg = isDarkColor(bg);
    const isLightBg = isLightColor(bg);
    const hasVisibleShadow = formatShadowValue(shadow) !== "none";
    const borderY = dataLike?.border?.y || 0;
    const paddingX = dataLike?.padding?.x ?? 0;
    const paddingY = dataLike?.padding?.y ?? 0;
    const radius = dataLike?.visual?.borderRadius || getComputedStyle(el).borderRadius;

    const looksButtonLike =
      paddingX >= 16 ||
      paddingY >= 8 ||
      borderY > 0 ||
      hasBg ||
      hasVisibleShadow ||
      radius !== "0px" ||
      combined.includes("button");

    const isDownloadCTA =
      combined.includes("download") &&
      looksButtonLike &&
      !isInsideDivNavigationArea(el);

    const isExplicitPrimary =
      isPrimaryCTAIntent(combined) ||
      combined.includes("primary-cta") ||
      combined.includes("button--primary") ||
      combined.includes("variant-primary") ||
      isDownloadCTA;

    const isExplicitSecondary =
      isSecondaryCTAIntent(combined) ||
      combined.includes("secondary-cta") ||
      combined.includes("button--secondary") ||
      combined.includes("variant-secondary");

    if (isExplicitPrimary) {
      return kind === "button" ? "Primary CTA Button" : "Primary CTA Link";
    }

    if (isDarkBg && hasBg) {
      return kind === "button" ? "Primary CTA Button" : "Primary CTA Link";
    }

    if (isExplicitSecondary) {
      return kind === "button" ? "Secondary CTA Button" : "Secondary CTA Link";
    }

    if (hasBg && !isLightBg) {
      return kind === "button" ? "Primary CTA Button" : "Primary CTA Link";
    }

    if (borderY > 0 || hasVisibleShadow || isLightBg) {
      return kind === "button" ? "Secondary CTA Button" : "Secondary CTA Link";
    }

    return kind === "button" ? "Header Action Button" : "Header Action Link";
  };

  const isHeaderInnerCandidate = (el, dataLike = null) => {
    if (!el || el.tagName.toLowerCase() !== "div") return false;

    const parent = el.parentElement;
    const parentIsHeader = parent?.tagName?.toLowerCase() === "header";

    if (!parentIsHeader) return false;

    const display = dataLike?.layout?.display || getComputedStyle(el).display;
    const rect = dataLike?.rendered || getMeasurementRect(el);

    const isLayoutRow = display.includes("flex") || display.includes("grid");
    const headerLikeHeight = rect.height >= 40 && rect.height <= 100;
    const hasHeaderChildren = Boolean(el.querySelector("nav, a, button, [role='button']"));

    return isLayoutRow && headerLikeHeight && hasHeaderChildren;
  };

  const inferRole = (el, dataLike = null) => {
    const tag = el.tagName.toLowerCase();
    const meta = getMetaText(el);
    const closestNav = el.closest("nav");

    const bg = dataLike?.visual?.backgroundColor;
    const borderY = dataLike?.border?.y || 0;
    const position = dataLike?.layout?.position;

    if (tag === "header") return "Header";
    if (tag === "main") return "Main";
    if (tag === "section") return "Section";
    if (tag === "nav") return "Navigation";
    if (tag === "canvas") return "Canvas";

    if (tag === "svg") {
      if (isDecorativeSvgElement(el, dataLike)) {
        return "Decorative SVG";
      }

      const closestLink = el.closest("a");
      const closestButton = el.closest("button");

      const closestButtonMeta = closestButton ? getMetaText(closestButton) : "";

      if (closestLink && isLogoLinkCandidate(closestLink)) {
        return "Logo Asset";
      }

      if (closestLink && isUtilityIconControl(closestLink)) {
        return "Utility Icon Asset";
      }

      if (
        closestButton ||
        closestButtonMeta.includes("menu") ||
        closestButtonMeta.includes("trigger")
      ) {
        return "Icon Asset";
      }

      return "SVG Asset";
    }

    if (tag === "a") {
      if (isLogoLinkCandidate(el)) {
        return "Logo Link";
      }

      if (isUtilityIconControl(el)) {
        return "Utility Icon Link";
      }

      if (
        isInHeader(el) &&
        (
          isInsideActionButtonsArea(el) ||
          isInsideHeaderActions(el) ||
          isHeaderActionsCandidate(el.parentElement) ||
          isInsideHeaderActionCluster(el)
        )
      ) {
        return classifyHeaderActionLink(el, dataLike, "link");
      }

      if (closestNav || isInsideDivNavigationArea(el)) {
        return "Nav Link";
      }

      if (isInHeader(el) && isPrimaryCTATextOrClass(meta)) {
        if (!isTransparent(bg) && !isLightColor(bg)) return "Primary CTA Link";
        if (borderY > 0) return "Secondary CTA Link";
        return "Navigation CTA Link";
      }

      if (isInHeader(el) && isSecondaryCTATextOrClass(meta)) {
        if (borderY > 0 || isLightColor(bg)) return "Secondary CTA Link";
        return "Navigation CTA Link";
      }

      if (isInHeader(el)) return "Header Link";
      return "Link";
    }

    if (tag === "button") {
      if (isUtilityIconControl(el)) {
        return "Utility Icon Button";
      }

      if (isMenuTrigger(el)) {
        if (isMobileMenuTrigger(el)) return "Mobile Menu Trigger";
        return "Navigation Menu Trigger";
      }

      if (
        isInHeader(el) &&
        (
          isInsideActionButtonsArea(el) ||
          isInsideHeaderActions(el) ||
          isHeaderActionsCandidate(el.parentElement) ||
          isInsideHeaderActionCluster(el)
        )
      ) {
        return classifyHeaderActionLink(el, dataLike, "button");
      }

      if (closestNav || isInsideDivNavigationArea(el)) {
        return "Nav Button";
      }

      if (isInHeader(el) && isPrimaryCTATextOrClass(meta)) {
        if (!isTransparent(bg) && !isLightColor(bg)) return "Primary CTA Button";
        if (borderY > 0) return "Secondary CTA Button";
        return "Navigation CTA Button";
      }

      if (isInHeader(el) && isSecondaryCTATextOrClass(meta)) {
        if (borderY > 0 || isLightColor(bg)) return "Secondary CTA Button";
        return "Navigation CTA Button";
      }

      if (isInHeader(el)) return "Header Button";
      return "Button";
    }

    if (isHeaderInnerCandidate(el, dataLike)) return "Header Inner";
    if (isHeaderActionsCandidate(el, dataLike)) return "Header Actions";

    if (isLogoItemCandidate(el)) return "Logo Item";
    if (isLogoAreaCandidate(el)) return "Logo Area";

    if (isDivNavigationContainerCandidate(el, dataLike)) return "Main Navigation";

    if (meta.includes("container")) return "Container";
    if (meta.includes("innerwrapper") || meta.includes("inner-wrapper")) return "Inner Wrapper";
    if (meta.includes("rightsidewrapper") || meta.includes("right-side-wrapper")) return "Right Side Wrapper";
    if (meta.includes("wrapper")) return "Wrapper";
    if (meta.includes("shell")) return "Shell";
    if (meta.includes("inner")) return "Inner";

    if (tag === "div" && position === "relative") {
      return "Relative Wrapper";
    }

    if (tag === "ul" || tag === "ol") {
      if (closestNav && isHeaderActionCluster(el)) return "Action Buttons List";
      if (closestNav && meta.includes("navitems")) return "Main Navigation List";
      if (closestNav && meta.includes("buttons")) return "Action Buttons List";
      if (closestNav && meta.includes("list")) return "Navigation List";
      if (closestNav) return "Navigation List";
      return "List";
    }

    if (tag === "li") {
      if (isLogoItemCandidate(el)) return "Logo Item";
      if (meta.includes("buttonitem")) return "Button Item";
      if (isInsideActionButtonsArea(el)) return "Button Item";
      if (meta.includes("mobileitem")) return "Mobile Item";
      if (meta.includes("rightsidewrapper")) return "Right Side Wrapper";
      if (closestNav) return "Navigation Item";
      return "List Item";
    }

    if (tag === "span") {
      if (isLogoWrapperCandidate(el)) return "Logo Wrapper";
      if (meta.includes("tooltip")) return "Tooltip Wrapper";
      if (meta.includes("logo")) return "Logo Wrapper";
      return "Text";
    }

    if (tag === "img" || tag === "picture") return "Image";
    if (/^h[1-6]$/.test(tag)) return "Heading";
    if (tag === "p") return "Paragraph";
    if (tag === "label") return "Label";

    if (meta.includes("logo")) return "Logo Area";
    if (meta.includes("cta")) return "CTA Area";
    if (meta.includes("menu")) return "Menu Group";
    if (meta.includes("navigation") || meta.includes("nav")) return "Navigation Group";

    return tag === "div" ? "Wrapper" : tag;
  };

  const isTraversableElement = (el) => {
    if (!(el instanceof Element)) return false;

    const tag = el.tagName.toLowerCase();

    if (SKIP_TAGS.has(tag)) return false;
    if (isElementHiddenForAnalysis(el)) return false;

    return true;
  };

  const isVisibleElement = (el) => {
    if (!(el instanceof Element)) return false;
    if (!isTraversableElement(el)) return false;

    if (isClickTarget(el) && isLogoLinkCandidate(el)) {
      const hasMedia =
        hasVisibleMediaDescendant(el) ||
        Boolean(el.querySelector("svg, img, picture, canvas"));

      if (hasMedia) return true;

      const fallbackRect = getMeasurementRect(el);

      if (hasUsableRect(fallbackRect)) return true;
    }

    if (isDisplayContentsElement(el)) return false;

    const rawRect = getRawRect(el);

    if (hasUsableRect(rawRect)) return true;

    if (isClickTarget(el)) {
      const text = normalizeText(getVisibleText(el));
      const hasMedia = hasVisibleMediaDescendant(el);
      const fallbackRect = getMeasurementRect(el);

      return Boolean(text || hasMedia) && hasUsableRect(fallbackRect);
    }

    return false;
  };

  const allZero = (...values) => {
    return values.every((value) => Math.abs(pxNumber(value)) < 0.01);
  };

  const formatTRBL = (top, right, bottom, left) => {
    if (allZero(top, right, bottom, left)) return "none";

    return `${fmtPx(top)} ${fmtPx(right)} ${fmtPx(bottom)} ${fmtPx(left)}`;
  };

  const normalizeGapValue = (value) => {
    if (!value) return "none";

    const raw = String(value).trim();

    if (!raw) return "none";
    if (raw === "normal") return "none";
    if (raw === "0px") return "none";
    if (raw === "0") return "none";

    return raw;
  };

  const formatGap = (data) => {
    const rowGap = normalizeGapValue(data.layout.rowGap);
    const columnGap = normalizeGapValue(data.layout.columnGap);

    if (rowGap === "none" && columnGap === "none") return "none";

    if (rowGap !== "none" && columnGap !== "none") {
      if (rowGap === columnGap) {
        return `gap: ${rowGap}`;
      }

      return `row-gap: ${rowGap} / column-gap: ${columnGap}`;
    }

    if (rowGap !== "none") {
      return `row-gap: ${rowGap}`;
    }

    return `column-gap: ${columnGap}`;
  };

  const getInnerPaddingForClickTarget = (data) => {
    if (!data || !data.el) return "none";
    if (!isClickTarget(data.el)) return "none";

    const ownPadding = formatTRBL(
      data.padding.top,
      data.padding.right,
      data.padding.bottom,
      data.padding.left
    );

    if (ownPadding !== "none") return "none";

    const directChildren = Array.from(data.el.children).filter((child) => {
      if (!(child instanceof Element)) return false;
      if (!["span", "div"].includes(child.tagName.toLowerCase())) return false;
      if (!isTraversableElement(child)) return false;
      if (!isVisibleElement(child)) return false;
      if (isMediaElement(child)) return false;
      if (child.querySelector("a, button, [role='button']")) return false;

      const text = normalizeText(getVisibleTextOnly(child));

      return Boolean(text);
    });

    for (const child of directChildren) {
      const cs = getComputedStyle(child);

      const paddingTop = px(cs.paddingTop);
      const paddingRight = px(cs.paddingRight);
      const paddingBottom = px(cs.paddingBottom);
      const paddingLeft = px(cs.paddingLeft);

      const innerPadding = formatTRBL(
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft
      );

      if (innerPadding !== "none") {
        return innerPadding;
      }
    }

    return "none";
  };

  const formatFont = (data) => {
    if (!isTextLike(data.el) && !isClickTarget(data.el)) return "none";

    return `${data.typography.fontSize}/${data.typography.lineHeight}/${data.typography.fontWeight}`;
  };

  const formatColor = (color) => {
    return formatColorValue(color);
  };

  const formatVisualValue = (value) => {
    return formatColorValue(value);
  };

  const formatLayoutSummary = (data) => {
    return `${data.layout.display} / ${data.layout.position} / ${data.layout.alignItems} / ${data.layout.justifyContent}`;
  };

  const normalizeFlexBasis = (value) => {
    if (!value) return "auto";

    const raw = String(value).trim();

    if (!raw) return "auto";
    if (raw === "0px") return "0px";
    if (raw === "0%") return "0%";
    if (raw === "auto") return "auto";
    if (raw.endsWith("px")) return fmtPx(raw);

    return raw;
  };

  const getFlexItemValue = (data) => {
    return `${data.layout.flexGrow} ${data.layout.flexShrink} ${normalizeFlexBasis(data.layout.flexBasis)}`;
  };

  const isDefaultFlexItemValue = (value) => {
    return value === "0 1 auto";
  };

  const getRawDetailsFlexItemValue = (data) => {
    const value = getFlexItemValue(data);

    if (isDefaultFlexItemValue(value)) {
      return "default";
    }

    return value;
  };

  const analyzeElement = (el) => {
    const cs = getComputedStyle(el);
    const rect = getMeasurementRect(el);

    const paddingTop = px(cs.paddingTop);
    const paddingRight = px(cs.paddingRight);
    const paddingBottom = px(cs.paddingBottom);
    const paddingLeft = px(cs.paddingLeft);

    const marginTop = px(cs.marginTop);
    const marginRight = px(cs.marginRight);
    const marginBottom = px(cs.marginBottom);
    const marginLeft = px(cs.marginLeft);

    const borderTop = px(cs.borderTopWidth);
    const borderRight = px(cs.borderRightWidth);
    const borderBottom = px(cs.borderBottomWidth);
    const borderLeft = px(cs.borderLeftWidth);

    const renderedWidth = rect.width;
    const renderedHeight = rect.height;

    const contentWidth =
      renderedWidth - paddingLeft - paddingRight - borderLeft - borderRight;

    const contentHeight =
      renderedHeight - paddingTop - paddingBottom - borderTop - borderBottom;

    const data = {
      el,
      tag: el.tagName.toLowerCase(),
      selector: getElementSelector(el),
      text: getVisibleText(el),

      rendered: {
        width: renderedWidth,
        height: renderedHeight,
      },

      content: {
        width: Math.max(0, contentWidth),
        height: Math.max(0, contentHeight),
      },

      padding: {
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft,
        x: paddingLeft + paddingRight,
        y: paddingTop + paddingBottom,
      },

      margin: {
        top: marginTop,
        right: marginRight,
        bottom: marginBottom,
        left: marginLeft,
        x: marginLeft + marginRight,
        y: marginTop + marginBottom,
      },

      border: {
        top: borderTop,
        right: borderRight,
        bottom: borderBottom,
        left: borderLeft,
        x: borderLeft + borderRight,
        y: borderTop + borderBottom,
      },

      layout: {
        display: cs.display,
        position: cs.position,
        alignItems: cs.alignItems,
        justifyContent: cs.justifyContent,
        flexDirection: cs.flexDirection,
        flexGrow: cs.flexGrow,
        flexShrink: cs.flexShrink,
        flexBasis: cs.flexBasis,
        gap: cs.gap,
        rowGap: cs.rowGap,
        columnGap: cs.columnGap,
      },

      typography: {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        fontFamily: cs.fontFamily,
      },

      visual: {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        opacity: cs.opacity,
      },
    };

    data.role = inferRole(el, data);

    return data;
  };

  const isAutoMarginLeftCandidate = (data) => {
    const parent = data.el.parentElement;
    if (!parent) return false;

    const parentStyle = getComputedStyle(parent);
    const parentIsFlex = parentStyle.display.includes("flex") || parentStyle.display.includes("contents");

    if (!parentIsFlex && !isInHeader(data.el)) return false;
    if (data.margin.left < 40) return false;
    if (Math.abs(data.margin.right) > 0.01) return false;

    const flexItemValue = getFlexItemValue(data);
    const role = data.role || "";

    return (
      role.includes("Action Buttons") ||
      role.includes("Header Actions") ||
      role.includes("Right Side") ||
      flexItemValue === "0 0 auto"
    );
  };

  const formatMarginForAnnotated = (data) => {
    if (isAutoMarginLeftCandidate(data)) {
      if (allZero(data.margin.top, data.margin.right, data.margin.bottom)) {
        return "margin-left: auto";
      }

      return `${formatTRBL(
        data.margin.top,
        data.margin.right,
        data.margin.bottom,
        0
      )} / margin-left: auto`;
    }

    return formatTRBL(
      data.margin.top,
      data.margin.right,
      data.margin.bottom,
      data.margin.left
    );
  };

  const formatMarginForRaw = (data) => {
    if (isAutoMarginLeftCandidate(data)) {
      if (allZero(data.margin.top, data.margin.right, data.margin.bottom)) {
        return `margin-left: auto (computed ${fmtPx(data.margin.left)})`;
      }

      return `${formatTRBL(
        data.margin.top,
        data.margin.right,
        data.margin.bottom,
        0
      )} / margin-left: auto (computed ${fmtPx(data.margin.left)})`;
    }

    return formatTRBL(
      data.margin.top,
      data.margin.right,
      data.margin.bottom,
      data.margin.left
    );
  };

  const getImmediateVisibleChildren = (el) => {
    return Array.from(el.children).filter((child) => isVisibleElement(child));
  };

  const getVisibleChildrenWidthTotal = (el) => {
    return getImmediateVisibleChildren(el).reduce((sum, child) => {
      const rect = getMeasurementRect(child);
      return sum + rect.width;
    }, 0);
  };

  const isRootViewportFillCandidate = (data, parent, isNearViewport) => {
    if (!isNearViewport) return false;

    const el = data.el;
    const tag = data.tag;

    if (el === root) return true;
    if (!parent) return true;
    if (parent === document.body || parent === document.documentElement) return true;

    if (
      (tag === "header" || tag === "main" || tag === "section" || tag === "nav") &&
      (data.layout.position === "fixed" || data.layout.position === "sticky")
    ) {
      return true;
    }

    if (isHeaderLikeElement(el) && (data.layout.position === "fixed" || data.layout.position === "sticky")) {
      return true;
    }

    return false;
  };

  const inferWidthBehavior = (data) => {
    const el = data.el;
    const tag = data.tag;
    const role = data.role || "";

    const parent = el.parentElement;
    const parentRect = parent ? getMeasurementRect(parent) : null;
    const parentStyle = parent ? getComputedStyle(parent) : null;

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const width = data.rendered.width;
    const parentWidth = parentRect?.width || 0;

    const isNearViewport = viewportWidth > 0 && width >= viewportWidth * 0.85;
    const isNearParent = parentWidth > 0 && width >= parentWidth * 0.85;

    const childWidthTotal = getVisibleChildrenWidthTotal(el);
    const hasVisibleChildWidth = childWidthTotal > 0;
    const parentIsFlex = parentStyle?.display?.includes("flex");

    const rootViewportFill = isRootViewportFillCandidate(
      data,
      parent,
      isNearViewport
    );

    if (tag === "svg") {
      return role === "Decorative SVG" ? "Decorative / SVG" : "Asset / SVG";
    }

    if (
      parentIsFlex &&
      hasVisibleChildWidth &&
      width > childWidthTotal * 1.5 &&
      data.padding.x === 0 &&
      data.border.x === 0 &&
      !isClickTarget(el)
    ) {
      return "Flex-distributed slot";
    }

    if (tag === "header" || tag === "main" || tag === "section") {
      if (rootViewportFill) return "Viewport-dependent / Fill";
      if (isNearParent) return "Parent-constrained / Fill";
      if (isNearViewport) return "Viewport-dependent / Fill";
      return "Parent-constrained";
    }

    if (data.layout.position === "fixed") {
      if (rootViewportFill) return "Viewport-dependent / Fixed layer";
      if (isNearParent) return "Parent-constrained / Fixed layer";
      if (isNearViewport) return "Viewport-dependent / Fixed layer";
      return "Fixed layer";
    }

    if (data.layout.position === "sticky") {
      if (rootViewportFill) return "Viewport-dependent / Sticky layer";
      if (isNearParent) return "Parent-constrained / Sticky layer";
      if (isNearViewport) return "Viewport-dependent / Sticky layer";
      return "Sticky layer";
    }

    if (data.layout.position === "absolute") {
      if (isNearParent) return "Parent-constrained / Absolute layer";
      if (rootViewportFill) return "Viewport-dependent / Absolute layer";
      if (isNearViewport) return "Viewport-dependent / Absolute layer";
      return "Absolute layer";
    }

    if (role.includes("Container")) {
      if (isNearParent) return "Parent-constrained / Fill";
      if (rootViewportFill) return "Viewport-dependent / Fill";
      if (isNearViewport) return "Viewport-dependent / Fill";
      return "Layout container";
    }

    if (role.includes("Wrapper") || role.includes("Inner") || role.includes("Actions")) {
      if (isNearParent) return "Parent-constrained / Fill";
      if (rootViewportFill) return "Viewport-dependent / Fill";
      if (isNearViewport) return "Viewport-dependent / Fill";
      return "Layout wrapper";
    }

    if (tag === "nav" || role === "Main Navigation") {
      if (rootViewportFill) return "Viewport-dependent / Fill";
      if (isNearParent) return "Parent-constrained / Fill";
      if (isNearViewport) return "Viewport-dependent / Fill";
      return "Content-sized group";
    }

    if (tag === "ul" || tag === "ol") {
      if (isNearParent) return "Parent-constrained / Group";
      if (rootViewportFill) return "Viewport-dependent / Group";
      if (isNearViewport) return "Viewport-dependent / Group";
      return "Content-sized group";
    }

    if (tag === "li") {
      if (role.includes("Right Side")) return "Layout wrapper";
      return "Content-sized wrapper";
    }

    if (isClickTarget(el)) {
      return "Content-sized";
    }

    if (tag === "img" || tag === "picture" || tag === "canvas") {
      return "Asset / content-sized";
    }

    if (isNearParent) return "Parent-constrained / Fill";
    if (rootViewportFill) return "Viewport-dependent / Fill";
    if (isNearViewport) return "Viewport-dependent / Fill";

    if (data.text) return "Content-sized";

    return "Layout-driven";
  };

  const getSemanticWidthLabel = (data) => {
    const widthBehavior = inferWidthBehavior(data);

    if (isMediaElement(data.el)) {
      return null;
    }

    if (
      widthBehavior === "Parent-constrained" ||
      widthBehavior === "Parent-constrained / Fill" ||
      widthBehavior === "Parent-constrained / Fixed layer" ||
      widthBehavior === "Parent-constrained / Sticky layer" ||
      widthBehavior === "Parent-constrained / Absolute layer" ||
      widthBehavior === "Parent-constrained / Group"
    ) {
      return "parent-fill";
    }

    if (
      widthBehavior === "Viewport-dependent / Fill" ||
      widthBehavior === "Viewport-dependent / Fixed layer" ||
      widthBehavior === "Viewport-dependent / Sticky layer" ||
      widthBehavior === "Viewport-dependent / Absolute layer" ||
      widthBehavior === "Viewport-dependent / Group"
    ) {
      return "fill";
    }

    if (widthBehavior === "Flex-distributed slot") {
      return "flex-slot";
    }

    return "content-fit";
  };

  const formatAdaptiveSize = (data, boxType) => {
    const box = data[boxType];
    const semanticWidthLabel = getSemanticWidthLabel(data);

    if (semanticWidthLabel) {
      return `${semanticWidthLabel}×${fmtPx(box.height)}`;
    }

    return fmtSize(box.width, box.height);
  };

  const hasMeaningfulBox = (data) => {
    return (
      data.layout.display.includes("flex") ||
      data.layout.display.includes("grid") ||
      data.layout.position !== "static" ||
      data.padding.x > 0 ||
      data.padding.y > 0 ||
      data.margin.x > 0 ||
      data.margin.y > 0 ||
      data.border.x > 0 ||
      data.border.y > 0 ||
      formatGap(data) !== "none" ||
      !isTransparent(data.visual.backgroundColor) ||
      data.visual.borderRadius !== "0px" ||
      data.visual.boxShadow !== "none"
    );
  };

  const isImportantElement = (el, data) => {
    const tag = el.tagName.toLowerCase();

    if (isDisplayContentsElement(el) && !(isClickTarget(el) && isLogoLinkCandidate(el))) {
      return false;
    }

    if (el === root) return true;
    if (isClickTarget(el)) return true;
    if (tag === "svg") return true;
    if (IMPORTANT_TAGS.has(tag) && tag !== "div") return true;
    if (tag === "div" && hasMeaningfulBox(data)) return true;
    if (tag === "div" && (isLogoAreaCandidate(el) || isDivNavigationContainerCandidate(el) || isHeaderActionsCandidate(el, data))) return true;
    if (hasMeaningfulBox(data)) return true;
    if (isTextLike(el) && data.text) return true;

    return false;
  };

  const shouldStopAt = (el) => {
    const tag = el.tagName.toLowerCase();

    if (config.stopAtClickTarget && isClickTarget(el)) return true;

    if (
      config.stopAtMedia &&
      (tag === "img" || tag === "picture" || tag === "svg" || tag === "canvas")
    ) {
      return true;
    }

    return false;
  };

  const nodes = [];
  const visited = new Set();

  const addDirectSvgAssetSummaries = (el, depth) => {
    if (!config.includeSvgAssetSummary) return;

    const directSvgChildren = Array.from(el.children).filter((child) => {
      return child.tagName.toLowerCase() === "svg" && isVisibleElement(child);
    });

    directSvgChildren.forEach((svg) => {
      if (visited.has(svg)) return;

      visited.add(svg);

      const data = analyzeElement(svg);

      nodes.push({
        el: svg,
        depth,
        data,
        assetSummary: true,
      });
    });
  };

  const addDirectClickTargetSummaries = (el, depth) => {
    if (!config.includeDirectClickTargetSummary) return;

    if (isClickTarget(el)) return;

    const directClickTargets = Array.from(el.children).filter((child) => {
      return isClickTarget(child) && isVisibleElement(child);
    });

    directClickTargets.forEach((clickTarget) => {
      if (visited.has(clickTarget)) return;

      visited.add(clickTarget);

      const data = analyzeElement(clickTarget);

      nodes.push({
        el: clickTarget,
        depth,
        data,
        clickTargetSummary: true,
      });

      addDirectSvgAssetSummaries(clickTarget, depth + 1);
    });
  };

  function walk(el, depth = 0) {
    if (nodes.length >= config.maxNodes) return;
    if (depth > config.maxDepth) return;
    if (visited.has(el)) return;
    if (!isTraversableElement(el)) return;

    visited.add(el);

    const shouldAnalyzeCurrent = isVisibleElement(el);
    const data = shouldAnalyzeCurrent ? analyzeElement(el) : null;
    const important = data ? isImportantElement(el, data) : false;

    if (important) {
      nodes.push({
        el,
        depth,
        data,
      });
    }

    if (important && !isClickTarget(el)) {
      addDirectClickTargetSummaries(el, depth + 1);
    }

    if (important && isClickTarget(el)) {
      addDirectSvgAssetSummaries(el, depth + 1);
    }

    if (important && shouldStopAt(el)) return;

    for (const child of el.children) {
      walk(child, important ? depth + 1 : depth);
    }
  }

  walk(root);

  const selectedNode = nodes[0];
  const childNodes = nodes.slice(1);

  const hasChildNodes = childNodes.length > 0;

  const shouldAppendTextToLabel = (data) => {
    if (!data || !data.el) return false;

    const tag = data.tag;

    if (["svg", "img", "picture", "canvas"].includes(tag)) return false;
    if (isClickTarget(data.el)) return true;
    if (/^h[1-6]$/.test(tag)) return true;
    if (tag === "p") return true;
    if (tag === "label") return true;

    if (tag === "span") {
      return Boolean(getDirectText(data.el));
    }

    return false;
  };

  const getElementLabel = (node) => {
    const d = node.data;
    const visibleTextOnly = truncateText(getVisibleTextOnly(d.el), 42);

    if (shouldAppendTextToLabel(d) && visibleTextOnly) {
      return `${d.role} — ${visibleTextOnly} (${d.tag})`;
    }

    if (d.role.includes("Utility Icon")) {
      const utilityLabel = getUtilityLabel(d.el);

      if (utilityLabel) {
        return `${d.role} — ${utilityLabel} (${d.tag})`;
      }
    }

    const ariaLabel = truncateText(d.el.getAttribute("aria-label"), 42);

    if (d.role === "Logo Link" && ariaLabel) {
      return `${d.role} — ${ariaLabel} (${d.tag})`;
    }

    return `${d.role} (${d.tag})`;
  };

  const buildStructureTree = (flatNodes) => {
    if (!flatNodes.length) return null;

    const rootDepth = flatNodes[0].depth || 0;
    const stack = [];
    let firstTreeNode = null;

    for (const node of flatNodes) {
      const level = Math.max(0, node.depth - rootDepth);

      const treeNode = {
        node,
        children: [],
      };

      if (level === 0) {
        if (!firstTreeNode) {
          firstTreeNode = treeNode;
        }

        stack[0] = treeNode;
        stack.length = 1;
        continue;
      }

      const parent = stack[level - 1];

      if (parent) {
        parent.children.push(treeNode);
      } else if (!firstTreeNode) {
        firstTreeNode = treeNode;
      }

      stack[level] = treeNode;
      stack.length = level + 1;
    }

    return firstTreeNode;
  };

  const getAnnotatedWidthLabel = (data) => {
    const widthBehavior = inferWidthBehavior(data);
    const semanticWidthLabel = getSemanticWidthLabel(data);

    if (widthBehavior === "Asset / SVG") return "asset-svg";
    if (widthBehavior === "Decorative / SVG") return "decorative-svg";
    if (widthBehavior === "Asset / content-sized") return "asset";

    if (semanticWidthLabel === "fill") return "fill";
    if (semanticWidthLabel === "parent-fill") return "parent-fill";
    if (semanticWidthLabel === "flex-slot") return "flex-slot";

    return "";
  };

  const isMajorLayoutNode = (data) => {
    const role = data.role || "";

    if (role === "Header") return true;
    if (role === "Header Inner") return true;
    if (role === "Header Actions") return true;
    if (role === "Navigation") return true;
    if (role === "Main Navigation") return true;
    if (role === "Logo Item") return true;
    if (role === "Logo Area") return true;
    if (role.includes("List")) return true;
    if (role.includes("Container")) return true;
    if (role.includes("Inner")) return true;
    if (role.includes("Shell")) return true;
    if (role.includes("Relative Wrapper")) return true;
    if (role.includes("Right Side Wrapper")) return true;
    if (role.includes("Logo Wrapper")) return true;
    if (role.includes("Navigation Group")) return true;

    return false;
  };

  const getAnnotatedLayoutLine = (data) => {
    const display = data.layout.display;
    const position = data.layout.position;
    const alignItems = data.layout.alignItems;
    const justifyContent = data.layout.justifyContent;

    const displayIsFlexOrGrid =
      display.includes("flex") || display.includes("grid");

    const hasVisibleElementChildren =
      getImmediateVisibleChildren(data.el).length > 0;

    const hasSpecialPosition =
      position === "fixed" ||
      position === "sticky" ||
      position === "absolute";

    const hasMeaningfulRelativePosition =
      position === "relative" &&
      !isClickTarget(data.el) &&
      isMajorLayoutNode(data);

    const shouldShowDisplayLayout =
      displayIsFlexOrGrid &&
      hasVisibleElementChildren &&
      !isClickTarget(data.el) &&
      isMajorLayoutNode(data);

    const parts = [];

    if (shouldShowDisplayLayout) {
      parts.push(display);

      if (alignItems && alignItems !== "normal") {
        parts.push(`align ${alignItems}`);
      }

      if (justifyContent && justifyContent !== "normal") {
        parts.push(`justify ${justifyContent}`);
      }
    }

    if (hasSpecialPosition) {
      parts.push(`position ${position}`);
    }

    if (hasMeaningfulRelativePosition) {
      parts.push(`position ${position}`);
    }

    if (!parts.length) return "";

    return `layout: ${parts.join(" / ")}`;
  };

  const getAnnotatedShadowValue = (shadow) => {
    const formatted = formatShadowValue(shadow);

    if (formatted === "none") return "none";

    return "present";
  };

  const getAnnotatedDetailLines = (node) => {
    const d = node.data;

    const padding = formatTRBL(
      d.padding.top,
      d.padding.right,
      d.padding.bottom,
      d.padding.left
    );

    const innerPadding = getInnerPaddingForClickTarget(d);

    const border = formatTRBL(
      d.border.top,
      d.border.right,
      d.border.bottom,
      d.border.left
    );

    const margin = formatMarginForAnnotated(d);
    const gap = formatGap(d);
    const flexItem = getFlexItemValue(d);
    const bg = formatVisualValue(d.visual.backgroundColor);
    const radius = formatVisualValue(d.visual.borderRadius);
    const shadow = getAnnotatedShadowValue(d.visual.boxShadow);

    const widthLabel = getAnnotatedWidthLabel(d);
    const layoutLine = getAnnotatedLayoutLine(d);
    const menuTriggerPresent = hasSiblingOverlayMenuTrigger(d);

    const lines = [];

    const sizeParts = [
      `height: ${fmtPx(d.rendered.height)}`,
      `box: ${formatAdaptiveSize(d, "content")}`,
    ];

    if (widthLabel) {
      sizeParts.push(`width: ${widthLabel}`);
    }

    lines.push(sizeParts.join(" | "));

    if (layoutLine) {
      lines.push(layoutLine);
    }

    const spacingParts = [];

    if (padding !== "none") spacingParts.push(`padding: ${padding}`);
    if (padding === "none" && innerPadding !== "none") spacingParts.push(`inner-padding: ${innerPadding}`);
    if (border !== "none") spacingParts.push(`border: ${border}`);

    if (margin !== "none") {
      if (margin.startsWith("margin-")) {
        spacingParts.push(margin);
      } else {
        spacingParts.push(`margin: ${margin}`);
      }
    }

    if (gap !== "none") spacingParts.push(gap);
    if (!isDefaultFlexItemValue(flexItem)) spacingParts.push(`flex-item: ${flexItem}`);
    if (menuTriggerPresent) spacingParts.push("menu-trigger: present");

    if (spacingParts.length) {
      lines.push(spacingParts.join(" | "));
    }

    const visualParts = [];

    if (bg !== "none") visualParts.push(`background: ${bg}`);
    if (radius !== "none") visualParts.push(`radius: ${radius}`);
    if (shadow !== "none") visualParts.push(`shadow: ${shadow}`);

    if (visualParts.length) {
      lines.push(visualParts.join(" | "));
    }

    return lines;
  };

  const shouldHideFromAnnotatedStructure = (node) => {
    if (config.hideDecorativeSvgInAnnotatedStructure && node?.data?.role === "Decorative SVG") {
      return true;
    }

    if (
      config.hideOverlayMenuTriggersInAnnotatedStructure &&
      isOverlayMenuTrigger(node?.data?.el, node?.data)
    ) {
      return true;
    }

    return false;
  };

  const renderAnnotatedStructureLines = (
    treeNode,
    prefix = "",
    isLast = true,
    isRoot = true
  ) => {
    if (!treeNode) return [];

    const visibleChildren = treeNode.children.filter((child) => {
      return !shouldHideFromAnnotatedStructure(child.node);
    });

    if (shouldHideFromAnnotatedStructure(treeNode.node)) {
      return visibleChildren.flatMap((child, index) => {
        return renderAnnotatedStructureLines(
          child,
          prefix,
          index === visibleChildren.length - 1,
          isRoot
        );
      });
    }

    const label = getElementLabel(treeNode.node);
    const connector = isRoot ? "" : isLast ? "└ " : "├ ";
    const currentLine = `${prefix}${connector}${label}`;

    const nextPrefix = isRoot
      ? ""
      : `${prefix}${isLast ? "  " : "│ "}`;

    const detailPrefix = isRoot
      ? "  "
      : `${nextPrefix}  `;

    const detailLines = getAnnotatedDetailLines(treeNode.node).map((line) => {
      return `${detailPrefix}${line}`;
    });

    const spacerLine = detailLines.length ? [`${detailPrefix}`] : [];

    const childLines = visibleChildren.flatMap((child, index) => {
      return renderAnnotatedStructureLines(
        child,
        nextPrefix,
        index === visibleChildren.length - 1,
        false
      );
    });

    return [currentLine, ...detailLines, ...spacerLine, ...childLines];
  };

  const renderRawStructureTreeLines = (
    treeNode,
    prefix = "",
    isLast = true,
    isRoot = true,
    lineMap = null
  ) => {
    if (!treeNode) return [];

    const label = getElementLabel(treeNode.node);
    const connector = isRoot ? "" : isLast ? "└ " : "├ ";
    const currentLine = `${prefix}${connector}${label}`;

    if (lineMap) {
      lineMap.set(treeNode.node, currentLine);
    }

    const nextPrefix = isRoot
      ? ""
      : `${prefix}${isLast ? "  " : "│ "}`;

    const childLines = treeNode.children.flatMap((child, index) => {
      return renderRawStructureTreeLines(
        child,
        nextPrefix,
        index === treeNode.children.length - 1,
        false,
        lineMap
      );
    });

    return [currentLine, ...childLines];
  };

  const treeRoot = buildStructureTree(nodes);

  const rawTreeLineByNode = new Map();
  const treeParentByNode = new Map();
  const treeAncestorsByNode = new Map();

  const collectTreeRelations = (treeNode, parent = null, ancestors = []) => {
    if (!treeNode) return;

    treeParentByNode.set(treeNode.node, parent);
    treeAncestorsByNode.set(treeNode.node, ancestors);

    treeNode.children.forEach((child) => {
      collectTreeRelations(child, treeNode.node, [...ancestors, treeNode.node]);
    });
  };

  collectTreeRelations(treeRoot);

  const annotatedStructureText = renderAnnotatedStructureLines(
    treeRoot,
    "",
    true,
    true
  ).join("\n");

  renderRawStructureTreeLines(
    treeRoot,
    "",
    true,
    true,
    rawTreeLineByNode
  );

  const getRawTreeElementName = (node) => {
    return rawTreeLineByNode.get(node) || getElementLabel(node);
  };

  const getPlainElementName = (node) => {
    return getElementLabel(node);
  };

  const isMeaningfulTypographyNode = (node) => {
    const d = node.data;
    const tag = d.tag;

    if (!d.text) return false;
    if (["svg", "img", "picture", "canvas"].includes(tag)) return false;
    if (isOverlayMenuTrigger(d.el, d)) return false;

    if (isClickTarget(d.el)) return true;

    if (/^h[1-6]$/.test(tag)) return true;
    if (tag === "p") return true;
    if (tag === "label") return true;

    if (tag === "span") {
      const hasClickTargetDescendant = Boolean(
        d.el.querySelector("a, button, [role='button']")
      );

      if (hasClickTargetDescendant) return false;

      return Boolean(getDirectText(d.el) || d.text);
    }

    return false;
  };

  const typographyNodes = childNodes.filter((node) => isMeaningfulTypographyNode(node));

  const getTypographyTextSummary = () => {
    const texts = [];

    for (const node of typographyNodes) {
      const visibleTextOnly = getVisibleTextOnly(node.data.el);
      const text = escapeMd(truncateText(visibleTextOnly, 140));

      if (!text || text === "none") continue;

      if (!texts.includes(text)) {
        texts.push(text);
      }
    }

    if (!texts.length && selectedNode) {
      const fallbackText = escapeMd(
        truncateText(getVisibleTextOnly(selectedNode.data.el), 140)
      );

      return fallbackText || "none";
    }

    return texts.join(" · ");
  };

  const getTypographySummaryRole = (node) => {
    const d = node.data;
    const role = d.role || "";
    const tag = d.tag;

    if (role.includes("Logo")) {
      return "Logo Text";
    }

    if (role.includes("Primary CTA")) {
      return "Primary CTA Text";
    }

    if (
      role.includes("Secondary CTA") ||
      role.includes("Navigation CTA")
    ) {
      return "Secondary CTA Text";
    }

    if (role.includes("Header Action")) {
      return "Secondary CTA Text";
    }

    if (role.includes("Utility Icon")) {
      return "Utility Text";
    }

    if (
      role.includes("Navigation Menu Trigger") ||
      role === "Nav Link" ||
      role === "Nav Button" ||
      role === "Header Link" ||
      role.includes("Nav Link") ||
      role.includes("Nav Button")
    ) {
      return "Nav Text";
    }

    if (/^h[1-6]$/.test(tag) || role.includes("Heading")) {
      return "Heading Text";
    }

    if (tag === "p" || role.includes("Paragraph")) {
      return "Paragraph Text";
    }

    if (tag === "label" || role.includes("Label")) {
      return "Label Text";
    }

    if (isClickTarget(d.el)) {
      return "Action Text";
    }

    if (tag === "span") {
      return "Inline Text";
    }

    return "Text";
  };

  const getTypographySummarySortOrder = (role) => {
    const order = {
      "Logo Text": 5,
      "Nav Text": 10,
      "Secondary CTA Text": 20,
      "Primary CTA Text": 30,
      "Utility Text": 35,
      "Heading Text": 40,
      "Paragraph Text": 50,
      "Label Text": 60,
      "Action Text": 70,
      "Inline Text": 80,
      "Text": 90,
    };

    return order[role] || 999;
  };

  const getTypographySummaryRows = () => {
    const groups = new Map();

    for (const node of typographyNodes) {
      const d = node.data;

      const visibleTextOnly = truncateText(getVisibleTextOnly(d.el), 80);

      if (!visibleTextOnly) {
        continue;
      }

      const summaryRole = getTypographySummaryRole(node);
      const fontSize = d.typography.fontSize;
      const lineHeight = d.typography.lineHeight;
      const fontWeight = d.typography.fontWeight;
      const color = formatColor(d.typography.color);
      const key = `${summaryRole}||${fontSize}||${lineHeight}||${fontWeight}||${color}`;

      if (!groups.has(key)) {
        groups.set(key, {
          role: summaryRole,
          fontSize,
          lineHeight,
          fontWeight,
          color,
          texts: [],
        });
      }

      const group = groups.get(key);

      if (!group.texts.includes(visibleTextOnly)) {
        group.texts.push(visibleTextOnly);
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => {
        const roleDiff =
          getTypographySummarySortOrder(a.role) -
          getTypographySummarySortOrder(b.role);

        if (roleDiff !== 0) return roleDiff;

        return a.fontSize.localeCompare(b.fontSize);
      })
      .map((group) => {
        return `| ${escapeMd(group.role)} | \`${escapeMd(group.fontSize)}\` | \`${escapeMd(group.lineHeight)}\` | \`${escapeMd(group.fontWeight)}\` | \`${escapeMd(group.color)}\` | ${escapeMd(group.texts.join(", "))} |`;
      });
  };

  const getTypographyDetailsGroup = (node) => {
    const d = node.data;
    const ancestors = treeAncestorsByNode.get(node) || [];
    const roles = [d.role, ...ancestors.map((ancestor) => ancestor.data.role)]
      .filter(Boolean)
      .join(" ");

    if (roles.includes("Utility Icon")) {
      return "Header Utilities";
    }

    if (
      roles.includes("Logo Item") ||
      roles.includes("Logo Wrapper") ||
      roles.includes("Logo Area") ||
      d.role.includes("Logo")
    ) {
      return "Logo Area";
    }

    const insideHeaderActions =
      roles.includes("Header Actions") ||
      roles.includes("Action Buttons List");

    const insideNavigation =
      roles.includes("Navigation") ||
      roles.includes("Main Navigation");

    if (
      insideHeaderActions ||
      roles.includes("Button Item") ||
      d.role.includes("Primary CTA") ||
      d.role.includes("Secondary CTA") ||
      d.role.includes("Navigation CTA") ||
      d.role.includes("Header Action")
    ) {
      return "Action Buttons";
    }

    if (
      insideNavigation ||
      d.role.includes("Navigation Menu Trigger") ||
      d.role.includes("Nav Link") ||
      d.role.includes("Nav Button") ||
      d.role.includes("Header Link")
    ) {
      return "Main Navigation";
    }

    return "Text Content";
  };

  const getTypographyDetailsGroupOrder = (groupName) => {
    const order = {
      "Logo Area": 10,
      "Main Navigation": 20,
      "Action Buttons": 30,
      "Header Utilities": 40,
      "Text Content": 90,
    };

    return order[groupName] || 999;
  };

  const getTypographyTextDetailsLines = () => {
    const groups = new Map();

    for (const node of typographyNodes) {
      const d = node.data;
      const textField = getReportTextField(d);

      if (!textField.value || textField.value === "none") {
        continue;
      }

      const groupName = getTypographyDetailsGroup(node);

      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }

      groups.get(groupName).push(node);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      return getTypographyDetailsGroupOrder(a[0]) - getTypographyDetailsGroupOrder(b[0]);
    });

    const lines = [];

    sortedGroups.forEach(([groupName, groupNodes], groupIndex) => {
      if (groupIndex > 0) {
        lines.push("");
      }

      lines.push(groupName);

      groupNodes.forEach((node, index) => {
        const d = node.data;
        const textField = getReportTextField(d);
        const isLast = index === groupNodes.length - 1;

        const connector = isLast ? "└ " : "├ ";
        const detailPrefix = isLast ? "    " : "│   ";
        const spacer = isLast ? "" : "│";

        lines.push(`${connector}${getPlainElementName(node)}`);
        lines.push(`${detailPrefix}${textField.label}: ${textField.value}`);
        lines.push(`${detailPrefix}font-size: ${d.typography.fontSize}`);
        lines.push(`${detailPrefix}line-height: ${d.typography.lineHeight}`);
        lines.push(`${detailPrefix}font-weight: ${d.typography.fontWeight}`);
        lines.push(`${detailPrefix}letter-spacing: ${d.typography.letterSpacing}`);
        lines.push(`${detailPrefix}color: ${formatColor(d.typography.color)}`);

        if (!isLast) {
          lines.push(spacer);
        }
      });
    });

    return lines;
  };

  const typographySummaryRows = getTypographySummaryRows();
  const typographyTextDetailsLines = getTypographyTextDetailsLines();

  const shouldShowSelectedRow = (label, value) => {
    if (value === undefined || value === null) return false;

    const normalized = String(value).trim();

    if (!normalized) return false;

    if (["Padding", "Margin", "Gap", "Font", "Background", "Border Radius", "Box Shadow"].includes(label)) {
      return normalized !== "none";
    }

    if (label === "Border") {
      return normalized !== "none";
    }

    if (label === "Display") {
      return normalized !== "block";
    }

    if (label === "Position") {
      return normalized !== "static";
    }

    if (label === "Align Items" || label === "Justify Content") {
      return normalized !== "normal";
    }

    return true;
  };

  const makeSelectedRow = (label, value) => {
    if (!shouldShowSelectedRow(label, value)) return null;
    return `| ${label} | \`${value}\` |`;
  };

  const selectedRows = (() => {
    if (!selectedNode) return [];

    const d = selectedNode.data;
    const selectedFlexItemValue = getFlexItemValue(d);

    const rows = [
      makeSelectedRow("Element", `${d.role} (${d.tag})`),
      makeSelectedRow("Selector", d.selector),
      makeSelectedRow("Text", getTypographyTextSummary()),
      makeSelectedRow("Rendered Size", formatAdaptiveSize(d, "rendered")),
      makeSelectedRow("Content Box", formatAdaptiveSize(d, "content")),
      makeSelectedRow("Height", fmtPx(d.rendered.height)),
      makeSelectedRow("Width Behavior", inferWidthBehavior(d)),
      makeSelectedRow("Padding", formatTRBL(d.padding.top, d.padding.right, d.padding.bottom, d.padding.left)),
      makeSelectedRow("Margin", formatMarginForAnnotated(d)),
      makeSelectedRow("Border", formatTRBL(d.border.top, d.border.right, d.border.bottom, d.border.left)),
      makeSelectedRow("Display", d.layout.display),
      makeSelectedRow("Position", d.layout.position),
      makeSelectedRow("Gap", formatGap(d)),
      makeSelectedRow("Align Items", d.layout.alignItems),
      makeSelectedRow("Justify Content", d.layout.justifyContent),
      !isDefaultFlexItemValue(selectedFlexItemValue)
        ? makeSelectedRow("Flex Item", selectedFlexItemValue)
        : null,
      makeSelectedRow("Font", formatFont(d)),
      makeSelectedRow("Background", formatVisualValue(d.visual.backgroundColor)),
      makeSelectedRow("Border Radius", formatVisualValue(d.visual.borderRadius)),
      makeSelectedRow("Box Shadow", formatShadowValue(d.visual.boxShadow)),
    ];

    return rows.filter(Boolean);
  })();

  const childBoxLayoutRows = childNodes.map((node) => {
    const d = node.data;
    const flexItemValue = getRawDetailsFlexItemValue(d);

    return `| \`${escapeMd(getRawTreeElementName(node))}\` | \`${fmtPx(d.rendered.height)}\` | \`${formatAdaptiveSize(d, "content")}\` | \`${formatTRBL(d.padding.top, d.padding.right, d.padding.bottom, d.padding.left)}\` | \`${formatTRBL(d.border.top, d.border.right, d.border.bottom, d.border.left)}\` | \`${formatMarginForRaw(d)}\` | \`${formatGap(d)}\` | \`${formatLayoutSummary(d)}\` | \`${flexItemValue}\` | \`${inferWidthBehavior(d)}\` | \`${formatVisualValue(d.visual.backgroundColor)}\` | \`${formatVisualValue(d.visual.borderRadius)}\` | \`${formatShadowValue(d.visual.boxShadow)}\` |`;
  });

  const rawTypographyRows = typographyNodes.map((node) => {
    const d = node.data;
    const textField = getReportTextField(d);

    return `| \`${escapeMd(getRawTreeElementName(node))}\` | \`${textField.label}: ${textField.value}\` | \`${formatFont(d)}\` | \`${d.typography.letterSpacing}\` | \`${formatColor(d.typography.color)}\` |`;
  });

  const shouldShowAnnotatedStructure =
    config.includeAnnotatedStructure &&
    (!config.hideEmptyChildSections || hasChildNodes);

  const shouldShowTypographySection =
    config.includeTypographySection &&
    (!config.hideEmptyChildSections || typographySummaryRows.length > 0 || typographyTextDetailsLines.length > 0);

  const shouldShowRawDetails =
    config.includeRawDetails &&
    (
      !config.hideEmptyChildSections ||
      childBoxLayoutRows.length > 0 ||
      (config.includeRawTextTypography && rawTypographyRows.length > 0)
    );

  const typographyBlock = [
    `### Typography`,
    ``,
    ...(config.includeTypographySummary
      ? [
          `#### Summary`,
          ``,
          typographySummaryRows.length
            ? `| Role | Size | Line Height | Weight | Color | Text |\n|---|---:|---:|---:|---|---|\n${typographySummaryRows.join("\n")}`
            : `No typography summary found.`,
          ``,
        ]
      : []),
    ...(config.includeTypographyTextDetails
      ? [
          `#### Text Details`,
          ``,
          typographyTextDetailsLines.length
            ? `\`\`\`text\n${typographyTextDetailsLines.join("\n")}\n\`\`\``
            : `No text details found.`,
          ``,
        ]
      : []),
  ].join("\n");

  const rawDetailsBlock = [
    `<details>`,
    `<summary>Raw Details</summary>`,
    ``,
    ...(config.includeChildBoxLayoutValues
      ? [
          `#### Box & Layout`,
          ``,
          childBoxLayoutRows.length
            ? `| Element | Height | Content Box | Padding | Border | Margin | Gap | Layout | Flex Item | Width Behavior | Background | Radius | Shadow |\n|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|\n${childBoxLayoutRows.join("\n")}`
            : `No visible child box/layout values found.`,
          ``,
        ]
      : []),
    ...(config.includeRawTextTypography
      ? [
          `#### Text & Typography`,
          ``,
          rawTypographyRows.length
            ? `| Element | Text / Label | Font (size / line-height / weight) | Letter Spacing | Color |\n|---|---|---:|---:|---|\n${rawTypographyRows.join("\n")}`
            : `No meaningful text elements found.`,
          ``,
        ]
      : []),
    `</details>`,
    ``,
  ].join("\n");

  const md = [
    `## Selected Element Box Analysis`,
    ``,
    `> Spacing values follow CSS shorthand order: top / right / bottom / left. \`none\` means all sides are 0px.`,
    `> Width labels: \`fill\` = viewport/large area fill, \`parent-fill\` = parent width fill, \`flex-slot\` = flex-allocated space, \`content-fit\` = width follows inner content. Media assets keep actual px size.`,
    `> Main annotated structure shows implementation-relevant values only. Full width behavior, full layout, and raw visual values are kept in Raw Details. Typography is summarized separately.`,
    `> \`layout: flex\` means this element is a flex container. \`flex-item: 1 1 0%\` fills remaining flex space; \`flex-item: 0 0 auto\` keeps its own size. Default \`0 1 auto\` is hidden in Selected Element and Annotated Structure, and shown as \`default\` in Raw Details.`,
    `> Large computed flex margins may be shown as \`margin-left: auto\` in Annotated Structure, with the computed px value preserved in Raw Details.`,
    `> \`display: contents\` wrappers are skipped visually, but their children are still analyzed.`,
    `> Hidden layers such as closed popovers, inert menus, aria-hidden panels, and mobile dialogs are excluded from visible text analysis.`,
    `> Some interactive elements put spacing on an inner text wrapper. When the a/button has no own padding, that spacing may be shown as \`inner-padding\` in Annotated Structure.`,
    `> Some navigation systems use separate absolute menu trigger buttons. These may be summarized as \`menu-trigger: present\` in Annotated Structure and kept in Raw Details.`,
    `> Header utility icon controls such as search, bag, cart, account, or profile are classified separately from CTA links.`,
    `> Decorative SVGs such as masks, overlays, and background layers are hidden from Annotated Structure and kept in Raw Details.`,
    `> Solid \`rgb(...)\` colors are shown as HEX. \`rgba(...)\` and shadow values are kept as original computed values.`,
    ``,
    ...(config.includeSelectedElement
      ? [
          `### Selected Element`,
          ``,
          selectedRows.length
            ? `| Item | Value |\n|---|---|\n${selectedRows.join("\n")}`
            : `No selected element found.`,
          ``,
        ]
      : []),
    ...(shouldShowAnnotatedStructure
      ? [
          `### Child Elements — Annotated Structure`,
          ``,
          annotatedStructureText
            ? `\`\`\`text\n${annotatedStructureText}\n\`\`\``
            : `No visible child structure found.`,
          ``,
        ]
      : []),
    ...(shouldShowTypographySection
      ? [
          typographyBlock,
        ]
      : []),
    ...(shouldShowRawDetails
      ? [
          rawDetailsBlock,
        ]
      : []),
  ].join("\n");

  const installCopyButton = (markdown) => {
    window.__lastDesignAnalysisMarkdown = markdown;

    window.copyLastDesignAnalysis = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(window.__lastDesignAnalysisMarkdown);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = window.__lastDesignAnalysisMarkdown;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "0";
          textarea.style.opacity = "0";
          document.documentElement.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.documentElement.removeChild(textarea);
        }

        console.log("✅ Markdown copied to clipboard");
        return {
          message: "Markdown copied",
          markdown: "Stored in window.__lastDesignAnalysisMarkdown",
        };
      } catch (error) {
        console.warn("⚠️ Clipboard copy failed.", error);
        return {
          message: "Clipboard copy failed",
          markdown: "Stored in window.__lastDesignAnalysisMarkdown",
          error,
        };
      }
    };

    if (!config.showCopyButton) return;

    const existingButton = document.getElementById("__design_analysis_copy_button");
    if (existingButton) existingButton.remove();

    const button = document.createElement("button");
    button.id = "__design_analysis_copy_button";
    button.type = "button";
    button.textContent = "Copy analysis";

    button.style.position = "fixed";
    button.style.top = "16px";
    button.style.right = "16px";
    button.style.bottom = "auto";
    button.style.left = "auto";
    button.style.zIndex = "2147483647";

    button.style.padding = "10px 14px";
    button.style.borderRadius = "10px";
    button.style.border = "1px solid rgba(255,255,255,0.18)";
    button.style.background = "rgba(20,20,24,0.92)";
    button.style.color = "white";
    button.style.font = "13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    button.style.boxShadow = "0 8px 24px rgba(0,0,0,0.24)";
    button.style.cursor = "pointer";
    button.style.backdropFilter = "blur(8px)";

    button.addEventListener("mouseenter", () => {
      button.style.background = "rgba(38,38,44,0.96)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = "rgba(20,20,24,0.92)";
    });

    button.addEventListener("click", async () => {
      await window.copyLastDesignAnalysis();

      button.textContent = "Copied";

      window.setTimeout(() => {
        button.textContent = "Copy analysis";
      }, 1200);
    });

    document.documentElement.appendChild(button);
  };

  if (config.printToConsole) {
    console.log(md);
  }

  installCopyButton(md);

  if (config.copyToClipboard) {
    window.copyLastDesignAnalysis();
  } else {
    console.log("ℹ️ Markdown stored in window.__lastDesignAnalysisMarkdown");
    console.log("ℹ️ Click the 'Copy analysis' button or run copyLastDesignAnalysis()");
  }

  return {
    message: "Analysis generated",
    markdown: "Stored in window.__lastDesignAnalysisMarkdown",
    copy: "Click the floating button or run copyLastDesignAnalysis()",
    nodeCount: nodes.length,
  };
}
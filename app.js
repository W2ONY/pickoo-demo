/*
 * Pickoo demo（Figma「Okiee 官网 / 11.2 定稿」）
 * 单页应用：#/ Explore、#/chat、#/auto-task、#/favorites；Agent 浮窗 / 全屏、PDP 抽屉 / 全屏、各类弹窗都在本文件。
 * 数据：data/home.json（首页商品）、data/screens.json（弹窗 / 会话 / PDP / Auto-task 素材与文案），都从 Figma 导出。
 * 状态（登录、收藏、Auto-task）存 localStorage（pickoo:*），刷新后保留；?reset 可清空。
 */
(function () {
  "use strict";

  /* ---------- 小工具 ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs)
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "html") e.innerHTML = v;
        else if (k === "text") e.textContent = v;
        else if (k === "style") e.setAttribute("style", v);
        else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? "" : v);
      });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function img(src, attrs) {
    var a = attrs || {};
    a.src = src;
    a.alt = a.alt || "";
    if (!a.loading) a.loading = "lazy";
    return h("img", a);
  }
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function money(v) {
    if (typeof v === "string") {
      if (v.charAt(0) === "$") return v;
      if (!/^[\d.]+$/.test(v)) return "$" + v;
      v = Number(v);
    }
    return (
      "$" +
      Number(v).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  function slug(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  }
  function toast(text) {
    var t = h("div", { class: "toast", text: text });
    $("#toast-root").appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 2300);
  }
  var I = {
    arrowGray: "assets/icons/arrow-right-gray.svg",
    arrowPink: "assets/icons/arrow-right-pink.svg",
    arrowWhite: "assets/icons/arrow-right-white.svg",
    plus: "assets/icons/plus.svg",
    next: "assets/icons/scroll-next.svg",
    sparkle: "assets/icons/sparkle.svg",
    logo: "assets/icons/pickoo-logo.svg",
  };
  var SVG = {
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    sort: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"><path d="M5.83 3.33v13.34M5.83 16.67 2.5 13.33M5.83 16.67l3.34-3.34M14.17 16.67V3.33M14.17 3.33 10.83 6.67M14.17 3.33l3.33 3.34"/></svg>',
    down: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4.17v11.66M15.83 10 10 15.83 4.17 10"/></svg>',
    grid: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>',
  };

  /* ---------- 状态 ---------- */
  var KEY = "pickoo:";
  if (/[?&]reset\b/.test(location.search))
    Object.keys(localStorage)
      .filter(function (k) {
        return k.indexOf(KEY) === 0;
      })
      .forEach(function (k) {
        localStorage.removeItem(k);
      });
  function load(k, d) {
    try {
      var v = JSON.parse(localStorage.getItem(KEY + k));
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  }
  function save(k, v) {
    try {
      localStorage.setItem(KEY + k, JSON.stringify(v));
    } catch (e) {}
  }
  var S = {
    loggedIn: load("login", false),
    likes: load("likes", null), // 商品 id → 商品对象；null = 用设计稿里的默认收藏
    tasks: load("tasks", null), // null = 设计稿里的默认 8 条
    sort: "default",
    cat: "all",
  };
  var D = { home: null, screens: null };

  /* ---------- 路由 ---------- */
  var ROUTES = ["explore", "chat", "auto-task", "favorites"];
  function route() {
    var r = (location.hash.replace(/^#\/?/, "") || "explore").split("?")[0];
    return ROUTES.indexOf(r) >= 0 ? r : "explore";
  }
  function go(r) {
    var target = "#/" + (r === "explore" ? "" : r);
    if (location.hash !== target) location.hash = target;
    else render();
  }
  window.addEventListener("hashchange", render);

  /* ---------- Header ---------- */
  function renderHeader() {
    var hd = $("#hd");
    hd.textContent = "";
    hd.appendChild(
      h("button", { class: "hd-logo", onclick: go.bind(null, "explore") }, [
        img(I.logo, { loading: "eager" }),
        h("span", { text: "Pickoo" }),
      ]),
    );
    var tabs = h("nav", { class: "hd-tabs" });
    [
      ["explore", "Explore"],
      ["chat", "Chat"],
      ["auto-task", "Auto-task"],
      ["favorites", "Favorites"],
    ].forEach(function (t) {
      var b = h(
        "button",
        {
          class: "hd-tab" + (route() === t[0] ? " is-active" : ""),
          onclick: function () {
            if (t[0] === "chat") Agent.openPage();
            else go(t[0]);
          },
        },
        [t[1]],
      );
      if (t[0] === "chat" && Agent.unread)
        b.appendChild(h("i", { class: "dot" }));
      tabs.appendChild(b);
    });
    hd.appendChild(tabs);
    var right = h("div", { class: "hd-right" });
    right.appendChild(
      h(
        "button",
        {
          class: "hd-chrome",
          onclick: toast.bind(null, "Pickoo for Chrome is coming soon"),
        },
        [
          img("assets/img/chrome.png", { loading: "eager" }),
          h("span", { text: "Add Pickoo to Chrome" }),
        ],
      ),
    );
    if (S.loggedIn)
      right.appendChild(
        h(
          "button",
          {
            class: "hd-avatar",
            "aria-label": "Account",
            onclick: UserMenu.toggle,
          },
          [img(avatarSrc(), { loading: "eager" })],
        ),
      );
    else
      right.appendChild(
        h("button", { class: "hd-login", text: "Log in", onclick: Login.open }),
      );
    hd.appendChild(right);
  }
  function avatarSrc() {
    return (
      (D.screens && D.screens.F && D.screens.F.avatar) ||
      "assets/img/avatar.png"
    );
  }

  /* ---------- Explore ---------- */
  var QUESTIONS = [
    "Which everyday tote fits my work essentials?",
    "How can I make my bedroom feel more restful?",
    "Which light layer works for cooler weekends?",
    "Which sofa fits my living room layout?",
    "Which sofa fits my living room layout?",
  ];
  function walmartMark() {
    var m = h("span", { class: "walmart-mark" });
    var a = h(
      "span",
      {
        style:
          "inset:0.21% 0 0.21% 79.05%;-webkit-mask-image:url(assets/icons/walmart-g18.svg);mask-image:url(assets/icons/walmart-g18.svg);-webkit-mask-size:17.425px 19.267px;mask-size:17.425px 19.267px",
      },
      [img("assets/icons/walmart-g19.svg", { loading: "eager" })],
    );
    var b = h(
      "span",
      {
        style:
          "inset:21.83% 28.06% 21.62% 0;-webkit-mask-image:url(assets/icons/walmart-g34.svg);mask-image:url(assets/icons/walmart-g34.svg);-webkit-mask-size:55.351px 14.897px;mask-size:55.351px 14.897px",
      },
      [img("assets/icons/walmart-g35.svg", { loading: "eager" })],
    );
    m.appendChild(a);
    m.appendChild(b);
    return m;
  }
  // 四个椭圆入口：图层位置按 Figma 绝对坐标还原（相对 357×168 的入口区）
  var CAPS = [
    {
      key: "compare",
      label: "Compare Prices",
      scene: function () {
        return [
          img("assets/img/cap-sneaker.png", {
            loading: "eager",
            style:
              "left:48.5px;top:3px;width:260px;height:173.333px;filter:drop-shadow(0 3.743px 6.738px rgba(38,43,51,0.1))",
          }),
          h(
            "span",
            {
              class: "mk mk-amazon",
              style:
                "left:65.8px;top:39.5px;width:84px;height:32px;transform:rotate(-8deg)",
            },
            [
              img("assets/icons/amazon.svg", {
                loading: "eager",
                style: "width:66px;height:19.92px",
              }),
            ],
          ),
          h(
            "span",
            {
              class: "mk mk-ebay",
              style:
                "left:160.8px;top:14.6px;width:64px;height:34px;transform:rotate(7deg)",
            },
            [
              img("assets/icons/ebay.svg", {
                loading: "eager",
                style: "width:46px;height:18.435px",
              }),
            ],
          ),
          h(
            "span",
            {
              class: "mk mk-walmart",
              style:
                "left:236.2px;top:42.7px;width:94px;height:32px;transform:rotate(-5deg)",
            },
            [walmartMark()],
          ),
        ];
      },
    },
    {
      key: "track",
      label: "Track Price Drops",
      scene: function () {
        return [
          img("assets/img/cap-headphones.png", {
            loading: "eager",
            style:
              "left:37.94px;top:-41.56px;width:255.808px;height:255.808px;transform:rotate(27.26deg);filter:drop-shadow(0 4px 3.6px rgba(38,43,51,0.1))",
          }),
          h("span", {
            class: "off-tag",
            style: "left:176.5px",
            text: "30% OFF",
          }),
        ];
      },
    },
    {
      key: "budget",
      label: "Shop Within Budget",
      scene: function () {
        return [
          img("assets/img/cap-weekender.png", {
            loading: "eager",
            style:
              "left:82.1px;top:0.8px;width:182.4px;height:159.549px;filter:drop-shadow(0 4px 3.6px rgba(38,43,51,0.1))",
          }),
        ];
      },
    },
    {
      key: "ideas",
      label: "Find Shopping Ideas",
      scene: function () {
        return [
          img("assets/img/cap-camping.png", {
            loading: "eager",
            style:
              "left:67.3px;top:1.6px;width:222.4px;height:164.967px;filter:drop-shadow(0 4px 3.6px rgba(38,43,51,0.1))",
          }),
        ];
      },
    },
  ];

  function productCard(p, opts) {
    opts = opts || {};
    var c = h("article", { class: "pcard " + (opts.cls || ""), tabindex: "0" });
    // imgBg 为 null：图片满版、不叠底色；有底色时图片 multiply 叠在 #f8f8f8 上（Figma 商品卡做法）
    var im = h("div", {
      class: "pcard-img" + (p.imgBg === null ? " is-bleed" : ""),
      style: p.imgBg ? "background:" + p.imgBg : null,
    });
    if (p.image)
      im.appendChild(
        img(p.image, { style: p.imgStyle || "inset:0;width:100%;height:100%" }),
      );
    if (p.imgOverlay)
      im.appendChild(
        h("span", { class: "pcard-veil", style: "background:" + p.imgOverlay }),
      );
    if (opts.badge && p.discount)
      c.appendChild(h("span", { class: "pcard-badge", text: p.discount }));
    if (opts.task && p.autoTask !== false)
      c.appendChild(
        h("button", {
          class: "pcard-task",
          html: '<img src="assets/icons/auto-task.svg" alt="" width="16" height="16">Auto-task',
          onclick: function (e) {
            e.stopPropagation();
            Caps.open("track", { product: p });
          },
        }),
      );
    c.appendChild(im);
    var body = h("div", { class: "pcard-body" });
    body.appendChild(h("p", { class: "pcard-name", text: p.name }));
    if (p.benefit) body.appendChild(benefit(p.benefit, p.benefitTail));
    body.appendChild(priceRow(p));
    if (p.store) body.appendChild(fromTag(p));
    c.appendChild(body);
    c.addEventListener("click", function () {
      Pdp.open(p, opts.pdpMode);
    });
    c.addEventListener("keydown", function (e) {
      if (e.key === "Enter") Pdp.open(p, opts.pdpMode);
    });
    return c;
  }
  function fromTag(p) {
    var t = h("span", { class: "from" + (p.storeIcon ? " has-logo" : "") });
    if (p.storeIcon) t.appendChild(img(p.storeIcon, { loading: "eager" }));
    t.appendChild(
      document.createTextNode(
        /^from /i.test(p.store) ? p.store : "From " + p.store,
      ),
    );
    return t;
  }
  function benefit(text, tail) {
    var b = h("div", { class: "benefit" }, [
      img(I.sparkle, { loading: "eager" }),
      h("span", { text: text }),
    ]);
    if (tail) b.appendChild(h("em", { text: tail }));
    return b;
  }
  function priceRow(p) {
    var r = h("div", { class: "price" }, [h("b", { text: money(p.price) })]);
    if (p.was) r.appendChild(h("s", { text: money(p.was) }));
    return r;
  }
  function rail(items, make) {
    var wrap = h("div", { class: "rail" });
    var track = h("div", { class: "rail-track" });
    items.forEach(function (it) {
      track.appendChild(make(it));
    });
    var prev = h(
      "button",
      { class: "rail-btn rail-prev", "aria-label": "Previous", hidden: true },
      [img(I.next, { loading: "eager" })],
    );
    var next = h(
      "button",
      { class: "rail-btn rail-next", "aria-label": "Next" },
      [img(I.next, { loading: "eager" })],
    );
    prev.onclick = function () {
      track.scrollBy({ left: -track.clientWidth * 0.8 });
    };
    next.onclick = function () {
      track.scrollBy({ left: track.clientWidth * 0.8 });
    };
    function sync() {
      prev.hidden = track.scrollLeft < 8;
      next.hidden =
        track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    }
    track.addEventListener("scroll", sync, { passive: true });
    setTimeout(sync, 60);
    window.addEventListener("resize", sync);
    wrap.appendChild(track);
    wrap.appendChild(prev);
    wrap.appendChild(next);
    return wrap;
  }

  function renderExplore(view) {
    var H = D.home || {};
    var hero = h("section", { class: "hero" });
    hero.appendChild(
      h("h1", { class: "hero-title", text: "Pickoo finds deals. You save." }),
    );
    var chips = h("div", { class: "hero-chips" });
    QUESTIONS.forEach(function (q) {
      chips.appendChild(
        h("button", { class: "q-chip", onclick: Agent.ask.bind(null, q) }, [
          h("span", { text: q }),
          img(I.arrowGray, { loading: "eager" }),
        ]),
      );
    });
    hero.appendChild(chips);
    var caps = h("div", { class: "caps" });
    CAPS.forEach(function (cap) {
      var b = h("button", {
        class: "cap",
        onclick: Caps.open.bind(null, cap.key, null),
      });
      b.appendChild(h("span", { class: "cap-oval" }));
      b.appendChild(h("span", { class: "cap-scene" }, cap.scene()));
      b.appendChild(
        h("span", { class: "cap-label" }, [
          h("span", { text: cap.label }),
          h("span", { class: "cap-arrow" }, [
            img(I.arrowPink, { loading: "eager" }),
          ]),
        ]),
      );
      caps.appendChild(b);
    });
    hero.appendChild(caps);
    view.appendChild(hero);

    if (H.topDeals && H.topDeals.length) {
      var top = h("section", { class: "sec" }, [
        h("div", { class: "sec-head" }, [
          h("h2", { class: "sec-title", text: "Top deals of the day" }),
        ]),
      ]);
      top.appendChild(
        rail(H.topDeals, function (p) {
          return productCard(p, { cls: "top-card", badge: true, task: true });
        }),
      );
      view.appendChild(top);
    }
    if (H.wholeList && H.wholeList.length) {
      var wl = h("section", { class: "sec" }, [
        h("div", { class: "sec-head" }, [
          h("h2", { class: "sec-title", text: "Shop the Whole List" }),
          h("p", {
            class: "sec-sub",
            text: "A few things that work better together, priced as one order.",
          }),
        ]),
      ]);
      wl.appendChild(rail(H.wholeList, wholeListCard));
      view.appendChild(wl);
    }
    view.appendChild(dealsSection(H));
  }

  function wholeListCard(L) {
    var c = h("button", {
      class: "wl-card",
      onclick: Agent.showList.bind(null, L),
    });
    if (L.bg) c.appendChild(img(L.bg, { class: "wl-bg" }));
    c.appendChild(
      h("span", {
        class: "wl-shade",
        style:
          "background:" +
          (L.gradient ||
            "linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,.15) 45%,rgba(0,0,0,.5) 100%)"),
      }),
    );
    c.appendChild(
      h("span", { class: "wl-pill" }, [
        h("span", { text: "✦" }),
        h("span", { text: L.context || L.tag || "" }),
      ]),
    );
    var t = h(
      "span",
      { class: "wl-text" + (L.layout === "B" ? " is-b" : "") },
      [
        h("h3", {
          class: "wl-title",
          html: (L.titleLines || [L.title]).join("<br>"),
        }),
        h("div", { class: "wl-count", text: L.usefulThings || L.count || "" }),
        h("div", { class: "wl-price", text: money(L.price) }),
        L.was ? h("div", { class: "wl-was", text: money(L.was) }) : null,
      ],
    );
    c.appendChild(t);
    var th = h("span", { class: "wl-thumbs" });
    (L.thumbs || []).slice(0, 3).forEach(function (t) {
      var src = typeof t === "string" ? t : t.src;
      th.appendChild(
        h("span", { style: "background:" + (t.bg || "transparent") }, [
          img(src),
        ]),
      );
    });
    c.appendChild(th);
    return c;
  }

  // Deals for You：Default / Discount 排序 + 分类筛选
  function dealsSection(H) {
    var sec = h("section", { class: "sec" }, [
      h("div", { class: "sec-head" }, [
        h("h2", { class: "sec-title", text: "Deals for You" }),
      ]),
    ]);
    var pills = h("div", { class: "pills" });
    var grid = h("div", { class: "deal-grid" });
    function paint() {
      pills.textContent = "";
      var dflt = h("button", {
        class: "pill" + (S.sort === "default" ? " is-on" : ""),
        text: "Default",
      });
      dflt.onclick = function () {
        S.sort = "default";
        paint();
      };
      var disc = h("button", {
        class: "pill" + (S.sort === "discount" ? " is-on" : ""),
        html: '<span>Discount</span><img src="assets/icons/sort-discount.svg" alt="" width="20" height="20">',
      });
      disc.onclick = function () {
        S.sort = "discount";
        paint();
      };
      pills.appendChild(dflt);
      pills.appendChild(disc);
      pills.appendChild(h("span", { class: "pills-sep" }));
      var cats = (
        H.categories && H.categories.length
          ? H.categories
          : [{ key: "all", label: "All finds" }]
      ).map(function (c) {
        return {
          key: c.key || slug(c.label),
          label: c.label,
          img: c.img,
          icon: c.icon,
          circleBg: c.circleBg,
          imgStyle: c.imgStyle,
          blend: c.blend,
        };
      });
      cats.forEach(function (c) {
        var on = S.cat === c.key || (S.cat === "all" && /^all/.test(c.key));
        var p = h("button", { class: "pill" + (on ? " is-on" : "") });
        var circ = h("span", {
          class: "pill-ico",
          style: c.circleBg ? "background:" + c.circleBg : null,
        });
        if (c.img)
          circ.appendChild(
            img(c.img, {
              loading: "eager",
              style:
                (c.imgStyle || "") +
                (c.blend ? ";mix-blend-mode:" + c.blend : ""),
            }),
          );
        else if (c.icon)
          circ.appendChild(
            img(c.icon, { loading: "eager", class: "is-glyph" }),
          );
        p.appendChild(circ);
        p.appendChild(h("span", { text: c.label }));
        p.onclick = function () {
          S.cat = /^all/.test(c.key) ? "all" : c.key;
          paint();
        };
        pills.appendChild(p);
      });
      grid.textContent = "";
      var list = (H.deals || []).filter(function (p) {
        return S.cat === "all" || catOf(p) === S.cat;
      });
      if (S.sort === "discount")
        list = list.slice().sort(function (a, b) {
          return off(b) - off(a);
        });
      list.forEach(function (p) {
        grid.appendChild(productCard(p));
      });
      if (!list.length)
        grid.appendChild(
          h("p", {
            class: "empty-note",
            style: "grid-column:1/-1",
            text: "No deals in this category yet.",
          }),
        );
    }
    sec.appendChild(pills);
    sec.appendChild(grid);
    paint();
    return sec;
  }
  function off(p) {
    var pr = parseFloat(String(p.price).replace(/[^0-9.]/g, ""));
    var w = parseFloat(String(p.was || "").replace(/[^0-9.]/g, ""));
    return w ? (w - pr) / w : 0;
  }
  // 分类按商品名关键词归（设计稿商品没有分类字段）
  var CAT_RULES = [
    ["pets", /\b(cat|dog|pet)\b/i],
    ["kids", /\b(kid|baby|toy|youth)\b/i],
    ["beauty", /parfum|perfume|cleanser|body wash|serum|candle|skin/i],
    ["kitchen", /kettle|grinder|coffee|oven|mug|plate|stoneware|dinner|brew/i],
    ["tech", /camera|charg|headphone|speaker|watch|polaroid|wireless/i],
    ["travel", /carry-on|luggage|suitcase|travel|duffel|weekender/i],
    ["accessories", /bag|tote|crossbody|wallet|strap/i],
    ["fashion", /dress|sweater|loafer|shirt|jacket|coat|shoe/i],
    [
      "home",
      /table|vase|pillow|cushion|duvet|nightstand|chair|sofa|lamp|linen|cover|scent/i,
    ],
  ];
  function catOf(p) {
    if (p.category) return p.category;
    for (var i = 0; i < CAT_RULES.length; i++)
      if (CAT_RULES[i][1].test(p.name)) return CAT_RULES[i][0];
    return "";
  }

  /* ---------- 底部输入框（Explore / Auto-task / Favorites 都有；会话浮窗打开时隐藏） ---------- */
  function composer(opts) {
    opts = opts || {};
    var input = h("input", {
      class: "composer-input",
      type: "text",
      placeholder: opts.placeholder || "Ask Pickoo",
      "aria-label": "Message",
    });
    var send = h("button", { class: "send", "aria-label": "Send" }, [
      img(I.arrowWhite, { loading: "eager" }),
    ]);
    function submit() {
      var v = input.value.trim() || (opts.useHint && input.placeholder);
      if (!v) return;
      input.value = "";
      send.classList.remove("is-ready");
      opts.onSend(v);
    }
    input.addEventListener("input", function () {
      send.classList.toggle("is-ready", !!input.value.trim());
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.isComposing) submit();
    });
    send.onclick = submit;
    var box = h("div", { class: "composer " + (opts.cls || "") }, [
      h("div", { class: "composer-row" }, [
        input,
        h("div", { class: "composer-tools" }, [
          h(
            "button",
            {
              class: "icon-btn",
              "aria-label": "Add photo or file",
              onclick: toast.bind(null, "Attach a photo or link to compare"),
            },
            [img(I.plus, { loading: "eager" })],
          ),
          send,
        ]),
      ]),
    ]);
    box.input = input;
    return box;
  }
  function renderDock() {
    var slot = $("#dock-slot");
    slot.textContent = "";
    if (route() === "chat") return;
    var d = h("div", { class: "dock" + (Agent.isOpen() ? " is-away" : "") }, [
      composer({
        placeholder: "Find a carry-on under $50",
        useHint: true,
        onSend: Agent.ask,
      }),
    ]);
    slot.appendChild(d);
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var r = route();
    document.body.dataset.route = r;
    renderHeader();
    var view = $("#view");
    view.textContent = "";
    UserMenu.close();
    if (r === "explore") renderExplore(view);
    else if (r === "auto-task") Tasks.render(view);
    else if (r === "favorites") Favs.render(view);
    else if (r === "chat") Agent.renderPage(view);
    renderDock();
    window.scrollTo(0, 0);
  }

  /* 以下模块（Agent / Pdp / Caps / Tasks / Favs / Login / UserMenu）在 app-flows.js 里补全；
     这里先给占位，保证首页能单独跑起来 */
  var Agent = {
    unread: true,
    isOpen: function () {
      return false;
    },
    ask: function () {},
    showList: function () {},
    openPage: function () {
      go("chat");
    },
    renderPage: function () {},
  };
  var Pdp = { open: function () {} };
  var Caps = { open: function () {} };
  var Tasks = { render: function () {} };
  var Favs = { render: function () {} };
  var Login = { open: function () {} };
  var UserMenu = { toggle: function () {}, close: function () {} };

  window.Pickoo = {
    h: h,
    img: img,
    $: $,
    money: money,
    slug: slug,
    toast: toast,
    I: I,
    SVG: SVG,
    S: S,
    D: D,
    save: save,
    load: load,
    go: go,
    route: route,
    render: render,
    renderHeader: renderHeader,
    renderDock: renderDock,
    productCard: productCard,
    benefit: benefit,
    priceRow: priceRow,
    composer: composer,
    catOf: catOf,
    avatarSrc: avatarSrc,
    mod: function (name, impl) {
      // 让后续模块替换占位实现
      var target = {
        Agent: Agent,
        Pdp: Pdp,
        Caps: Caps,
        Tasks: Tasks,
        Favs: Favs,
        Login: Login,
        UserMenu: UserMenu,
      }[name];
      Object.keys(impl).forEach(function (k) {
        target[k] = impl[k];
      });
    },
  };

  // home.json 字段 → 渲染用字段（img→image、badge→discount）；id 用商品名，跨区块同一商品共用收藏状态
  function normalize(H) {
    function fix(p) {
      if (!p) return p;
      if (p.img && !p.image) p.image = p.img;
      if (p.badge && !p.discount) p.discount = p.badge;
      p.id = slug(p.name);
      return p;
    }
    ["topDeals", "deals"].forEach(function (k) {
      (H[k] || []).forEach(fix);
    });
    H.categories = (H.categories || []).map(function (c) {
      c.key = /^all/i.test(c.label) ? "all" : slug(c.label);
      return c;
    });
    return H;
  }
  function boot() {
    Promise.all(
      ["data/home.json", "data/screens.json"].map(function (u) {
        return fetch(u)
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .catch(function () {
            return null;
          });
      }),
    ).then(function (res) {
      D.home = normalize(res[0] || {});
      D.screens = res[1] || {};
      if (window.PickooFlows) window.PickooFlows(window.Pickoo);
      render();
    });
  }
  boot();
})();

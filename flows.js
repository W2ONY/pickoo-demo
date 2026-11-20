/*
 * Pickoo demo 交互层：Agent 会话（浮窗 / 全屏 / Chat 页）、PDP（抽屉 / 全屏）、四个能力弹窗、
 * Auto-task、Favorites、登录、用户菜单、Feedback。app.js 加载数据后调用 window.PickooFlows(P)。
 * 素材与尺寸来自 data/screens.json（Figma 实测）；会话回复是本地脚本，按问句意图挑设计稿里的商品，不连后端。
 */
window.PickooFlows = function (P) {
  "use strict";
  var h = P.h,
    img = P.img,
    $ = P.$,
    money = P.money,
    toast = P.toast,
    I = P.I,
    S = P.S,
    D = P.D;
  var SC = D.screens || {};
  var HOME = D.home || {};
  var SA = SC.A_capabilityModals || {},
    SB = SC.B_chatPanel || {},
    SCH = SC.C_fullscreenChat || {},
    SD = SC.D_pdp || {},
    SE = SC.E_autoTask || {},
    SF = SC.F_favoritesAccount || {};

  /* ---------- 图标（Figma 导出的 svg；少量线框图标用内联 svg） ---------- */
  var IC = {
    agentLogo: "assets/icons/pickoo-agent-logo.svg",
    expand: "assets/icons/maximize-01.svg",
    shrink: "assets/icons/minimize-01.svg",
    close: "assets/icons/x-close.svg",
    heartW: "assets/icons/heart-rounded-white.svg",
    heart: "assets/icons/heart-rounded.svg",
    expandW: "assets/icons/maximize-01-white.svg",
    closeW: "assets/icons/close-white.svg",
    sparkleStar: "assets/icons/sparkle-star-small.svg",
    chev16: "assets/icons/chevron-right-16.svg",
    askPickoo: "assets/icons/ask-pickoo.svg",
    chart: "assets/icons/pdp-price-chart.svg",
    link: "assets/icons/link-03.svg",
    upload: "assets/icons/share-01.svg",
    dollar: "assets/icons/currency-dollar-circle.svg",
    dollar24: "assets/icons/currency-dollar-circle-24.svg",
    toggleOn: "assets/icons/toggle-on.svg",
    toggleOff: "assets/icons/toggle-off.svg",
    more: "assets/icons/more-horizontal.svg",
    target: "assets/icons/sparkle-target.svg",
    addW: "assets/icons/add-white.svg",
    chev24: "assets/icons/chevron-right-24.svg",
    clockBlue: "assets/icons/clock-blue.svg",
    trash: "assets/icons/trash-03-red.svg",
    clock48: "assets/icons/clock-48.svg",
    closeModal: "assets/icons/close-modal.svg",
    loginLogo: "assets/icons/login-logo.svg",
    loginClose: "assets/icons/login-close.svg",
    google: "assets/img/google-g.png",
    mCamera: "assets/icons/menu-camera.svg",
    mEdit: "assets/icons/menu-edit-02.svg",
    mLock: "assets/icons/menu-lock-01.svg",
    mGlobe: "assets/icons/menu-globe-outline.svg",
    mFeedback: "assets/icons/menu-feedback.svg",
    mLogout: "assets/icons/menu-logout.svg",
    mChev: "assets/icons/menu-chevron-right.svg",
    mChevDark: "assets/icons/menu-chevron-dark.svg",
    chevSmall: "assets/icons/chevron-right-small.svg",
  };
  var SVG_EXT =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var SVG_HEART_FILL =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.5 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z"/></svg>';
  var SVG_PAUSE =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>';
  var SVG_PLAY =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10-6.5z"/></svg>';
  var SVG_TARGET =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
  function icBtn(cls, src, label, fn) {
    return h("button", { class: cls, "aria-label": label, onclick: fn }, [
      img(src, { loading: "eager" }),
    ]);
  }

  function num(v) {
    return parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, "")) || 0;
  }
  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }
  function esc(s) {
    return String(s).replace(/[<>&"]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
    });
  }
  // screens.json 里的商品 → 渲染用商品
  function prod(x) {
    var store = x.store || "";
    return {
      id: P.slug(x.name),
      name: x.name,
      image: x.img || x.image,
      price: x.price,
      was: x.was,
      store: store,
      benefit: x.benefit || x.benefitHighlight,
      benefitTail: x.benefitRest,
      imgBg: "#f8f8f8",
      storeIcon: /walmart/i.test(store) ? "assets/img/store-walmart.png" : null,
    };
  }
  function allProducts() {
    var seen = {};
    return []
      .concat(HOME.deals || [], HOME.topDeals || [])
      .filter(function (p) {
        if (!p || seen[p.name]) return false;
        seen[p.name] = 1;
        return true;
      });
  }
  function pick(list, n, re) {
    var hit = re
      ? list.filter(function (p) {
          return re.test(p.name);
        })
      : [];
    return hit
      .concat(
        list.filter(function (p) {
          return hit.indexOf(p) < 0;
        }),
      )
      .slice(0, n);
  }
  function pid(p) {
    return p.id || P.slug(p.name);
  }
  var VIEWED = (SA.viewed || []).map(prod);
  var LUGGAGE = (SCH.carryOns || []).map(prod);
  function viewed() {
    return VIEWED.length ? VIEWED : allProducts().slice(0, 8);
  }

  /* ================= 收藏 ================= */
  function likes() {
    if (!S.likes) {
      // 设计稿里收藏页是占位卡；默认收藏用首页 Deals for You 前 10 件
      S.likes = {};
      allProducts()
        .slice(0, 10)
        .forEach(function (p) {
          S.likes[pid(p)] = p;
        });
    }
    return S.likes;
  }
  function isLiked(p) {
    return !!likes()[pid(p)];
  }
  function setLike(p, on) {
    var L = likes();
    if (on) L[pid(p)] = p;
    else delete L[pid(p)];
    P.save("likes", L);
  }

  /* ================= 弹窗基础 ================= */
  var Modal = {
    open: function (node, opts) {
      Modal.close();
      var m = h("div", { class: "mask" }, [node]);
      m.addEventListener("mousedown", function (e) {
        if (e.target === m) Modal.close();
      });
      $("#modal-root").appendChild(m);
      document.addEventListener("keydown", Modal.esc);
      if (opts && opts.focus)
        setTimeout(function () {
          var f = node.querySelector(opts.focus);
          if (f) f.focus();
        }, 50);
    },
    close: function () {
      $("#modal-root").textContent = "";
      document.removeEventListener("keydown", Modal.esc);
    },
    esc: function (e) {
      if (e.key === "Escape") Modal.close();
    },
    head: function (title) {
      return h("div", { class: "modal-head" }, [
        h("span", { text: title }),
        icBtn("agent-ic", IC.closeModal, "Close", Modal.close),
      ]);
    },
  };

  /* ================= Agent 会话 ================= */
  var thread = [];
  // closed | panel | full（full 只出现在 Chat 页）| parked（浮窗里点了商品：会话暂时收起、让位给 PDP，关 PDP 后恢复）
  var mode = "closed";
  var restoreTop = null; // parked 时记下的会话滚动位置
  var chatFrom = "explore"; // 进 Chat 页之前所在的页面，缩小 / 关闭时回到这里
  var lastRoute = P.route();
  var panelMem = {}; // 各页面离开时浮窗是否开着（Explore ↔ Auto-task / Favorites 来回切换时恢复）
  var afterLeave = null; // 离开 Chat 页后会话的去向：panel = 右侧浮窗，closed = 收到底部输入框
  var el = $("#agent");
  function isOpen() {
    return mode !== "closed";
  }
  // 显隐都带过渡：关闭 = 先淡出再隐藏；从隐藏到出现 = 入场动画；浮窗 ↔ 全屏 = left 过渡（同一个元素切 class）
  function reveal(node, show) {
    clearTimeout(node._t);
    if (!show) {
      if (node.hidden) return;
      node.classList.remove("is-entering");
      node.classList.add("is-leaving");
      node._t = setTimeout(function () {
        node.hidden = true;
        node.classList.remove("is-leaving");
        node.textContent = "";
      }, 240);
      return false;
    }
    var wasHidden = node.hidden || node.classList.contains("is-leaving");
    node.classList.remove("is-leaving");
    node.hidden = false;
    if (wasHidden) {
      node.classList.remove("is-entering");
      void node.offsetWidth;
      node.classList.add("is-entering");
      node._t = setTimeout(function () {
        node.classList.remove("is-entering");
      }, 420);
    }
    return true;
  }
  function paintShell() {
    el.classList.toggle("is-full", mode === "full");
    el.classList.toggle("chat-page", P.route() === "chat");
    if (mode === "closed" || mode === "parked") {
      el._th = el._scroll = null;
      reveal(el, false);
      return;
    }
    el.textContent = "";
    el._th = el._scroll = null;
    reveal(el, true);
    el.appendChild(
      h("div", { class: "agent-head" }, [
        img(IC.agentLogo, { loading: "eager" }),
        h("span", { class: "ttl", text: "Pickoo Agent" }),
        h("span", { class: "sp" }),
        icBtn(
          "agent-ic",
          mode === "full" ? IC.shrink : IC.expand,
          mode === "full" ? "Exit full screen" : "Full screen",
          function () {
            if (P.route() === "chat") {
              afterLeave = "panel";
              P.go(chatFrom);
            } else P.go("chat");
          },
        ),
        icBtn("agent-ic", IC.close, "Close", closeAgent),
      ]),
    );
    var scroll = h("div", { class: "agent-scroll" });
    var th = h("div", { class: "thread" });
    if (!thread.length) th.appendChild(greeting());
    thread.forEach(function (m) {
      th.appendChild(m);
    });
    scroll.appendChild(th);
    el.appendChild(scroll);
    el.appendChild(
      h("div", { class: "agent-foot" }, [
        P.composer({
          placeholder: thread.length ? "Ask a follow-up..." : "Ask Pickoo",
          onSend: ask,
        }),
      ]),
    );
    el._th = th;
    el._scroll = scroll;
    // 从 PDP 回来：回到离开时的滚动位置；其他情况贴底
    if (restoreTop != null) {
      var top = restoreTop;
      restoreTop = null;
      requestAnimationFrame(function () {
        scroll.scrollTop = top;
      });
    } else bottom();
  }
  // 设计稿的问候语沿用了别的产品文案（视频 / 文档创作），这里换成购物向，结构不变
  function greeting() {
    return h("div", {
      class: "msg-ai is-plain",
      html:
        "<p>Hi, I’m <b>Pickoo</b> 👋 Your AI team for finding deals and getting shopping done.</p>" +
        "<ul><li><b>Compare prices</b> — Drop a link or a photo and I’ll check every store, coupons and shipping included.</li>" +
        "<li><b>Track price drops</b> — Pick a target price and I’ll message you the moment it gets there.</li>" +
        "<li><b>Shop within budget</b> — Tell me what you need and how much to spend; every pick fits.</li></ul>" +
        (S.loggedIn
          ? "<p><b>What are we shopping for today?</b></p>"
          : "<p><b>Log in and find your first deal!</b></p>"),
    });
  }
  function setMode(m) {
    mode = m;
    paintShell();
    P.renderDock();
    if (pdp.mode === "drawer") paintPdp();
    if (m !== "closed") Agent.unread = false;
  }
  function closeAgent() {
    closePdp();
    if (P.route() === "chat") {
      afterLeave = "closed";
      P.go(chatFrom);
      return;
    }
    setMode("closed");
  }
  function bottom() {
    if (!el._scroll) return;
    requestAnimationFrame(function () {
      el._scroll.scrollTop = el._scroll.scrollHeight;
    });
  }
  function push(node) {
    thread.push(node);
    if (el._th) {
      if (thread.length === 1) {
        var g = el._th.querySelector(".msg-ai.is-plain");
        if (g) g.remove();
        var inp = el.querySelector(".agent-foot .composer-input");
        if (inp) inp.placeholder = "Ask a follow-up...";
      }
      el._th.appendChild(node);
      bottom();
    }
    return node;
  }
  function user(text) {
    return push(h("div", { class: "msg-user", text: text }));
  }
  function refChip(p) {
    return push(
      h("div", { class: "msg-ref" }, [
        img(p.image),
        h("span", { text: p.name }),
      ]),
    );
  }
  function ensureOpen() {
    if (mode === "parked") closePdp();
    if (mode === "closed") setMode(P.route() === "chat" ? "full" : "panel");
    else if (!el._th) paintShell();
  }
  function reply(build, delay) {
    var t = push(h("div", { class: "typing" }, [h("i"), h("i"), h("i")]));
    return wait(delay || 900).then(function () {
      var node = build();
      var i = thread.indexOf(t);
      if (i >= 0) thread[i] = node;
      if (t.parentNode) t.parentNode.replaceChild(node, t);
      // 长回复（带商品卡）：滚到这轮提问处，让问题和回答开头都在视野里；短回复贴底
      var sc = el._scroll;
      if (sc && node.offsetHeight > sc.clientHeight * 0.6) {
        var q = node.previousElementSibling;
        requestAnimationFrame(function () {
          sc.scrollTop = (q || node).offsetTop - 8;
        });
      } else bottom();
      return node;
    });
  }
  function aiBubble(headline, sub) {
    var b = h("div", { class: "msg-ai" });
    if (headline) b.appendChild(h("div", { class: "hl", html: headline }));
    if (sub) b.appendChild(h("div", { class: "sub", html: sub }));
    return b;
  }
  function aiText(html) {
    return h("div", { class: "msg-ai", html: html });
  }
  function gridCards(list) {
    var g = h("div", { class: "chat-grid" });
    list.forEach(function (p) {
      g.appendChild(P.productCard(p, { pdpMode: "drawer" }));
    });
    return g;
  }
  function listCard(p, opts) {
    opts = opts || {};
    var c = h("div", { class: "lcard" + (opts.big ? " is-big" : "") });
    c.appendChild(
      h("span", { class: "lcard-img" }, [
        img(p.image, { style: "width:100%;height:100%;object-fit:contain" }),
      ]),
    );
    var b = h("div", { class: "lcard-body" }, [
      h("div", { class: "lcard-name", text: p.name }),
    ]);
    if (p.benefit) b.appendChild(P.benefit(p.benefit, p.benefitTail));
    b.appendChild(P.priceRow(p));
    if (p.store) {
      var f = h("span", { class: "from" + (p.storeIcon ? " has-logo" : "") });
      if (p.storeIcon) f.appendChild(img(p.storeIcon));
      f.appendChild(
        document.createTextNode(
          /^from /i.test(p.store) ? p.store : "From " + p.store,
        ),
      );
      b.appendChild(f);
    }
    if (opts.action) b.appendChild(opts.action);
    c.appendChild(b);
    c.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      openPdp(p, "drawer");
    });
    return c;
  }

  // 问句 → 回复
  function ask(text) {
    text = String(text || "").trim();
    if (!text) return;
    ensureOpen();
    user(text);
    var t = text.toLowerCase();
    if (/carry-?on|luggage|suitcase/.test(t)) {
      var lug = LUGGAGE.length
        ? LUGGAGE
        : pick(allProducts(), 6, /bag|tote|travel/i);
      var under = lug.filter(function (p) {
        return num(p.price) < 50;
      });
      return reply(function () {
        var b = aiBubble(
          (under.length || lug.length) + " carry-ons under $50",
          "My pick is the " +
            (lug[0]
              ? lug[0].name.split(" ").slice(0, 2).join(" ")
              : "first one") +
            ": the most compact of these bags, and the lowest total I found.",
        );
        var wrap = h("div", { class: "msg-cards-out" }, [b, gridCards(lug)]);
        return wrap;
      }, 1100);
    }
    if (/auto-?task/.test(t)) {
      return reply(function () {
        return aiText(
          "<p>Sure! What should I keep an eye on? For example:</p><ul><li>“Alert me when the HBADA E3 chair drops below $299”</li><li>“Check Walmart for snack restocks every Friday”</li></ul><p>Tasks you set here show up under <b>Auto-task</b>.</p>",
        );
      });
    }
    var adj = /adjust my price tracker for (.+)/i.exec(text);
    if (adj) {
      var task = Tasks.find(adj[1]);
      if (task) return trackForm(task.product, true);
    }
    var words = t
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter(function (w) {
        return (
          w.length > 3 &&
          !/which|what|that|this|with|make|feel|more|works|fits|from|your|have|good|price|tell|about/.test(
            w,
          )
        );
      });
    var re = words.length ? new RegExp(words.join("|"), "i") : null;
    var list = pick(allProducts(), 6, re);
    return reply(function () {
      return h("div", { class: "msg-cards-out" }, [
        aiBubble(
          "Here are " + list.length + " picks I’d look at",
          "Picked for “" +
            esc(text) +
            "”, each at today’s best price across the stores I checked.",
        ),
        gridCards(list),
      ]);
    }, 1200);
  }

  // 比价（1150:158573）
  function compare(p) {
    ensureOpen();
    refChip(p);
    user("Compare prices for this product across all stores");
    var base = num(p.price) || 50;
    var stores = [
      ["Walmart", 0.82],
      ["Amazon", 0.86],
      ["Target", 0.9],
      ["eBay", 0.95],
      ["Best Buy", 0.99],
    ];
    var rows = stores.map(function (s, i) {
      return Object.assign({}, p, {
        id: pid(p) + "-" + i,
        price: (base * s[1]).toFixed(2),
        was: p.was || (base * 1.2).toFixed(2),
        store: s[0],
        storeIcon: s[0] === "Walmart" ? "assets/img/store-walmart.png" : null,
        benefit: i === 0 ? "Lowest total" : null,
        benefitTail: i === 0 ? "coupon and free shipping included." : null,
      });
    });
    var low = num(rows[0].price),
      high = num(rows[rows.length - 1].price);
    return reply(function () {
      var n = aiText(
        "Checked 5 stores for " +
          esc(p.name) +
          " — the lowest total is " +
          money(low) +
          " at Walmart, " +
          money(high - low) +
          " less than the most expensive.",
      );
      var box = h("div", { class: "msg-cards" });
      rows.forEach(function (r) {
        box.appendChild(listCard(r));
      });
      n.appendChild(box);
      return n;
    }, 1400);
  }

  // 降价提醒：会话里出设置表单（2247:89975）→ 提交后确认 + 同类商品 Set Price Tracker（2247:90631）
  function trackForm(p, adjusting) {
    ensureOpen();
    refChip(p);
    user(
      (adjusting ? "Adjust my price tracker for " : "Track ") +
        p.name +
        (adjusting ? "" : " prices"),
    );
    var cur = num(p.price);
    return reply(function () {
      var n = aiText(
        "Sure. " +
          esc(p.name) +
          " is <b>" +
          money(cur) +
          "</b> today. Set the price you want below, and I’ll monitor it and notify you when it drops.",
      );
      n.appendChild(trackerCard(p));
      return n;
    }, 900);
  }
  function trackerCard(p) {
    var cur = num(p.price);
    var pct = 5;
    var card = h("div", { class: "tform" });
    card.appendChild(
      h("div", { class: "tform-prod" }, [
        img(p.image),
        h("div", null, [
          h("b", { text: p.name }),
          h("small", { text: (p.store || "").replace(/^from\s+/i, "") }),
          h("em", { text: "Current price: " + money(cur) }),
        ]),
      ]),
    );
    card.appendChild(h("hr"));
    var input = h("input", {
      type: "text",
      inputmode: "decimal",
      value: (cur * 0.95).toFixed(2),
      "aria-label": "Expected price",
    });
    card.appendChild(
      h("div", null, [
        h("div", { class: "tform-l", text: "Set expected price" }),
        h("label", { class: "tform-price" }, [h("span", { text: "$" }), input]),
      ]),
    );
    var quick = h("div", { class: "tform-chips" });
    [5, 10, 15, 20].forEach(function (n) {
      var b = h("button", {
        class: n === pct ? "is-on" : "",
        text: "-" + n + "%",
      });
      b.onclick = function () {
        pct = n;
        input.value = (cur * (1 - n / 100)).toFixed(2);
        quick.querySelectorAll("button").forEach(function (x) {
          x.classList.toggle("is-on", x === b);
        });
        sync();
      };
      quick.appendChild(b);
    });
    input.addEventListener("input", function () {
      quick.querySelectorAll("button").forEach(function (x) {
        x.classList.remove("is-on");
      });
      sync();
    });
    card.appendChild(
      h("div", null, [
        h("div", { class: "tform-l", text: "Quick input" }),
        quick,
      ]),
    );
    var exp = h("div", { class: "tform-chips" });
    ["7 days", "30 days", "90 days"].forEach(function (d, i) {
      var b = h("button", { class: i === 0 ? "is-on" : "", text: d });
      b.onclick = function () {
        exp.querySelectorAll("button").forEach(function (x) {
          x.classList.toggle("is-on", x === b);
        });
      };
      exp.appendChild(b);
    });
    card.appendChild(
      h("div", null, [
        h("div", { class: "tform-l", text: "Task expiry" }),
        exp,
      ]),
    );
    var checks = h("div", null, [
      h("div", { class: "tform-l", style: "margin:0", text: "Notifications" }),
    ]);
    [
      ["Via Email", true],
      ["Via Desktop notification", false],
    ].forEach(function (c) {
      var b = h("button", { class: "tform-check" + (c[1] ? " is-on" : "") }, [
        h("i"),
        h("span", { text: c[0] }),
      ]);
      b.onclick = function () {
        b.classList.toggle("is-on");
      };
      checks.appendChild(b);
    });
    card.appendChild(checks);
    var submit = h("button", {
      class: "tform-submit",
      text: "Set Price Tracker",
    });
    function sync() {
      var v = num(input.value);
      submit.disabled = !(v > 0 && v < cur);
    }
    submit.onclick = function () {
      var target = Math.round(num(input.value) * 100) / 100;
      card.classList.add("is-done");
      Tasks.add(p, target);
      trackDone(p, target);
    };
    card.appendChild(submit);
    return card;
  }
  function trackDone(p, target) {
    var t = target % 1 ? target.toFixed(2) : String(target);
    user("Alert me if " + p.name + " drops below $" + t);
    var similar = pick(
      allProducts().filter(function (x) {
        return x.name !== p.name;
      }),
      2,
      new RegExp(
        P.catOf(p) === ""
          ? "x^"
          : {
              kitchen: "kettle|grinder|coffee|oven|mug",
              home: "table|vase|pillow|cushion|duvet",
              accessories: "bag|tote",
              fashion: "dress|sweater|loafer",
              tech: "camera|charg|watch",
              beauty: "parfum|candle|cleanser",
            }[P.catOf(p)] || "x^",
        "i",
      ),
    );
    return reply(function () {
      var n = aiText(
        "<p>Done! I’ll watch " +
          esc(p.name) +
          " at every store above and message you here as soon as the total drops below $" +
          t +
          ".</p><p>You can see and edit this alert anytime under <b>Auto-task</b>.</p>",
      );
      var box = h("div", { class: "msg-cards" });
      similar.forEach(function (x) {
        var tracked = Tasks.has(x);
        var b = h("button", {
          class: "btn-brand" + (tracked ? " is-done" : ""),
          text: tracked ? "Tracking" : "Set Price Tracker",
        });
        b.onclick = function () {
          if (b.classList.contains("is-done")) return P.go("auto-task");
          openTrackFor(x);
        };
        box.appendChild(listCard(x, { big: true, action: b }));
      });
      if (similar.length) {
        n.appendChild(
          h("div", {
            class: "sub",
            style: "color:#5f5f68",
            text: "Similar picks you could track too:",
          }),
        );
        n.appendChild(box);
      }
      toast("Added successfully");
      return n;
    }, 1000);
  }
  function openTrackFor(p) {
    trackForm(p);
  }

  // 清单合集 + Like all（2247:95904 → 2406:150274）
  function showList(L) {
    ensureOpen();
    user("Show me the " + L.title + " list");
    var words = (L.title + " " + (L.context || ""))
      .toLowerCase()
      .split(/\W+/)
      .filter(function (w) {
        return w.length > 3 && !/edit|sorted|list/.test(w);
      });
    var hint = {
      carry: "bag|tote|crossbody|watch",
      cozy: "pillow|cushion|candle|duvet|vase|table",
      corner: "pillow|cushion|candle|vase",
      sleep: "duvet|pillow|candle|nightstand",
      slow: "coffee|kettle|grinder|mug",
      mornings: "coffee|kettle|grinder|mug",
      trip: "bag|tote|watch|sweater",
      next: "bag|tote|watch|sweater",
      living: "pillow|cushion|vase|table",
    };
    var re = new RegExp(
      words
        .map(function (w) {
          return hint[w];
        })
        .filter(Boolean)
        .join("|") || "bag",
      "i",
    );
    var n = num(L.usefulThings) || 4;
    var items = pick(allProducts(), n, re);
    return reply(function () {
      var b = aiText(
        "Here’s <b>" +
          esc(L.title) +
          "</b>: " +
          items.length +
          " useful things, " +
          money(L.price) +
          " together" +
          (L.was ? " (usually " + money(L.was) + ")" : "") +
          ".",
      );
      var box = h("div", { class: "msg-cards" });
      items.forEach(function (p) {
        box.appendChild(listCard(p));
      });
      b.appendChild(box);
      var all = h("button", {
        class: "btn-ghost",
        text: "Add All to Favorites",
      });
      all.onclick = function () {
        all.disabled = true;
        items.forEach(function (p) {
          setLike(p, true);
        });
        user("Add All to Favorites");
        reply(function () {
          return h("div", {
            class: "msg-ai is-plain",
            html: "I’ve added all the items to your “Favorites” for you.",
          });
        }, 700);
      };
      b.appendChild(all);
      return b;
    }, 1100);
  }
  function picksReply(userText, headline, sub, list) {
    ensureOpen();
    user(userText);
    return reply(function () {
      return h("div", { class: "msg-cards-out" }, [
        aiBubble(headline, sub),
        gridCards(list),
      ]);
    }, 1300);
  }

  var Agent = {
    unread: true,
    isOpen: isOpen,
    ask: ask,
    showList: showList,
    openPage: function () {
      P.go("chat");
    },
    renderPage: function () {
      mode = "full";
      Agent.unread = false;
      paintShell();
    },
  };

  /* ================= PDP ================= */
  var pdpEl = $("#pdp");
  var pdp = { p: null, mode: "closed", idx: 0 };
  function openPdp(p, m) {
    pdp.p = p;
    pdp.idx = 0;
    pdp.mode = m === "full" ? "full" : "drawer";
    // 浮窗会话里点商品：会话先收起，PDP 占它的位置；全屏会话保持设计稿的叠放（2584:382002）
    if (pdp.mode === "drawer" && mode === "panel") {
      restoreTop = el._scroll ? el._scroll.scrollTop : null;
      mode = "parked";
      paintShell();
    }
    paintPdp();
  }
  function closePdp() {
    pdp.mode = "closed";
    paintPdp();
    if (mode === "parked") {
      mode = "panel";
      paintShell();
      P.renderDock();
    }
  }
  function variantOf(p) {
    var m = /(?:\s[-–]\s|,\s)([A-Za-z\/ ]{3,16})$/.exec(p.name);
    return m ? m[1].trim() : "Default";
  }
  function paintPdp() {
    if (pdp.mode === "closed" || !pdp.p) {
      reveal(pdpEl, false);
      return;
    }
    pdpEl.textContent = "";
    reveal(pdpEl, true);
    pdpEl.classList.toggle("is-full", pdp.mode === "full");
    // 会话是右侧浮窗时，PDP 抽屉开在浮窗左边，不盖住对话；会话全屏时叠在右侧（2584:382002）
    if (pdp.mode === "closed" || !pdp.p) return;
    var p = pdp.p;
    var full = pdp.mode === "full";
    var pics = (p.gallery && p.gallery.length ? p.gallery : [p.image]).filter(
      Boolean,
    );
    var liked = isLiked(p);
    function toggleLike() {
      setLike(p, !isLiked(p));
      toast(isLiked(p) ? "Saved to Favorites" : "Removed from Favorites");
      paintPdp();
      if (P.route() === "favorites") P.render();
    }
    var scroll = h("div", { class: "pdp-scroll" });
    var gal = h("div", { class: "pdp-gal" }, [
      img(pics[pdp.idx] || p.image, { loading: "eager" }),
    ]);
    gal.appendChild(
      h("span", {
        class: "pdp-count",
        text: pdp.idx + 1 + "/" + Math.max(pics.length, 15),
      }),
    );
    if (!full && variantOf(p) !== "Default")
      gal.appendChild(h("span", { class: "pdp-variant", text: variantOf(p) }));
    if (full) {
      var top = h("div", { class: "pdp-top" }, [
        h("button", {
          class: "agent-ic",
          "aria-label": "Save to Favorites",
          onclick: toggleLike,
          html: liked
            ? SVG_HEART_FILL.replace('fill="#fff"', 'fill="#d024ff"')
            : "",
        }),
        icBtn("agent-ic", IC.shrink, "Exit full screen", function () {
          pdp.mode = "drawer";
          paintPdp();
        }),
        icBtn("agent-ic", IC.close, "Close", closePdp),
      ]);
      if (!liked)
        top.firstChild.appendChild(img(IC.heart, { loading: "eager" }));
      pdpEl.appendChild(top);
      var left = h("div", { class: "pdp-left" });
      var th = h("div", { class: "pdp-thumbs" });
      pics.forEach(function (src, i) {
        var b = h("button", { class: i === pdp.idx ? "is-on" : "" }, [
          img(src),
        ]);
        b.onclick = function () {
          pdp.idx = i;
          paintPdp();
        };
        th.appendChild(b);
      });
      left.appendChild(th);
      left.appendChild(gal);
      scroll.appendChild(left);
    } else {
      var likeBtn = h("button", {
        class: "round-btn" + (liked ? " is-on" : ""),
        "aria-label": "Save to Favorites",
        onclick: toggleLike,
      });
      if (liked) likeBtn.innerHTML = SVG_HEART_FILL;
      else likeBtn.appendChild(img(IC.heartW, { loading: "eager" }));
      gal.appendChild(
        h("div", { class: "pdp-tools" }, [
          likeBtn,
          h("span", { class: "sp" }),
          icBtn("round-btn", IC.expandW, "Full screen", function () {
            pdp.mode = "full";
            paintPdp();
          }),
          icBtn("round-btn", IC.closeW, "Close", closePdp),
        ]),
      );
      scroll.appendChild(gal);
    }
    var price = num(p.price);
    var body = h("div", { class: "pdp-body" });
    var head = h("div", { class: "pdp-head" });
    var meta =
      (p.was ? Math.round((1 - price / num(p.was)) * 100) + "% off · " : "") +
      "Authenticated · Free Shipping";
    if (full) {
      head.appendChild(h("h1", { class: "pdp-title", text: p.name }));
      head.appendChild(
        h(
          "button",
          {
            class: "reviews-link",
            onclick: function () {
              ask("What are people saying about " + p.name + "?");
            },
          },
          [
            h("span", { text: "What People are Saying" }),
            img(IC.chev16, { loading: "eager" }),
          ],
        ),
      );
      head.appendChild(
        h("p", {
          class: "pdp-price",
          style: "margin-top:12px",
          text: money(p.price),
        }),
      );
      head.appendChild(h("p", { class: "pdp-meta", text: meta }));
    } else {
      head.appendChild(h("p", { class: "pdp-price", text: money(p.price) }));
      head.appendChild(h("p", { class: "pdp-meta", text: meta }));
      head.appendChild(h("p", { class: "pdp-title", text: p.name }));
    }
    body.appendChild(head);
    var cmp = h("div", { class: "cmp" });
    if (full) {
      cmp.appendChild(
        h("div", { class: "cmp-h" }, [
          h("b", null, [
            img(IC.sparkleStar, { loading: "eager" }),
            h("span", { text: "Lowest in 30 days" }),
          ]),
          h("span", {
            text:
              ", " +
              (p.benefit
                ? p.benefit.charAt(0).toLowerCase() + p.benefit.slice(1)
                : "a good time to buy"),
          }),
        ]),
      );
      cmp.appendChild(
        h("div", null, [
          h("div", { class: "chart" }, [
            img(IC.chart, { loading: "eager" }),
            h("span", { class: "chart-tip", text: money(price) }),
          ]),
          h("div", { class: "chart-x" }, [
            h("span", { text: "30 days ago" }),
            h("span", { text: "Today" }),
          ]),
        ]),
      );
    } else {
      var amz = price * 1.12,
        eb = price * 1.38;
      cmp.appendChild(
        h("div", { class: "cmp-h" }, [
          h("b", null, [
            img(IC.sparkleStar, { loading: "eager" }),
            h("span", { text: "Lowest of 3 stores" }),
          ]),
          h("span", { text: ",  " + money(amz - price) + " less than Amazon" }),
        ]),
      );
      var rows = h("div", { class: "cmp-rows" });
      [
        ["Walmart", price, 62.56, true],
        ["Amazon", amz, 71.1],
        ["Ebay", eb, 77.52],
      ].forEach(function (r) {
        rows.appendChild(
          h(
            "div",
            {
              class: "cmp-row" + (r[3] ? " is-low" : ""),
              style: "--w:" + r[2] + "%",
            },
            [h("span", { text: r[0] }), h("i"), h("em", { text: money(r[1]) })],
          ),
        );
      });
      cmp.appendChild(rows);
    }
    cmp.appendChild(
      h("div", {
        class: "cmp-notes",
        html:
          "Easy Care &amp; Low Maintenance<ul><li><b>Care:</b> Wipe-clean or machine washable for quick, hassle-free upkeep.</li><li><b>Value:</b> " +
          esc(p.benefit || "Designed for everyday use") +
          ".</li></ul>",
      }),
    );
    body.appendChild(cmp);
    body.appendChild(
      optGroup(
        "Color",
        ["Black", "Red", "Blue", "Yellow", "Green", "Brown", "Purple"],
        ["Yellow"],
      ),
    );
    body.appendChild(optGroup("Size", ["Standard", "Large", "Travel"], []));
    scroll.appendChild(body);
    pdpEl.appendChild(scroll);
    var foot = h("div", { class: "pdp-foot" });
    if (full)
      foot.appendChild(
        h("div", {
          style: "font-size:18px;font-weight:500",
          text: "Available at",
        }),
      );
    var quick = h("div", { class: "quick" });
    [
      [
        "Track price",
        function () {
          closePdp();
          trackForm(p);
        },
      ],
      [
        "Is this a good price?",
        function () {
          closePdp();
          ask("Is " + money(p.price) + " a good price for " + p.name + "?");
        },
      ],
      [
        "Compare with another",
        function () {
          openCap("compare", { product: p });
        },
      ],
    ].forEach(function (q) {
      quick.appendChild(h("button", { text: q[0], onclick: q[1] }));
    });
    foot.appendChild(quick);
    var store = (p.store || "Walmart").replace(/^from\s+/i, "");
    foot.appendChild(
      h("div", { class: "buy-row" }, [
        h("button", {
          class: "buy",
          html:
            "Buy at " +
            esc(store) +
            " · " +
            money(p.price).replace(/\.00$/, "") +
            " " +
            SVG_EXT,
          onclick: function () {
            toast("Opening " + store + "… (demo)");
          },
        }),
        h(
          "button",
          {
            class: "ask-p",
            onclick: function () {
              closePdp();
              ensureOpen();
              refChip(p);
              ask("Tell me more about this one");
            },
          },
          [
            img(IC.askPickoo, { loading: "eager" }),
            h("span", { text: "Ask Pickoo" }),
          ],
        ),
      ]),
    );
    pdpEl.appendChild(foot);
  }
  function optGroup(label, opts, disabled) {
    var g = h("div", { class: "opt-group" }, [
      h("span", { text: label + ": " + opts[0] }),
    ]);
    var row = h("div", { class: "opt-chips" });
    opts.forEach(function (o, i) {
      var b = h("button", {
        class: "o-chip" + (i === 0 ? " is-on" : ""),
        text: o,
        disabled: disabled.indexOf(o) >= 0,
      });
      b.onclick = function () {
        row.querySelectorAll(".o-chip").forEach(function (x) {
          x.classList.remove("is-on");
        });
        b.classList.add("is-on");
        g.firstChild.textContent = label + ": " + o;
      };
      row.appendChild(b);
    });
    g.appendChild(row);
    return g;
  }

  /* ================= 四个能力弹窗（1040×790） ================= */
  var MODALS = {};
  (SA.modals || []).forEach(function (m) {
    MODALS[m.key] = m;
  });
  var CAP_TITLES = {
    compare: "Compare Prices",
    track: "Track Price Drops",
    budget: "Shop within budget",
    ideas: "Find shopping ideas",
  };
  var CATS = (SA.categories || []).map(function (c) {
    return { label: c.name, icon: c.img };
  });
  function openCap(key, opts) {
    opts = opts || {};
    var m = MODALS[key] || {};
    var right = h("div", { class: "cap-right" }, [
      Modal.head(m.title || CAP_TITLES[key]),
    ]);
    right.appendChild(
      key === "compare" || key === "track"
        ? productPicker(key, opts.product)
        : chipForm(key),
    );
    var left = h("div", { class: "cap-left is-art" }, [
      img(m.illustration || "assets/img/modal-" + key + ".png", {
        loading: "eager",
        alt: m.headline || "",
      }),
    ]);
    Modal.open(h("div", { class: "modal cap-modal" }, [left, right]), {
      focus: "input",
    });
  }
  function startFlow(fn) {
    Modal.close();
    setTimeout(fn, 30);
  }
  function productPicker(key, preset) {
    var wrap = h("div", {
      style: "display:flex;flex-direction:column;min-height:0;flex:1",
    });
    wrap.appendChild(h("p", { class: "cap-q", text: "Which product?" }));
    var box = h("div", { class: "cap-box" });
    var input = h("input", {
      type: "text",
      placeholder: "Paste a link or Search a product",
    });
    var send = h("button", { class: "send", "aria-label": "Go" }, [
      img(I.arrowWhite, { loading: "eager" }),
    ]);
    var linkIc = img(IC.link, {
      loading: "eager",
      style: "display:none;width:18px;height:18px",
    });
    var chosen = preset || null;
    function sync() {
      var v = input.value.trim();
      linkIc.style.display =
        /\.\w{2,}\//.test(v) || /^https?:/.test(v) ? "block" : "none";
      send.classList.toggle("is-ready", !!v || !!chosen);
    }
    input.addEventListener("input", function () {
      chosen = null;
      tiles.querySelectorAll(".vtile").forEach(function (t) {
        t.classList.remove("is-on");
      });
      sync();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") go();
    });
    function go() {
      var v = input.value.trim();
      var p = chosen;
      if (!p && v) {
        var words = v
          .toLowerCase()
          .replace(/https?:\/\/|www\.|\.com|\/ip\//g, " ")
          .split(/[^a-z0-9]+/)
          .filter(function (w) {
            return w.length > 2 && !/walmart|amazon|ebay|target/.test(w);
          });
        p =
          viewed()
            .concat(allProducts())
            .filter(function (x) {
              return words.some(function (w) {
                return x.name.toLowerCase().indexOf(w) >= 0;
              });
            })[0] || viewed()[0];
      }
      if (!p) return;
      startFlow(function () {
        if (key === "compare") compare(p);
        else trackForm(p);
      });
    }
    send.onclick = go;
    box.appendChild(h("div", { class: "cap-input" }, [linkIc, input, send]));
    box.appendChild(h("div", { class: "cap-or", text: "or" }));
    var file = h("input", {
      type: "file",
      accept: "image/*",
      style: "display:none",
    });
    var drop = h("button", { class: "cap-drop" }, [
      img(IC.upload, { loading: "eager", style: "width:16px;height:16px" }),
      h("span", { html: "Drop a photo here, or <b>browse</b>" }),
    ]);
    function usePhoto(f) {
      chosen = viewed()[0];
      input.value = f.name;
      sync();
      toast("Photo matched to " + chosen.name);
    }
    drop.onclick = function () {
      file.click();
    };
    file.onchange = function () {
      if (file.files[0]) usePhoto(file.files[0]);
    };
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.add("is-over");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.classList.remove("is-over");
        if (ev === "drop" && e.dataTransfer.files[0])
          usePhoto(e.dataTransfer.files[0]);
      });
    });
    box.appendChild(drop);
    box.appendChild(file);
    wrap.appendChild(box);
    wrap.appendChild(
      h("p", {
        class: "cap-viewed-t",
        style: "margin-top:24px",
        text: "Or pick one you viewed",
      }),
    );
    var sc2 = h("div", { class: "cap-scroll" });
    var tiles = h("div", { class: "viewed" });
    var list = viewed().slice();
    if (
      preset &&
      !list.some(function (x) {
        return x.name === preset.name;
      })
    )
      list.unshift(preset);
    list.forEach(function (p) {
      var t = h(
        "button",
        { class: "vtile" + (preset && preset.name === p.name ? " is-on" : "") },
        [
          h("div", { class: "vtile-img" }, [img(p.image)]),
          h("div", { class: "vtile-t", text: p.name }),
          h("b", { text: money(p.price) }),
        ],
      );
      t.onclick = function () {
        if (chosen === p) return go(); // 再点一次 = 开始
        chosen = p;
        tiles.querySelectorAll(".vtile").forEach(function (x) {
          x.classList.toggle("is-on", x === t);
        });
        input.value =
          "walmart.com/ip/" +
          p.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/-$/, "");
        sync();
      };
      tiles.appendChild(t);
    });
    sc2.appendChild(tiles);
    wrap.appendChild(sc2);
    if (preset) {
      input.value =
        "walmart.com/ip/" +
        preset.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/-$/, "");
      setTimeout(sync);
    }
    return wrap;
  }
  function chipForm(key) {
    var budget = key === "budget";
    var wrap = h("div", {
      style: "display:flex;flex-direction:column;min-height:0;flex:1",
    });
    var box = h("div", { class: "cap-box is-form", style: "overflow:auto" });
    var sel = { cat: null, amount: null, occasion: null };
    var sec1 = h("div", null, [
      h("p", {
        class: "chips-t",
        text: budget ? "What are you shopping for?" : "Who's it for?",
      }),
    ]);
    var chips = h("div", { class: "chips" });
    (CATS.length
      ? CATS
      : [{ label: "Home" }, { label: "Tech" }, { label: "Travel" }]
    ).forEach(function (c) {
      var b = h("button", { class: "chip" }, [
        c.icon ? img(c.icon) : null,
        h("span", { text: c.label }),
      ]);
      b.onclick = function () {
        sel.cat = sel.cat === c.label ? null : c.label;
        chips.querySelectorAll(".chip").forEach(function (x) {
          x.classList.toggle("is-on", x === b && sel.cat === c.label);
        });
        sync();
      };
      chips.appendChild(b);
    });
    sec1.appendChild(chips);
    var what = h("input", {
      type: "text",
      placeholder: "e.g. running shoes, a desk lamp, cat food",
    });
    what.addEventListener("input", sync);
    sec1.appendChild(h("label", { class: "field" }, [what]));
    box.appendChild(sec1);
    var sec2 = h("div", null, [
      h("p", { class: "chips-t", text: budget ? "Your budget" : "Occasion" }),
    ]);
    var second = budget
      ? ["$25", "$50", "$100", "$200", "$500"]
      : [
          "Birthday",
          "Anniversary",
          "Housewarming",
          "Home",
          "Holidays",
          "Just because",
        ];
    var minis = h("div", {
      class: "mini-chips" + (budget ? " is-budget" : ""),
    });
    var amt = h("input", {
      type: "text",
      inputmode: budget ? "decimal" : "text",
      placeholder: budget
        ? "Input your budget"
        : "e.g. loves coffee, just moved, new parent",
    });
    second.forEach(function (s) {
      var b = h("button", { class: "mini-chip", text: s });
      b.onclick = function () {
        var k = budget ? "amount" : "occasion";
        sel[k] = sel[k] === s ? null : s;
        minis.querySelectorAll(".mini-chip").forEach(function (x) {
          x.classList.toggle("is-on", x === b && sel[k] === s);
        });
        if (budget) amt.value = sel.amount ? s.replace("$", "") : "";
        sync();
      };
      minis.appendChild(b);
    });
    amt.addEventListener("input", function () {
      if (budget) {
        sel.amount = null;
        minis.querySelectorAll(".mini-chip").forEach(function (x) {
          x.classList.remove("is-on");
        });
      }
      sync();
    });
    sec2.appendChild(minis);
    sec2.appendChild(
      h("label", { class: "field" }, [
        budget ? h("span", { text: "$" }) : null,
        amt,
      ]),
    );
    box.appendChild(sec2);
    wrap.appendChild(box);
    var cta = h("button", {
      class: "btn-pill",
      text: budget ? "Find picks" : "Get ideas",
      disabled: true,
    });
    function sync() {
      var thing = sel.cat || what.value.trim();
      cta.disabled = !(budget ? thing && num(amt.value) : thing);
    }
    cta.onclick = function () {
      var thing = what.value.trim() || sel.cat;
      var re = new RegExp(
        thing
          .split(/\W+/)
          .filter(function (w) {
            return w.length > 2;
          })
          .join("|") || "x^",
        "i",
      );
      if (budget) {
        var b = num(amt.value);
        var fit = allProducts()
          .filter(function (p) {
            return num(p.price) <= b;
          })
          .sort(function (a, c) {
            return num(a.price) - num(c.price);
          });
        var list = pick(fit.length ? fit : allProducts(), 6, re);
        startFlow(function () {
          picksReply(
            "Find " + thing.toLowerCase() + " picks under $" + b,
            list.length + " picks under $" + b,
            "Sorted by value — every one of these fits the budget" +
              (fit.length ? "" : " (closest I could find)") +
              ".",
            list,
          );
        });
      } else {
        var occ = sel.occasion || amt.value.trim();
        var list2 = pick(
          allProducts(),
          6,
          /candle|mug|camera|parfum|pillow|tote|watch/i,
        );
        startFlow(function () {
          picksReply(
            "Gift ideas for " + thing.toLowerCase() + (occ ? " · " + occ : ""),
            list2.length + " ideas worth giving",
            "A mix of practical picks and fun surprises" +
              (occ ? " for " + esc(occ.toLowerCase()) : "") +
              ", all at good prices.",
            list2,
          );
        });
      }
    };
    wrap.appendChild(h("div", { class: "cap-actions" }, [cta]));
    return wrap;
  }
  var Caps = {
    open: function (key, opts) {
      // 首页商品卡上的 Auto-task 标签：直接在会话里出降价提醒表单
      if (key === "track" && opts && opts.product) return trackForm(opts.product);
      openCap(key, opts);
    },
  };

  /* ================= Auto-task ================= */
  function lineFor(t) {
    var pct = t.price ? Math.round((1 - t.target / t.price) * 100) : 0;
    if (!t.on)
      return "Paused. Your target is saved at $" + fmtT(t.target) + ".";
    if (t.hit)
      return (
        "Target reached. " +
        money(t.target - t.price) +
        " below your $" +
        fmtT(t.target) +
        " target."
      );
    return (
      "Alert at $" + fmtT(t.target) + " or less (" + pct + "% below today)."
    );
  }
  function fmtT(v) {
    return v % 1 ? v.toFixed(2) : Number(v).toLocaleString("en-US");
  }
  function defaultTasks() {
    var src = SE.tasks || [];
    return src.map(function (t, i) {
      var m = /\$([\d,]+(?:\.\d+)?)/.exec(t.line || "");
      return {
        id: "t" + i,
        name: t.name,
        image: t.img,
        store: t.store,
        storeLogo: t.storeLogo,
        variant: t.variant,
        price: num(t.price),
        target: m ? num(m[1]) : Math.floor(num(t.price) * 0.85),
        on: t.enabled !== false,
        hit: t.state === "target-reached",
      };
    });
  }
  function tasks() {
    if (!S.tasks) S.tasks = defaultTasks();
    return S.tasks;
  }
  function saveTasks() {
    P.save("tasks", S.tasks);
  }
  function taskProduct(t) {
    return {
      id: P.slug(t.name),
      name: t.name,
      image: t.image,
      price: t.price,
      store: t.store,
      imgBg: "#f8f8f8",
    };
  }
  var atFilter = "all";
  var Tasks = {
    has: function (p) {
      return tasks().some(function (t) {
        return t.name === p.name;
      });
    },
    find: function (name) {
      var t = tasks().filter(function (x) {
        return x.name === name;
      })[0];
      return t ? { task: t, product: taskProduct(t) } : null;
    },
    add: function (p, target) {
      var list = tasks();
      var ex = list.filter(function (t) {
        return t.name === p.name;
      })[0];
      if (ex) {
        ex.target = target;
        ex.on = true;
        ex.hit = false;
      } else
        list.unshift({
          id: "t" + Date.now(),
          name: p.name,
          image: p.image,
          store: (p.store || "").replace(/^from\s+/i, ""),
          storeLogo: p.storeIcon || null,
          variant: p.variant || "",
          price: num(p.price),
          target: target,
          on: true,
          hit: false,
        });
      saveTasks();
      if (P.route() === "auto-task") P.render();
    },
    render: function (view) {
      var page = h("div", { class: "page at-page" });
      page.appendChild(h("h1", { class: "page-title", text: "Auto-task" }));
      page.appendChild(
        h("p", {
          class: "page-sub",
          text: "Pickoo checks prices across stores every hour.",
        }),
      );
      var list = tasks();
      if (!list.length) {
        page.appendChild(
          h("div", { class: "empty" }, [
            img(IC.clock48, { loading: "eager" }),
            h("div", { text: "No auto-task yet" }),
            h("button", {
              class: "btn-pill",
              text: "Set Auto-task",
              onclick: Tasks.chooser,
            }),
          ]),
        );
        view.appendChild(page);
        return;
      }
      var counts = {
        all: list.length,
        hit: list.filter(function (t) {
          return t.hit && t.on;
        }).length,
        watch: list.filter(function (t) {
          return t.on && !t.hit;
        }).length,
        paused: list.filter(function (t) {
          return !t.on;
        }).length,
      };
      var bar = h("div", { class: "at-bar" });
      [
        ["all", "All"],
        ["hit", "Target reached"],
        ["watch", "Watching"],
        ["paused", "Paused"],
      ].forEach(function (f) {
        bar.appendChild(
          h("button", {
            class: "f-chip" + (atFilter === f[0] ? " is-on" : ""),
            html: f[1] + " <span>" + counts[f[0]] + "</span>",
            onclick: function () {
              atFilter = f[0];
              P.render();
            },
          }),
        );
      });
      bar.appendChild(h("span", { class: "sp" }));
      bar.appendChild(
        h("button", { class: "btn-add", onclick: Tasks.chooser }, [
          img(IC.addW, { loading: "eager" }),
          h("span", { text: "Add Auto-Task" }),
        ]),
      );
      page.appendChild(bar);
      var grid = h("div", { class: "at-grid" });
      list
        .filter(function (t) {
          return (
            atFilter === "all" ||
            (atFilter === "hit" && t.hit && t.on) ||
            (atFilter === "watch" && t.on && !t.hit) ||
            (atFilter === "paused" && !t.on)
          );
        })
        .forEach(function (t) {
          grid.appendChild(taskCard(t));
        });
      if (!grid.children.length)
        grid.appendChild(
          h("p", {
            class: "empty-note",
            style: "grid-column:1/-1",
            text: "Nothing here right now.",
          }),
        );
      page.appendChild(grid);
      view.appendChild(page);
    },
    chooser: function () {
      var m = h("div", { class: "modal plain-modal" }, [
        Modal.head("Add Auto-Task"),
      ]);
      function opt(icon, title, desc, fn) {
        return h("button", { class: "opt", onclick: fn }, [
          h("div", { class: "opt-b" }, [
            h("b", null, [
              img(icon, { loading: "eager" }),
              h("span", { text: title }),
            ]),
            h("p", { text: desc }),
          ]),
          img(IC.chev24, { loading: "eager", style: "width:24px;height:24px" }),
        ]);
      }
      m.appendChild(
        opt(
          IC.dollar24,
          "Track price drops",
          "Set a target price and we’ll track it for you. Get notified as soon as it drops to your target.",
          function () {
            Modal.close();
            openCap("track");
          },
        ),
      );
      m.appendChild(
        opt(
          IC.clockBlue,
          "Create a custom task",
          "Describe anything you’d like done and when. We’ll run it for you automatically.",
          function () {
            startFlow(function () {
              ask("I want to set up an auto-task");
            });
          },
        ),
      );
      Modal.open(m);
    },
  };
  function taskCard(t) {
    var c = h("div", {
      class:
        "task" + (t.on ? "" : " is-off") + (t.hit && t.on ? " is-hit" : ""),
    });
    var tg = h(
      "button",
      {
        class: "toggle-img",
        "aria-label": t.on ? "Pause tracker" : "Resume tracker",
        "aria-pressed": t.on ? "true" : "false",
      },
      [img(t.on ? IC.toggleOn : IC.toggleOff, { loading: "eager" })],
    );
    tg.onclick = function () {
      t.on = !t.on;
      saveTasks();
      P.render();
    };
    c.appendChild(
      h("div", { class: "task-h" }, [
        img(IC.dollar, { loading: "eager" }),
        h("span", { text: "Price tracker" }),
        h("span", { class: "sp" }),
        tg,
      ]),
    );
    var merchant = h("span", { class: "merchant" }, [
      t.storeLogo ? img(t.storeLogo) : null,
      h("span", { text: t.store || "" }),
    ]);
    c.appendChild(
      h(
        "div",
        {
          class: "task-p",
          onclick: function () {
            openPdp(taskProduct(t), "drawer");
          },
        },
        [
          h("span", { class: "lcard-img" }, [
            img(t.image, {
              style: "width:100%;height:100%;object-fit:contain",
            }),
          ]),
          h("div", { style: "min-width:0" }, [
            h("b", { text: t.name }),
            h("small", { text: t.variant || "" }),
            merchant,
            h("span", { class: "pr", text: money(t.price) }),
          ]),
        ],
      ),
    );
    var alert = h("div", { class: "task-alert" });
    if (t.hit && t.on)
      alert.appendChild(
        img(IC.target, { loading: "eager", style: "width:16px;height:16px" }),
      );
    alert.appendChild(h("span", { text: lineFor(t) }));
    c.appendChild(alert);
    var more = h("button", { class: "more-btn", "aria-label": "More" }, [
      img(IC.more, { loading: "eager" }),
    ]);
    more.onclick = function (e) {
      e.stopPropagation();
      var open = more.querySelector(".more-menu");
      document.querySelectorAll(".more-menu").forEach(function (m) {
        m.remove();
      });
      if (open) return;
      more.appendChild(
        h("div", { class: "more-menu" }, [
          h("button", {
            html:
              (t.on ? SVG_PAUSE : SVG_PLAY) +
              "<span>" +
              (t.on ? "Pause" : "Resume") +
              "</span>",
            onclick: function (ev) {
              ev.stopPropagation();
              t.on = !t.on;
              saveTasks();
              P.render();
            },
          }),
          h("button", {
            html: SVG_TARGET + "<span>Adjust target</span>",
            onclick: function (ev) {
              ev.stopPropagation();
              adjust(t);
            },
          }),
          h("button", {
            class: "is-danger",
            html:
              '<img src="' +
              IC.trash +
              '" alt="" width="16" height="16"><span>Delete task</span>',
            onclick: function (ev) {
              ev.stopPropagation();
              confirmDelete(t);
            },
          }),
        ]),
      );
    };
    c.appendChild(
      h("div", { class: "task-f" }, [
        h("span", { text: "Notify via:" }),
        h("span", { class: "tag", text: "Pickoo Web/App" }),
        h("span", { class: "tag", text: "Email" }),
        h("span", { class: "sp" }),
        h("button", {
          class: "btn-line",
          text: "Adjust with Pickoo",
          onclick: adjust.bind(null, t),
        }),
        more,
      ]),
    );
    return c;
  }
  function adjust(t) {
    startFlow(function () {
      trackForm(taskProduct(t), true);
    });
  }
  function confirmDelete(t) {
    Modal.open(
      h("div", { class: "modal plain-modal", style: "width:440px" }, [
        Modal.head("Delete this auto-task?"),
        h("p", {
          style:
            "margin:0 0 24px;color:rgba(0,0,0,.65);font-size:15px;line-height:1.5",
          text:
            "Pickoo will stop watching " + t.name + ". This can't be undone.",
        }),
        h("div", { style: "display:flex;justify-content:flex-end;gap:12px" }, [
          h("button", {
            class: "btn-line",
            text: "Cancel",
            onclick: Modal.close,
          }),
          h("button", {
            class: "btn-pill",
            style: "background:#ff4742",
            text: "Delete",
            onclick: function () {
              S.tasks = tasks().filter(function (x) {
                return x !== t;
              });
              saveTasks();
              Modal.close();
              toast("Auto-task deleted");
              P.render();
            },
          }),
        ]),
      ]),
    );
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".more-btn"))
      document.querySelectorAll(".more-menu").forEach(function (m) {
        m.remove();
      });
  });

  /* ================= Favorites ================= */
  var Favs = {
    render: function (view) {
      var page = h("div", { class: "page page-wide fav-page" });
      page.appendChild(
        h("h1", { class: "fav-title", text: "Favorites Products" }),
      );
      var L = likes();
      var list = Object.keys(L).map(function (k) {
        return L[k];
      });
      if (!list.length) {
        page.appendChild(
          h("div", { class: "empty" }, [
            img(IC.heart, {
              loading: "eager",
              style: "width:48px;height:48px;opacity:.4",
            }),
            h("div", { text: "No favorites yet" }),
            h("button", {
              class: "btn-pill",
              text: "Explore deals",
              onclick: P.go.bind(null, "explore"),
            }),
          ]),
        );
      } else {
        var g = h("div", { class: "fav-grid" });
        list.forEach(function (p) {
          g.appendChild(P.productCard(p, { pdpMode: "drawer" }));
        });
        page.appendChild(g);
      }
      view.appendChild(page);
    },
  };

  /* ================= 登录 / 用户菜单 / Feedback ================= */
  var USER = { name: "Xiaoqing Ma", email: "xiaoqing.ma@example.com" };
  var Login = {
    open: function () {
      Modal.open(
        h("div", { class: "modal login" }, [
          icBtn("agent-ic modal-x", IC.loginClose, "Close", Modal.close),
          img(IC.loginLogo, { loading: "eager" }),
          h("h2", { text: "Welcome to Pickoo" }),
          h(
            "button",
            {
              class: "g-btn",
              onclick: function () {
                S.loggedIn = true;
                P.save("login", true);
                Modal.close();
                toast("Signed in as " + USER.name);
                P.render();
                if (isOpen()) paintShell();
              },
            },
            [
              img(IC.google, { loading: "eager" }),
              h("span", { text: "Continue with Google" }),
            ],
          ),
          h("div", { class: "legal-wrap" }, [
            h("p", {
              class: "legal",
              html: "By logging in, you agree to Pickoo’s <a href='#' onclick='return false'>Terms of Service</a> &amp; <a href='#' onclick='return false'>Privacy Policy</a>",
            }),
            h("p", { class: "legal powered", text: "Powered by Migoo" }),
          ]),
        ]),
      );
    },
  };
  var menuEl = null;
  var UserMenu = {
    toggle: function (e) {
      if (e) e.stopPropagation();
      if (menuEl) return UserMenu.close();
      menuEl = h("div", { class: "umenu" });
      menuEl.appendChild(
        h("div", { class: "umenu-me" }, [
          h("span", { class: "umenu-av" }, [
            img(P.avatarSrc(), { loading: "eager" }),
            h("i", null, [img(IC.mCamera, { loading: "eager" })]),
          ]),
          h("span", { text: USER.name }),
          img(IC.mEdit, { loading: "eager", class: "edit" }),
        ]),
      );
      var list = h("div", { class: "umenu-list" });
      function item(icon, label, fn, cls) {
        return h(
          "button",
          { class: "umenu-item " + (cls || ""), onclick: fn },
          [
            img(icon, { loading: "eager" }),
            h("span", { text: label }),
            h("span", { class: "sp" }),
            img(IC.mChev, { loading: "eager", class: "chev" }),
          ],
        );
      }
      list.appendChild(
        item(IC.mLock, "Web Permissions", function () {
          UserMenu.close();
          permissionsDialog();
        }),
      );
      list.appendChild(
        item(IC.mGlobe, "Language", function () {
          UserMenu.close();
          languageDialog();
        }),
      );
      list.appendChild(
        item(IC.mFeedback, "Feedback & Support", function () {
          UserMenu.close();
          feedback();
        }),
      );
      list.appendChild(
        item(
          IC.mLogout,
          "Logout",
          function () {
            UserMenu.close();
            S.loggedIn = false;
            P.save("login", false);
            toast("Logged out");
            P.render();
          },
          "is-danger",
        ),
      );
      menuEl.appendChild(list);
      menuEl.appendChild(
        h("div", {
          class: "umenu-foot",
          html: "Terms of Service &nbsp;·&nbsp; Privacy",
        }),
      );
      document.body.appendChild(menuEl);
    },
    close: function () {
      if (menuEl) menuEl.remove();
      menuEl = null;
    },
  };
  document.addEventListener("click", function (e) {
    if (menuEl && !menuEl.contains(e.target)) UserMenu.close();
  });
  /* 设置弹窗（Figma 2408:156892 Web Permissions / 2408:157078 Language）：600×640 灰底，内部白色分组列表 */
  var SET_ICONS = {
    location:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17V11a6 6 0 0 1 12 0v6M4 17h16M10 20.5h4"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>',
  };
  function settingsDialog(title, body) {
    Modal.open(h("div", { class: "modal set-modal" }, [Modal.head(title), body]));
  }
  // 权限状态记在 localStorage；点一行在 Allowed / Blocked 间切换（演示用，不调浏览器权限）
  var PERMS = [
    ["location", "Location"],
    ["mic", "Microphone"],
    ["bell", "Notification"],
  ];
  function permissionsDialog() {
    var state = P.load("perms", {});
    var list = h("div", { class: "set-list" });
    PERMS.forEach(function (pm) {
      var on = state[pm[0]] !== false;
      var val = h("span", { class: "set-val", text: on ? "Allowed" : "Blocked" });
      var row = h("button", { class: "set-row has-icon" }, [
        h("span", { class: "set-ic", html: SET_ICONS[pm[0]] }),
        h("span", { class: "set-label", text: pm[1] }),
        val,
        h("span", { class: "set-chev", html: SET_ICONS.chev }),
      ]);
      row.onclick = function () {
        on = !on;
        state[pm[0]] = on;
        P.save("perms", state);
        val.textContent = on ? "Allowed" : "Blocked";
        toast(pm[1] + (on ? " allowed" : " blocked"));
      };
      list.appendChild(row);
    });
    settingsDialog("Web Permissions", list);
  }
  // 设计稿列表里 "Ing" 含义不明、"Espariol" 是笔误：去掉前者，其余按正确拼写
  var LANGS = ["English", "Bahasa Indonesia", "日本語", "Português", "Tiếng Việt", "Español (Argentina)", "Español (México)", "Español", "Français", "Deutsch"];
  function languageDialog() {
    var cur = P.load("lang", "English");
    var list = h("div", { class: "set-list" });
    LANGS.forEach(function (l) {
      var row = h("button", { class: "set-row" + (l === cur ? " is-on" : "") }, [h("span", { class: "set-label", text: l }), h("span", { class: "set-check", html: SET_ICONS.check })]);
      row.onclick = function () {
        P.save("lang", l);
        list.querySelectorAll(".set-row").forEach(function (r) {
          r.classList.toggle("is-on", r === row);
        });
        toast("Language set to " + l + (l === "English" ? "" : " (demo stays in English)"));
      };
      list.appendChild(row);
    });
    settingsDialog("Language", list);
  }
  function feedback() {
    var ta = h("textarea", {
      class: "fb-text",
      maxlength: "5000",
      placeholder: "Please fill out your feedback.",
    });
    var count = h("div", { class: "fb-count", text: "0/5000" });
    var submit = h("button", {
      class: "btn-pill",
      text: "Submit",
      disabled: true,
    });
    ta.addEventListener("input", function () {
      count.textContent = ta.value.length + "/5000";
      submit.disabled = !ta.value.trim();
    });
    submit.onclick = function () {
      Modal.close();
      toast("Thanks! We got your feedback.");
    };
    var att = h("button", {
      class: "fb-att",
      html: '<img src="assets/icons/add-32.svg" alt="" width="24" height="24"><span>Add</span>',
    });
    att.onclick = function () {
      att.innerHTML = "<span>✓</span><span>Screenshot</span>";
    };
    Modal.open(
      h("div", { class: "modal plain-modal" }, [
        Modal.head("Feedback & Support"),
        h("div", {
          class: "fb-from",
          html: "From:&nbsp; <span>" + USER.email + "</span>",
        }),
        ta,
        count,
        h("div", {
          style: "margin-top:12px;font-size:15px;font-weight:500",
          text: "Attachments",
        }),
        h("div", {
          style: "font-size:13px;color:rgba(0,0,0,.4)",
          text: "Include screenshot in report",
        }),
        att,
        h("div", { class: "fb-foot" }, [
          h("p", {
            style: "margin:0;flex:1",
            html: "We may use this information to investigate issues and improve our services, in accordance with our <a href='#' onclick='return false'>Privacy Policy</a>. We may contact you for information or updates.",
          }),
          submit,
        ]),
      ]),
      { focus: "textarea" },
    );
  }

  P.mod("Agent", Agent);
  P.mod("Pdp", { open: openPdp, close: closePdp });
  P.mod("Caps", Caps);
  P.mod("Tasks", Tasks);
  P.mod("Favs", Favs);
  P.mod("Login", Login);
  P.mod("UserMenu", UserMenu);
  // 离开 Chat 页：全屏会话收回右侧浮窗（有内容时）；换页时关 PDP
  // 切页：PDP 关掉；浮窗按页面记忆——离开时记下开关，回来时恢复（新页面默认关着）；
  // Chat 页 = 全屏会话，从 Chat 页离开时按缩小 / 关闭按钮的去向，否则按目标页的记忆
  window.addEventListener("hashchange", function () {
    var to = P.route(),
      from = lastRoute;
    lastRoute = to;
    if (pdp.mode !== "closed") {
      pdp.mode = "closed";
      paintPdp();
    }
    if (mode === "parked") mode = "panel";
    if (from !== "chat" && from !== to) panelMem[from] = mode === "panel" ? "panel" : "closed";
    if (to === "chat") {
      if (from !== "chat") chatFrom = from;
      mode = "full";
    } else if (from === "chat") mode = afterLeave || panelMem[to] || "closed";
    else if (from !== to) mode = panelMem[to] || "closed";
    if (to !== "chat" && mode === "panel") panelMem[to] = "panel";
    afterLeave = null;
    paintShell();
    P.renderDock();
  });
};

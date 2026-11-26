/* Gloups · app web (V0)
   Sans compilation : HTML, CSS et ce fichier. Données dans Supabase (règles d'accès côté base).
   Tout texte venant des utilisateurs est inséré avec textContent (jamais innerHTML). */
(function () {
  "use strict";

  var CFG = window.GLOUPS_CONFIG;
  var NB = " ";

  /* ---------- Session : stockage local + copie en cookie (récupérée par l'app installée sur iPhone) ---------- */
  var COOKIE_PATH = location.pathname.replace(/[^/]*$/, "") || "/";
  var CHUNK = 3000;
  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(name, value, maxAge) {
    document.cookie = name + "=" + encodeURIComponent(value) + "; Path=" + COOKIE_PATH + "; Max-Age=" + maxAge + "; SameSite=Lax; Secure";
  }
  var cookieStorage = {
    getItem: function (key) {
      var v = null;
      try { v = localStorage.getItem(key); } catch (e) { /* stockage indisponible */ }
      if (v) return v;
      var n = parseInt(readCookie(key + ".n") || "0", 10);
      if (!n) return null;
      var out = "";
      for (var i = 0; i < n; i++) { var part = readCookie(key + "." + i); if (part == null) return null; out += part; }
      try { localStorage.setItem(key, out); } catch (e) { /* ignore */ }
      return out;
    },
    setItem: function (key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
      var old = parseInt(readCookie(key + ".n") || "0", 10);
      var parts = Math.ceil(value.length / CHUNK);
      for (var i = 0; i < parts; i++) writeCookie(key + "." + i, value.slice(i * CHUNK, (i + 1) * CHUNK), 34560000);
      for (var j = parts; j < old; j++) writeCookie(key + "." + j, "", 0);
      writeCookie(key + ".n", String(parts), 34560000);
    },
    removeItem: function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
      var n = parseInt(readCookie(key + ".n") || "0", 10);
      for (var i = 0; i < n; i++) writeCookie(key + "." + i, "", 0);
      writeCookie(key + ".n", "", 0);
    }
  };

  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { storage: cookieStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
  });
  var health = sb.schema("health");

  /* ---------- Petits outils ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "vars") Object.keys(v).forEach(function (p) { el.style.setProperty(p, v[p]); });
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.append(c instanceof Node ? c : String(c));
  }
  var SVGNS = "http://www.w3.org/2000/svg";
  var ICONS = {
    gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.3 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4z",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
    share: "M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1",
    plus: "M12 5v14M5 12h14",
    check: "M5 12l5 5 9-10",
    moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
    drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
    bottle: "M10 2h4M10 2v3M14 2v3M8 5h8v2H8zM8 7h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10z",
    back: "M15 5l-7 7 7 7",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    diaper: "M3 7h18v2.5A9 9 0 0 1 12 18.5A9 9 0 0 1 3 9.5zM8 7v3M16 7v3",
    wave: "M3 12h3l2-5 3 10 3-8 2 3h5",
    bath: "M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0",
    temp: "M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z",
    scale: "M6 7h12l2 13H4zM9 7a3 3 0 0 1 6 0",
    note: "M5 4h14v16H5zM8 9h8M8 13h8M8 17h5",
    swap: "M7 7h11l-3-3M17 17H6l3 3",
    home: "M4 11l8-7 8 7v9H4zM10 20v-5h4v5",
    list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
    chart: "M5 20V11M12 20V5M19 20v-8",
    cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
    music: "M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
    noise: "M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10",
    play: "M8 5l11 7-11 7z",
    heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
    pause: "M9 5v14M15 5v14",
    stop: "M7 7h10v10H7z",
    addsq: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 8v8M8 12h8",
    family: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15.5c3 0 8 1 8 4.5"
  };
  function icon(name, size) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("width", size || 22); s.setAttribute("height", size || 22); s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", name === "dots" ? "3.2" : name === "plus" ? "2.4" : "2");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(SVGNS, "path"); p.setAttribute("d", ICONS[name]); s.appendChild(p);
    return s;
  }
  function logo(cls) { return h("img", { src: "icons/icon.svg", alt: "", class: "logo" + (cls ? " " + cls : ""), width: 64, height: 64 }); }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(d) { d = new Date(d); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function dur(min) {
    min = Math.max(0, Math.round(min));
    if (min < 60) return min + NB + "min";
    var hh = Math.floor(min / 60), mm = min % 60;
    return mm ? hh + NB + "h" + NB + pad(mm) : hh + NB + "h";
  }
  function ago(d) { return dur((Date.now() - new Date(d).getTime()) / 60000); }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec));
    var hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
    return hh ? hh + ":" + pad(mm) + ":" + pad(ss) : pad(mm) + ":" + pad(ss);
  }
  function startOfDay(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  var DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  var MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  function dayLabel(d) {
    d = new Date(d);
    var t = startOfDay(new Date()).getTime(), x = startOfDay(d).getTime();
    if (x === t) return "Aujourd'hui";
    if (x === t - 86400000) return "Hier";
    return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }
  function ageLabel(child) {
    if (!child.birth_date) return child.due_date ? "naissance prévue le " + new Date(child.due_date).toLocaleDateString("fr-FR") : "";
    var days = Math.floor((startOfDay(new Date()) - startOfDay(new Date(child.birth_date + "T00:00:00"))) / 86400000);
    if (days < 0) return "";
    if (days < 60) return days + NB + (days > 1 ? "jours" : "jour");
    var months = Math.floor(days / 30.44);
    return months + NB + "mois";
  }
  var MEMBER_COLORS = ["#1F4A3A", "#5A50A0", "#A8661A", "#8E3829", "#2B6A8A", "#5B655D"];
  function memberColor(uid) { var i = S.members.findIndex(function (m) { return m.user_id === uid; }); return MEMBER_COLORS[(i < 0 ? 0 : i) % MEMBER_COLORS.length]; }
  function memberInitials(name) { var w = (name || "?").trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase() || "?"; }
  function memberAvatar(m, size) {
    var on = S.online[m.user_id] && m.user_id !== S.user.id;
    return h("span", { class: "avatar mav" + (on ? " on" : ""), "data-uid": m.user_id, vars: { background: memberColor(m.user_id), color: "#FFFFFF", width: size, height: size, "font-size": size === "34px" ? "13px" : null }, text: memberInitials(S.profiles[m.user_id]) });
  }
  // Présence en direct : qui a Gloups ouvert en ce moment, et état de la synchronisation
  function paintPresence() {
    Array.prototype.forEach.call(document.querySelectorAll(".mav[data-uid]"), function (el) {
      var uid = el.getAttribute("data-uid");
      el.classList.toggle("on", !!S.online[uid] && S.user && uid !== S.user.id);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".sync"), function (el) { el.className = "sync " + S.sync; el.textContent = SYNC_LBL[S.sync]; });
    Array.prototype.forEach.call(document.querySelectorAll(".mstate[data-uid]"), function (el) {
      var uid = el.getAttribute("data-uid"), me = S.user && uid === S.user.id;
      el.textContent = me ? "cet appareil" : S.online[uid] ? "dans l'app" : "";
    });
  }
  var SYNC_LBL = { ok: "Synchronisé", wait: "Connexion…", off: "Hors ligne" };
  function syncBadge() { return h("span", { class: "sync " + S.sync, role: "status", text: SYNC_LBL[S.sync] }); }
  function initials(name) { return (name || "?").trim().split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2).toUpperCase() || "?"; }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var x = Array.from(b, function (v) { return pad16(v); }).join("");
    return x.slice(0, 8) + "-" + x.slice(8, 12) + "-" + x.slice(12, 16) + "-" + x.slice(16, 20) + "-" + x.slice(20);
  }
  function pad16(v) { return (v < 16 ? "0" : "") + v.toString(16); }
  function isStandalone() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
  function errMsg(e) {
    if (!e) return "Erreur inconnue";
    var m = e.message || String(e);
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Pas de connexion. Réessayez dans un instant.";
    if (/row-level security|permission denied|non autorisé/i.test(m)) return "Action non autorisée pour votre rôle.";
    return m;
  }

  /* ---------- Libellés ---------- */
  var SIDE = { left: "gauche", right: "droite", both: "les deux" };
  var COLORS = { yellow: "jaune", mustard: "moutarde", green: "vert", brown: "marron", black: "noir", white: "blanc ou mastic", red: "avec du sang" };
  var TEXTURES = { liquid: "liquide", soft: "molle", seedy: "grumeleuse", firm: "dure", mucus: "glaireuse" };
  var PLACES = { cosleep: "co-dodo", crib: "berceau ou lit", arms: "dans les bras", stroller: "poussette", car: "voiture", carrier: "porte-bébé", other: "autre" };
  var CAT = {
    "feed.breast": "repas", "feed.bottle": "repas", "feed.pump": "repas",
    sleep: "sommeil", diaper: "couche", cry: "pleurs", bath: "couche", note: "sante"
  };
  var CAT_COLOR = { repas: "#A8661A", sommeil: "#5A50A0", couche: "#2B7262", pleurs: "#B04A3A", sante: "#2E5D94" };
  function label(ev) {
    var d = ev.data || {};
    switch (ev.type) {
      case "feed.breast": return "Tétée " + (SIDE[d.side] || "");
      case "feed.bottle": return "Biberon" + (d.ml != null ? " " + d.ml + NB + "ml" : "") + (d.milk === "breastmilk" ? " · lait maternel" : d.milk === "formula" ? " · lait infantile" : "");
      case "feed.pump": return "Tire-lait" + (d.ml != null ? " " + d.ml + NB + "ml" : "") + (d.side ? " · " + SIDE[d.side] : "");
      case "sleep": return "Sommeil" + (d.place ? " · " + PLACES[d.place] : "");
      case "diaper": return "Couche · " + (d.pee && d.poo ? "pipi et selles" : d.poo ? "selles" : "pipi") + (d.color ? " · " + COLORS[d.color] : "") + (d.texture ? " · " + TEXTURES[d.texture] : "");
      case "cry": return "Pleurs";
      case "bath": return "Bain";
      case "note": return "Note · " + (d.text || "");
      default: return ev.type;
    }
  }
  function evDuration(ev) {
    if (!ev.ended_at) return null;
    var m = (new Date(ev.ended_at) - new Date(ev.started_at)) / 60000;
    return m >= 1 ? dur(m) : null;
  }

  /* ---------- État ---------- */
  var S = {
    session: null, user: null, profile: null,
    memberships: [], family: null, role: null,
    children: [], child: null, members: [], profiles: {},
    events: [], appts: [], evFrom: null, evChild: null, loading: true, channel: null, tick: null, online: {}, sync: "wait", isAdmin: false,
    deferredInstall: null
  };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- Rendu ---------- */
  var appEl = document.getElementById("app");
  var sheetRoot = document.getElementById("sheet-root");
  var toastRoot = document.getElementById("toast-root");
  var PEEK = false; // vrai pendant le rendu de l'écran voisin, affiché sous le doigt
  var SCROLL_TOP = true; // vrai seulement quand on arrive sur un autre écran
  function mount(node) {
    if (PEEK) { appEl.replaceChildren(node); return; }
    if (fab.el) fabSync(false);
    var y = window.scrollY;
    appEl.replaceChildren(node);
    if (SCROLL_TOP) window.scrollTo(0, 0); else if (window.scrollY !== y) window.scrollTo(0, y);
    SCROLL_TOP = false;
  }

  var toastTimer = null;
  function toast(msg, opts) {
    opts = opts || {};
    clearTimeout(toastTimer);
    var t = h("div", { class: "toast" + (opts.error ? " err" : "") }, h("span", { class: "grow", text: msg }),
      opts.action ? h("button", { onclick: function () { toastRoot.replaceChildren(); opts.action.fn(); }, text: opts.action.label }) : null);
    toastRoot.replaceChildren(t);
    toastTimer = setTimeout(function () { toastRoot.replaceChildren(); }, opts.error ? 6000 : 5000);
  }

  function closeSheet() {
    var bd = sheetRoot.firstChild;
    if (!bd) return;
    if (bd.classList.contains("closing")) return;
    bd.classList.add("closing");
    setTimeout(function () { if (bd.parentNode === sheetRoot) sheetRoot.removeChild(bd); if (!sheetRoot.firstChild) document.documentElement.classList.remove("sheet-open"); }, 240);
  }
  function openSheet(title, body) {
    clearTimeout(toastTimer); toastRoot.replaceChildren(); // le bandeau ne doit pas masquer la feuille
    var sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "grab" }),
      h("div", { class: "row between" }, h("h2", { class: "title-m", text: title }), h("button", { class: "btn ghost small", onclick: closeSheet, text: "Fermer" })),
      body);
    var bd = h("div", { class: "backdrop", onclick: function (e) { if (e.target === bd) closeSheet(); } }, sheet);
    sheetRoot.replaceChildren(bd);
    document.documentElement.classList.add("sheet-open");
    // Tirer la feuille vers le bas pour la fermer
    var y0 = null, dy = 0, t0 = 0;
    sheet.addEventListener("touchstart", function (e) {
      if (sheet.scrollTop > 0 || e.touches.length > 1) { y0 = null; return; }
      y0 = e.touches[0].clientY; dy = 0; t0 = Date.now();
    }, { passive: true });
    sheet.addEventListener("touchmove", function (e) {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { e.preventDefault(); sheet.classList.add("dragging"); sheet.style.transform = "translateY(" + dy + "px)"; bd.style.setProperty("--dim", Math.max(0, 1 - dy / 400).toFixed(2)); }
      else if (sheet.classList.contains("dragging")) { sheet.style.transform = ""; }
    }, { passive: false });
    var end = function () {
      if (y0 == null) return;
      y0 = null; sheet.classList.remove("dragging");
      var v = dy / Math.max(1, Date.now() - t0);
      if (dy > 110 || (dy > 40 && v > 0.6)) closeSheet();
      else { sheet.style.transform = ""; bd.style.removeProperty("--dim"); }
    };
    sheet.addEventListener("touchend", end); sheet.addEventListener("touchcancel", end);
  }
  // Petit rebond sur le choix qu'on vient de toucher (puces, segments, couleurs)
  document.addEventListener("click", function (e) {
    var box = e.target.closest && e.target.closest(".chips, .seg, .colors");
    if (!box) return;
    setTimeout(function () { var p = box.querySelector('[aria-pressed="true"]'); if (p) { p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop"); } }, 0);
  }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeSheet(); if (fab.level) fabLevel(null); } });

  /* ---------- Données ---------- */
  async function loadProfile() {
    var r = await sb.from("profiles").select("id, first_name").eq("id", S.user.id).maybeSingle();
    S.profile = r.data || { id: S.user.id, first_name: "" };
  }
  async function loadMemberships() {
    var r = await sb.from("family_members").select("family_id, role, status, families(id, name, timezone, settings)").eq("user_id", S.user.id).eq("status", "active");
    if (r.error) throw r.error;
    S.memberships = (r.data || []).filter(function (m) { return m.families; });
    var wanted = lsGet("gloups.family");
    var m = S.memberships.find(function (x) { return x.family_id === wanted; }) || S.memberships[0] || null;
    S.family = m ? m.families : null;
    S.role = m ? m.role : null;
    if (S.family) lsSet("gloups.family", S.family.id);
  }
  async function loadFamily() {
    if (!S.family) return;
    var fid = S.family.id;
    var res = await Promise.all([
      sb.from("children").select("*").eq("family_id", fid).is("deleted_at", null).order("created_at"),
      sb.from("family_members").select("user_id, role, status, profiles!family_members_user_id_fkey(first_name)").eq("family_id", fid).eq("status", "active")
    ]);
    if (res[0].error) throw res[0].error;
    if (res[1].error) console.warn("membres", res[1].error);
    S.children = res[0].data || [];
    S.members = res[1].data || [];
    S.profiles = {};
    S.members.forEach(function (m) { S.profiles[m.user_id] = (m.profiles && m.profiles.first_name) || "Membre"; });
    var wanted = lsGet("gloups.child");
    S.child = S.children.find(function (c) { return c.id === wanted; }) || S.children[0] || null;
    if (S.child) lsSet("gloups.child", S.child.id);
  }
  async function loadEvents() {
    if (!S.child) { S.events = []; return; }
    // Au moins les 7 derniers jours, ou plus si le journal a déjà remonté plus loin
    var def = startOfDay(new Date()).getTime() - 7 * 86400000;
    if (S.evChild !== S.child.id) S.evFrom = null;
    var from = S.evFrom != null ? Math.min(S.evFrom, def) : def;
    var since = new Date(from).toISOString();
    var r = await sb.from("events").select("*").eq("child_id", S.child.id).is("deleted_at", null)
      .or("started_at.gte." + since + ",ended_at.is.null").order("started_at", { ascending: false }).limit(4000);
    if (r.error) throw r.error;
    S.events = r.data || [];
    S.evFrom = from; S.evChild = S.child.id;
  }
  function subscribe() {
    if (S.channel) { sb.removeChannel(S.channel); S.channel = null; }
    if (!S.family) return;
    S.online = {}; S.sync = navigator.onLine === false ? "off" : "wait";
    var ch = sb.channel("family-" + S.family.id, { config: { presence: { key: S.user.id } } });
    S.channel = ch;
    ch.on("postgres_changes", { event: "*", schema: "public", table: "events", filter: "family_id=eq." + S.family.id }, function () { refresh(); })
      .on("presence", { event: "sync" }, function () {
        var st = ch.presenceState(), on = {};
        Object.keys(st).forEach(function (k) { on[k] = true; });
        S.online = on; paintPresence();
      })
      .subscribe(function (status) {
        if (S.channel !== ch) return;
        if (status === "SUBSCRIBED") { S.sync = "ok"; if (document.visibilityState === "visible") ch.track({ at: new Date().toISOString() }); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { S.sync = "off"; S.online = {}; }
        paintPresence();
      });
    paintPresence();
  }
  var refreshing = null;
  function refresh() {
    clearTimeout(refreshing);
    refreshing = setTimeout(async function () {
      try { await Promise.all([loadEvents(), loadAppts()]); route(); } catch (e) { /* hors ligne : on garde l'affichage */ }
    }, 250);
  }

  /* ---------- Jumeaux et multiples : noter pour un enfant ou pour tous d'un coup ---------- */
  function twinMode() { return !!(S.family && S.family.settings && S.family.settings.twins && S.children.length > 1); }
  function forAll() { return twinMode() && lsGet("gloups.forAll." + S.family.id) === "1"; }
  function allLabel() { return S.children.length === 2 ? "Les deux" : "Tous"; }
  function forPicker(onDone) {
    var seg = h("div", { class: "seg for-seg", role: "group", "aria-label": "Pour quel enfant" });
    function draw() {
      var all = forAll();
      seg.replaceChildren.apply(seg, S.children.map(function (c) {
        return h("button", { type: "button", "aria-pressed": !all && S.child.id === c.id ? "true" : "false", vars: { "--child": c.color }, onclick: async function () {
          lsSet("gloups.forAll." + S.family.id, null); track("action", "pour_un");
          if (S.child.id !== c.id) { S.child = c; weights = null; lsSet("gloups.child", c.id); await loadEvents(); route(); }
          draw(); if (onDone) onDone();
        } }, h("span", { class: "dot" }), c.first_name);
      }).concat([h("button", { type: "button", "aria-pressed": all ? "true" : "false", onclick: function () { lsSet("gloups.forAll." + S.family.id, "1"); track("action", "pour_tous"); draw(); if (onDone) onDone(); }, text: allLabel() })]));
    }
    draw();
    return seg;
  }
  function entryPicker() { return twinMode() ? h("div", { class: "field" }, h("span", { text: "Pour" }), forPicker()) : null; }

  async function logEvent(type, data, opts) {
    opts = opts || {};
    var now = new Date();
    var kids = forAll() ? S.children.map(function (c) { return c.id; }) : [S.child.id];
    var group = kids.length > 1 ? uuid() : null;
    var rows = kids.map(function (cid) {
      var d = Object.assign({}, data || {});
      if (group) d.twin_group = group;
      return {
        id: uuid(), family_id: S.family.id, child_id: cid, type: type,
        started_at: (opts.started || now).toISOString(),
        ended_at: opts.running ? null : (opts.ended || opts.started || now).toISOString(),
        data: d, source: "app"
      };
    });
    var r = await sb.from("events").insert(rows).select();
    if (r.error) { toast(errMsg(r.error), { error: true }); return null; }
    track("log", type + (group ? ":tous" : ""));
    var mine = (r.data || []).find(function (x) { return x.child_id === S.child.id; }) || r.data[0];
    S.events.unshift(mine);
    S.fresh = { id: mine.id, cat: CAT[mine.type], t: Date.now() };
    closeSheet();
    route();
    // Minuteur lancé : la pastille du minuteur suffit, pas de bandeau en plus
    if (!opts.running) toast(label(mine) + (group ? " · " + allLabel().toLowerCase() : "") + " · " + hhmm(mine.started_at), {
      action: { label: "Annuler", fn: function () { removeEvent(mine, true, true); } }
    });
    return mine;
  }
  async function stopEvent(ev) {
    var at = new Date().toISOString();
    var patch = { ended_at: at };
    if (SND.id && SND.linked === ev.id) {
      // Pleurs : on retient le son qui jouait, pour « la dernière fois » ; sieste : le son s'arrête avec elle
      if (ev.type === "cry" && !SND.paused) patch.data = Object.assign({}, ev.data || {}, { soothe: SND.id });
      if (ev.type === "sleep") sndStop();
    }
    var r = await sb.from("events").update(patch).eq("id", ev.id).select().single();
    if (r.error) { toast(errMsg(r.error), { error: true }); return null; }
    // Minuteur lancé pour les deux : on l'arrête aussi pour l'autre enfant
    if (ev.data && ev.data.twin_group) await sb.from("events").update({ ended_at: at }).eq("family_id", S.family.id).eq("data->>twin_group", ev.data.twin_group).is("ended_at", null);
    replaceEvent(r.data); route();
    return r.data;
  }
  async function removeEvent(ev, silent, wholeGroup) {
    if (SND.id && SND.linked === ev.id) sndStop();
    if (wholeGroup && ev.data && ev.data.twin_group) await sb.from("events").update({ deleted_at: new Date().toISOString() }).eq("family_id", S.family.id).eq("data->>twin_group", ev.data.twin_group).neq("id", ev.id);
    var r = await sb.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", ev.id);
    if (r.error) { toast(errMsg(r.error), { error: true }); return; }
    S.events = S.events.filter(function (x) { return x.id !== ev.id; });
    route();
    if (!silent) toast("Saisie supprimée", { action: { label: "Rétablir", fn: async function () {
      var u = await sb.from("events").update({ deleted_at: null }).eq("id", ev.id).select().single();
      if (!u.error) { S.events.push(u.data); S.events.sort(function (a, b) { return new Date(b.started_at) - new Date(a.started_at); }); route(); }
    } } });
  }
  // Âge de la dernière saisie, pour que son animation continue sans repartir de zéro si l'écran est redessiné
  function freshAge(id) {
    if (!S.fresh || (id && S.fresh.id !== id)) return null;
    var a = Date.now() - S.fresh.t;
    return a < 1600 ? a : null;
  }
  function replaceEvent(ev) { S.events = S.events.map(function (x) { return x.id === ev.id ? ev : x; }); }
  function running() { return S.events.filter(function (e) { return !e.ended_at; }); }
  function lastOf(pred) { return S.events.find(function (e) { return pred(e) && e.ended_at; }) || S.events.find(pred) || null; }

  /* ---------- Écran : connexion (v0.9.0) ---------- */
  var GOOGLE_CLIENT_ID = "173413659711-9o3rmks12srae5plp79usag0d496e5kf.apps.googleusercontent.com";
  var WL = { timer: null, slide: 0, gsi: null, raw: null };
  function sv(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "vars") Object.keys(attrs.vars).forEach(function (p) { el.style.setProperty(p, attrs.vars[p]); });
      else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function wlStars(list) {
    return sv.apply(null, ["svg", { class: "wl-stars", "aria-hidden": "true", viewBox: "0 0 390 460", preserveAspectRatio: "xMidYMid slice" }].concat(list.map(function (s) {
      return sv("circle", { cx: s[0], cy: s[1], r: s[2], class: "wl-star", vars: { "--d": s[3] + "s", "--t": s[4] + "s" } });
    })));
  }
  // Le bébé du logo : endormi, ou qui se réveille (yeux qui s'ouvrent, sourire)
  function wlBaby(size, wake) {
    var mouth = wake ? "M40 67.5q6 5.5 12 0" : "M42 69q4 2.5 8 0";
    return sv("svg", { width: size, height: size, viewBox: "16 26 60 60", role: "img", "aria-label": "Gloups" },
      sv("circle", { cx: 46, cy: 57, r: 26, fill: "#F4EFE4" }),
      sv("path", { d: "M46 31c4-5 3-10-1-13", fill: "none", stroke: "#F4EFE4", "stroke-width": 3.2, "stroke-linecap": "round" }),
      sv("path", { d: "M33 56q5 4.6 10 0M49 56q5 4.6 10 0", fill: "none", stroke: "#1F4A3A", "stroke-width": 3.4, "stroke-linecap": "round", class: wake ? "wl-shut" : null }),
      wake ? sv("g", { class: "wl-open" },
        sv("circle", { cx: 38, cy: 56, r: 3.4, fill: "#1F4A3A" }), sv("circle", { cx: 54, cy: 56, r: 3.4, fill: "#1F4A3A" }),
        sv("circle", { cx: 39.2, cy: 54.8, r: 1, fill: "#F4EFE4" }), sv("circle", { cx: 55.2, cy: 54.8, r: 1, fill: "#F4EFE4" })) : null,
      sv("circle", { cx: 32, cy: 64.5, r: 3.6, fill: "#E9B97A", class: wake ? null : "wl-cheek" }),
      sv("circle", { cx: 60, cy: 64.5, r: 3.6, fill: "#E9B97A", class: wake ? null : "wl-cheek" }),
      sv("path", { d: mouth, fill: "none", stroke: "#1F4A3A", "stroke-width": 2.8, "stroke-linecap": "round" }));
  }
  function wlMoon() {
    return sv("svg", { class: "wl-moon", width: 60, height: 60, viewBox: "0 0 20 20", "aria-hidden": "true" },
      sv("path", { d: "M8 0a10 10 0 1 0 8 15.5a8 8 0 1 1-8-15.5z", fill: "#E9B97A" }));
  }
  function wlSlide(i) {
    var cap = function (t1, t2) { return h("div", { class: "wl-cap" }, h("b", { text: t1 }), h("span", { text: t2 })); };
    var bub = function (ic, cls, ripple) { return h("span", { class: "wl-bub " + cls }, ripple ? h("span", { class: "wl-rip", "aria-hidden": "true" }) : null, icon(ic, 26)); };
    if (i === 0) return h("div", { class: "wl-slide" },
      h("div", { class: "wl-bubs" }, bub("bottle", "repas"), bub("moon", "sommeil", true), bub("diaper", "couche")),
      h("span", { class: "wl-live" }, h("i", { "aria-hidden": "true" }), "Sieste en cours · 0:12"),
      cap("Un tap, c'est noté", "Tétées, biberons, couches, sommeil."));
    if (i === 1) return h("div", { class: "wl-slide" },
      h("div", { class: "wl-duo" },
        h("span", { class: "wl-who" }, h("span", { class: "wl-av a", text: "P" }), h("span", { text: "Papa" })),
        h("span", { class: "wl-line", "aria-hidden": "true" }),
        h("span", { class: "wl-fly", text: "Biberon 120 ml" }),
        h("span", { class: "wl-who" }, h("span", { class: "wl-av b", text: "M" }), h("span", { text: "Maman" }))),
      cap("Partagé à deux, en direct", "Chaque saisie arrive aussitôt chez l'autre."));
    return h("div", { class: "wl-slide" },
      h("div", { class: "wl-arcbox" },
        sv("svg", { width: 190, height: 96, viewBox: "0 0 190 96", "aria-hidden": "true" },
          sv("path", { d: "M15 90a80 80 0 0 1 160 0", fill: "none", stroke: "#E6E2F5", "stroke-width": 12, "stroke-linecap": "round" }),
          sv("path", { d: "M15 90a80 80 0 0 1 160 0", fill: "none", stroke: "#4A4190", "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": 252, class: "wl-arc" })),
        h("span", { class: "wl-arct", text: "15" + NB + "h" + NB + "20" })),
      cap("Sa prochaine sieste, anticipée", "D'après son propre rythme."));
  }
  function wlCarousel() {
    var stage = h("div", { class: "wl-stage" });
    var dots = h("div", { class: "wl-dots" });
    var labels = ["Un tap, c'est noté", "Partagé à deux", "Prochaine sieste"];
    function show(i) {
      WL.slide = i;
      stage.replaceChildren(wlSlide(i));
      dots.replaceChildren.apply(dots, labels.map(function (l, k) {
        return h("button", { type: "button", class: k === i ? "on" : null, "aria-label": "Voir : " + l, "aria-current": k === i ? "true" : null, onclick: function () { show(k); start(); } });
      }));
    }
    function start() {
      clearInterval(WL.timer);
      WL.timer = setInterval(function () {
        if (!stage.isConnected) { clearInterval(WL.timer); return; }
        if (document.hidden) return;
        show((WL.slide + 1) % 3);
      }, 3600);
    }
    show(0); start();
    return h("div", { class: "wl-card wl-in", vars: { "--d": ".5s" } }, stage, dots);
  }
  // Bouton officiel Google (Google Identity Services) : l'écran Google affiche gloups.info.
  // Repli sur l'ancienne connexion par redirection si le bouton ne se charge pas, ou dans l'app installée.
  function loadGsi() {
    if (WL.gsi) return WL.gsi;
    WL.gsi = new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = function () { window.google && google.accounts && google.accounts.id ? ok() : ko(new Error("gsi")); };
      s.onerror = function () { WL.gsi = null; ko(new Error("gsi")); };
      document.head.appendChild(s);
      setTimeout(function () { ko(new Error("timeout")); }, 6000);
    });
    return WL.gsi;
  }
  async function sha256hex(t) {
    var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }
  function googleButton() {
    var slot = h("div", { class: "wl-gslot" });
    var fallback = h("button", { class: "btn wl-gfb full", type: "button", onclick: signIn, text: "Continuer avec Google" });
    var help = h("button", { class: "wl-alt", type: "button", onclick: signIn, text: "Le bouton ne s'affiche pas ? Autre méthode" });
    var box = h("div", { class: "wl-gbox" }, slot, help);
    var useFallback = function () { box.replaceChildren(fallback); };
    if (isStandalone() || !window.crypto || !crypto.subtle) { useFallback(); return box; }
    help.hidden = true;
    (async function () {
      try {
        WL.raw = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
        var hashed = await sha256hex(WL.raw);
        await loadGsi();
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential, nonce: hashed, ux_mode: "popup", itp_support: true, context: "use" });
        var w = Math.max(240, Math.min(400, Math.round(slot.getBoundingClientRect().width || 340)));
        google.accounts.id.renderButton(slot, { type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center", locale: "fr", width: w });
        setTimeout(function () { help.hidden = false; }, 2500);
      } catch (e) { if (slot.isConnected) useFallback(); }
    })();
    return box;
  }
  async function onGoogleCredential(resp) {
    var slot = document.querySelector(".wl-gbox");
    if (slot) slot.classList.add("busy");
    var r = await sb.auth.signInWithIdToken({ provider: "google", token: resp.credential, nonce: WL.raw });
    if (r.error) {
      if (slot) slot.classList.remove("busy");
      toast(errMsg(r.error), { error: true });
      return;
    }
    track("action", "connexion_google_gsi");
  }
  function legal(extra) {
    return h("p", { class: "wl-legal" }, extra || "Gratuit, sans mot de passe. Données hébergées dans l'Union européenne.", h("br"),
      h("a", { href: "confidentialite.html", text: "Confidentialité" }), " · ", h("a", { href: "conditions.html", text: "Conditions" }));
  }
  function screenWelcome() {
    var invite = lsGet("gloups.invite");
    // Déjà affiché : on ne relance pas les animations
    var cur = appEl.querySelector("main.wl");
    if (cur && cur.getAttribute("data-k") === (invite ? "inv:" + invite : "welcome")) return;
    clearInterval(WL.timer);
    if (invite) { welcomeInvite(invite); return; }
    var zz = [0, 1, 2].map(function (k) { return h("span", { class: "wl-z z" + k, "aria-hidden": "true", text: "z" }); });
    mount(h("main", { class: "wl", "data-k": "welcome" },
      h("div", { class: "wl-hero" },
        wlStars([[42, 88, 1.8, 0, 3.2], [96, 46, 1.2, .8, 2.6], [150, 120, 1.5, .3, 4], [250, 70, 1.3, 1.4, 3.4], [340, 196, 1.7, .6, 2.9], [30, 232, 1.2, 1.1, 3.8], [64, 330, 1.5, 2, 3.1], [352, 300, 1.3, .2, 2.7], [210, 30, 1.1, 1.7, 3.6]]),
        wlMoon(),
        h("div", { class: "wl-center wl-in" },
          h("div", { class: "wl-baby" }, wlBaby(150), zz),
          h("h1", { class: "wl-title wl-in", vars: { "--d": ".15s" }, text: "Gloups" }),
          h("p", { class: "wl-tag wl-in", vars: { "--d": ".3s" } }, "Le carnet de bébé", h("br"), "pour toute la famille."))),
      wlCarousel(),
      h("div", { class: "wl-foot wl-in", vars: { "--d": ".8s" } }, googleButton(), legal())));
  }
  function welcomeInvite(code) {
    var step = function (n, on, b, t) { return h("li", { class: on ? "on" : null }, h("span", { class: "wl-n", text: String(n) }), h("span", null, b ? h("b", { text: b }) : null, t)); };
    mount(h("main", { class: "wl", "data-k": "inv:" + code },
      h("div", { class: "wl-hero inv" },
        wlStars([[40, 70, 1.6, 0, 3.2], [120, 40, 1.2, .8, 2.6], [300, 56, 1.5, .3, 4], [356, 150, 1.3, 1.4, 3.4], [26, 200, 1.4, .6, 2.9], [340, 290, 1.2, 1.1, 3.8]]),
        h("div", { class: "wl-center" },
          h("span", { class: "wl-chip wl-in" }, h("i", { "aria-hidden": "true" }), "Invitation"),
          h("div", { class: "wl-trio" },
            h("span", { class: "wl-ring", "aria-hidden": "true" }),
            h("span", { class: "wl-side l", "aria-hidden": "true" }, icon("family", 26)),
            h("div", { class: "wl-pop" }, h("div", { class: "wl-baby s" }, wlBaby(110))),
            h("span", { class: "wl-side r", "aria-hidden": "true" }, icon("plus", 26))),
          h("h1", { class: "wl-title s wl-in", vars: { "--d": ".7s" } }, "On vous attend", h("br"), "dans la famille"),
          h("p", { class: "wl-tag s wl-in", vars: { "--d": ".85s" }, text: "Quelqu'un vous invite à suivre bébé sur Gloups." }))),
      h("div", { class: "wl-card inv wl-in", vars: { "--d": "1s" } },
        h("div", { class: "wl-ticket" },
          h("span", { class: "wl-code" }, h("span", { text: "Votre code" }), h("b", { text: code })),
          h("span", { class: "wl-kept" }, icon("check", 14), "Gardé")),
        h("ol", { class: "wl-steps" },
          step(1, true, "Connectez-vous", " avec Google"),
          step(2, false, null, "Vous rejoignez la famille"),
          step(3, false, null, "Gloups s'installe sur votre écran"))),
      h("div", { class: "wl-foot wl-in", vars: { "--d": "1.2s" } }, googleButton(), legal("Gratuit, sans mot de passe."))));
  }
  // Juste après la connexion, avant de créer ou rejoindre une famille
  function screenHello() {
    var cur = appEl.querySelector("main.wl.hello");
    if (cur && cur.getAttribute("data-k") === "hello:" + (S.profile.first_name || "")) return;
    var first = !S.helloSeen; S.helloSeen = true;
    var burst = [0, 60, 120, 180, 240, 300].map(function (a, k) { return h("span", { class: "wl-spark" + (k % 2 ? " w" : ""), "aria-hidden": "true", vars: { "--a": a + "deg", "--d": (1.2 + (k % 3) * .04) + "s" } }); });
    var choice = function (ic, cls, t1, t2, fn) {
      return h("button", { class: "wl-choice", type: "button", onclick: fn },
        h("span", { class: "wico " + cls }, icon(ic, 24)),
        h("span", { class: "wtx grow" }, h("b", { text: t1 }), h("span", { text: t2 })),
        icon("back", 20));
    };
    mount(h("main", { class: "wl hello" + (first ? "" : " still"), "data-k": "hello:" + (S.profile.first_name || "") },
      h("div", { class: "wl-hero hello" },
        h("span", { class: "wl-fill", "aria-hidden": "true" }),
        h("div", { class: "wl-center" },
          h("div", { class: "wl-pop d5" },
            burst,
            h("div", { class: "wl-baby" }, wlBaby(150, true)),
            h("span", { class: "wl-ok", "aria-hidden": "true" }, icon("check", 20))),
          h("h1", { class: "wl-title wl-in", vars: { "--d": "1.3s" }, text: "Bonjour " + (S.profile.first_name || "") }),
          h("p", { class: "wl-tag wl-in", vars: { "--d": "1.45s" }, text: "Votre compte est prêt." }))),
      h("div", { class: "wl-next wl-in", vars: { "--d": "1.7s" } },
        h("span", { class: "eyebrow", text: "Pour commencer" }),
        choice("plus", "couche", "Créer notre famille", "Bébé né ou à naître, jumeaux compris", function () { screenOnboarding("create"); }),
        choice("note", "repas", "J'ai un code d'invitation", "Rejoindre une famille existante", function () { screenOnboarding("join"); })),
      h("button", { class: "btn ghost wl-out wl-in", vars: { "--d": "1.9s" }, onclick: signOut, text: "Se déconnecter" })));
  }
  function emailBlock() {
    var box = h("div", { class: "stack" });
    var email = h("input", { class: "input", type: "email", inputmode: "email", autocomplete: "email", placeholder: "prenom@exemple.fr", "aria-label": "Adresse e-mail" });
    function stepEmail() {
      var send = h("button", { class: "btn full", type: "submit", text: "Recevoir un code par e-mail" });
      box.replaceChildren(
        h("div", { class: "row", vars: { gap: "10px", color: "var(--muted)", "font-size": "13px" } }, h("span", { class: "grow", vars: { height: "1px", background: "var(--line)" } }), "ou", h("span", { class: "grow", vars: { height: "1px", background: "var(--line)" } })),
        h("form", { class: "stack", onsubmit: async function (e) {
          e.preventDefault();
          var v = email.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast("Adresse e-mail invalide.", { error: true }); return; }
          send.disabled = true;
          var r = await sb.auth.signInWithOtp({ email: v, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
          send.disabled = false;
          if (r.error) { toast(/rate limit/i.test(r.error.message) ? "Trop de demandes. Réessayez dans quelques minutes." : /not authorized/i.test(r.error.message) ? "L'envoi d'e-mails n'est pas encore activé sur le serveur." : errMsg(r.error), { error: true }); return; }
          stepCode(v);
        } }, email, send));
    }
    function stepCode(v) {
      var code = h("input", { class: "input code-input", inputmode: "numeric", autocomplete: "one-time-code", maxlength: 8, placeholder: "123456", "aria-label": "Code reçu par e-mail" });
      var ok = h("button", { class: "btn primary full", type: "submit", text: "Valider le code" });
      box.replaceChildren(
        h("p", { class: "small", text: "Code envoyé à " + v + ". Il est valable 1 heure. Pensez aux courriers indésirables." }),
        h("form", { class: "stack", onsubmit: async function (e) {
          e.preventDefault();
          var t = code.value.replace(/\D/g, "");
          if (t.length < 6) { toast("Le code fait 6 chiffres.", { error: true }); return; }
          ok.disabled = true;
          var r = await sb.auth.verifyOtp({ email: v, token: t, type: "email" });
          ok.disabled = false;
          if (r.error) { toast(/expired|invalid/i.test(r.error.message) ? "Code incorrect ou expiré." : errMsg(r.error), { error: true }); return; }
        } }, code, ok),
        h("button", { class: "btn ghost", type: "button", onclick: stepEmail, text: "Changer d'adresse ou renvoyer un code" }));
      setTimeout(function () { code.focus(); }, 50);
    }
    stepEmail();
    return box;
  }
  async function signIn() {
    var redirectTo = location.origin + location.pathname;
    var r = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo } });
    if (r.error) toast(/provider is not enabled|Unsupported provider/i.test(r.error.message) ? "La connexion Google n'est pas encore activée sur le serveur." : errMsg(r.error), { error: true });
  }

  /* ---------- Écran : première famille ---------- */
  function screenOnboarding(tab) {
    if (!tab) { screenHello(); return; }
    var body = h("div", { class: "stack" });
    var seg = h("div", { class: "seg", role: "tablist" },
      h("button", { "aria-pressed": tab === "create" ? "true" : "false", onclick: function () { screenOnboarding("create"); }, text: "Créer une famille" }),
      h("button", { "aria-pressed": tab === "join" ? "true" : "false", onclick: function () { screenOnboarding("join"); }, text: "J'ai un code" }));
    mount(h("main", { class: "screen plain" },
      h("div", { class: "row" }, logo("s"), h("span", { class: "muted", text: "Bonjour " + (S.profile.first_name || "") })),
      h("h1", { class: "title-l", text: tab === "create" ? "Créons votre famille" : "Rejoindre une famille" }),
      seg, body,
      h("button", { class: "btn ghost", onclick: function () { screenHello(); }, text: "Retour" })));
    if (tab === "create") body.append(familyForm(async function (vals) {
      var r = await sb.rpc("api_v1_create_family", { p_family_name: vals.family, p_child_first_name: vals.child, p_child_birth_date: vals.born ? vals.date : null, p_child_due_date: vals.born ? null : vals.date, p_child_color: vals.color });
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      if (vals.more && vals.more.length) {
        var others = CHILD_COLORS.map(function (c) { return c[0]; }).filter(function (c) { return c !== vals.color; });
        var add = await sb.from("children").insert(vals.more.map(function (n, i) { return { family_id: r.data, first_name: n, birth_date: vals.born ? vals.date : null, due_date: vals.born ? null : vals.date, color: others[i % others.length] }; }));
        if (add.error) toast(errMsg(add.error), { error: true });
        await sb.from("families").update({ settings: { twins: true } }).eq("id", r.data);
        track("action", "inscription_multiples_" + (vals.more.length + 1));
      }
      lsSet("gloups.family", r.data);
      await boot(true);
      if (!isStandalone()) location.hash = "#/installer";
    }));
    else body.append(joinForm(""));
  }

  var CHILD_COLORS = [["#2B7262", "Vert"], ["#5A50A0", "Lavande"], ["#A8661A", "Ocre"], ["#2E5D94", "Bleu"], ["#B04A3A", "Corail"]];
  function familyForm(onSubmit, opts) {
    opts = opts || {};
    var born = true, color = CHILD_COLORS[0][0], mult = 1;
    var extras = [h("input", { class: "input", maxlength: 40, placeholder: "Prénom du 2e", autocomplete: "off" }), h("input", { class: "input", maxlength: 40, placeholder: "Prénom du 3e", autocomplete: "off" })];
    var extraBox = h("div", { class: "stack" });
    var multSeg = h("div", { class: "seg", role: "group", "aria-label": "Nombre d'enfants" });
    function drawMult() {
      multSeg.replaceChildren.apply(multSeg, [[1, "Un bébé"], [2, "Jumeaux"], [3, "Triplés"]].map(function (o) {
        return h("button", { type: "button", "aria-pressed": mult === o[0] ? "true" : "false", onclick: function () { mult = o[0]; drawMult(); }, text: o[1] });
      }));
      extraBox.replaceChildren.apply(extraBox, extras.slice(0, mult - 1).map(function (inp, i) { return h("label", { class: "field" }, h("span", { text: "Prénom du " + (i + 2) + "e enfant" }), inp); }));
      child.placeholder = mult > 1 ? "Prénom du 1er" : "Prénom";
    }
    var fam = h("input", { class: "input", required: true, maxlength: 60, placeholder: "Famille Dupont", autocomplete: "off" });
    var child = h("input", { class: "input", required: true, maxlength: 40, placeholder: "Prénom", autocomplete: "off" });
    var date = h("input", { class: "input", type: "date", required: true, max: new Date().toISOString().slice(0, 10) });
    var dateLbl = h("span", { text: "Date de naissance" });
    var bornSeg = h("div", { class: "seg" });
    function drawBorn() {
      bornSeg.replaceChildren(
        h("button", { type: "button", "aria-pressed": born ? "true" : "false", onclick: function () { born = true; date.max = new Date().toISOString().slice(0, 10); dateLbl.textContent = "Date de naissance"; drawBorn(); }, text: "Déjà né(e)" }),
        h("button", { type: "button", "aria-pressed": born ? "false" : "true", onclick: function () { born = false; date.removeAttribute("max"); dateLbl.textContent = "Date prévue"; drawBorn(); }, text: "Pas encore né(e)" }));
    }
    drawBorn();
    if (!opts.childOnly) drawMult();
    var colors = h("div", { class: "colors" });
    function drawColors() {
      colors.replaceChildren.apply(colors, CHILD_COLORS.map(function (c) {
        return h("button", { type: "button", "aria-label": c[1], "aria-pressed": color === c[0] ? "true" : "false", vars: { "--c": c[0] }, onclick: function () { color = c[0]; drawColors(); } });
      }));
    }
    drawColors();
    var submit = h("button", { class: "btn primary full", type: "submit", text: opts.childOnly ? "Ajouter l'enfant" : "Créer la famille" });
    var form = h("form", { class: "stack", onsubmit: async function (e) {
      e.preventDefault();
      var more = opts.childOnly ? [] : extras.slice(0, mult - 1).map(function (x) { return x.value.trim(); });
      if (!child.value.trim() || !date.value || (!opts.childOnly && !fam.value.trim()) || more.some(function (x) { return !x; })) { toast("Complétez les champs.", { error: true }); return; }
      submit.disabled = true;
      await onSubmit({ family: fam.value.trim(), child: child.value.trim(), born: born, date: date.value, color: color, more: more });
      submit.disabled = false;
    } },
      opts.childOnly ? null : h("label", { class: "field" }, h("span", { text: "Nom de la famille" }), fam),
      opts.childOnly ? null : h("div", { class: "field" }, h("span", { text: "Combien d'enfants arrivent ?" }), multSeg),
      h("label", { class: "field" }, h("span", { text: opts.childOnly ? "Prénom de l'enfant" : "Prénom" }), child),
      extraBox,
      bornSeg,
      h("label", { class: "field" }, dateLbl, date),
      h("div", { class: "field" }, h("span", { text: opts.childOnly ? "Couleur de l'enfant" : "Couleur (en cas de jumeaux, les autres en reçoivent une différente)" }), colors),
      submit);
    return form;
  }

  function joinForm(prefill) {
    var input = h("input", { class: "input code-input", maxlength: 9, placeholder: "K7P4-2QX", autocomplete: "off", autocapitalize: "characters", value: prefill || "" });
    var out = h("div", { class: "stack" });
    async function check() {
      out.replaceChildren();
      var code = input.value.trim();
      if (code.replace(/[^A-Za-z0-9]/g, "").length < 7) { toast("Le code fait 7 caractères.", { error: true }); return; }
      var r = await sb.rpc("api_v1_preview_invitation", { p_code: code });
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      var inv = (r.data || [])[0];
      if (!inv) { out.append(h("div", { class: "card alert", text: "Code inconnu ou expiré. Demandez une nouvelle invitation." })); return; }
      var roleTxt = { parent: "Parent : voit et saisit tout, gère la famille.", proche: "Proche : voit et saisit, ne modifie pas la famille.", lecture: "Lecture seule." }[inv.role];
      out.append(h("div", { class: "card" },
        h("span", { class: "eyebrow", text: "Invitation de " + (inv.invited_by || "la famille") }),
        h("b", { class: "title-m", text: inv.family_name }),
        h("span", { class: "muted", text: (inv.children || []).join(", ") }),
        h("span", { class: "small", text: roleTxt }),
        h("button", { class: "btn primary full", onclick: async function (e) {
          e.target.disabled = true;
          var a = await sb.rpc("api_v1_accept_invitation", { p_code: code });
          if (a.error) { e.target.disabled = false; toast(errMsg(a.error), { error: true }); return; }
          lsSet("gloups.invite", null); lsSet("gloups.family", a.data);
          await boot(true);
          if (!isStandalone()) location.hash = "#/installer";
        }, text: "Rejoindre la famille" })));
    }
    if (prefill) setTimeout(check, 0);
    return h("div", { class: "stack" },
      h("label", { class: "field" }, h("span", { text: "Code reçu par message" }), input),
      h("button", { class: "btn dark full", onclick: check, text: "Vérifier le code" }), out);
  }

  /* ---------- Écran : accueil ---------- */
  function screenHome() {
    var c = S.child;
    if (!c) { mount(h("main", { class: "screen plain" }, h("h1", { class: "title-l", text: "Aucun enfant" }), S.role === "parent" ? familyForm(addChild, { childOnly: true }) : h("p", { text: "Demandez à un parent d'ajouter l'enfant." }))); return; }
    var today = startOfDay(new Date()).getTime();
    var evToday = S.events.filter(function (e) { return new Date(e.started_at).getTime() >= today; });
    var lastFeed = lastOf(function (e) { return CAT[e.type] === "repas"; });
    var lastDiaper = lastOf(function (e) { return e.type === "diaper"; });
    var lastSleep = lastOf(function (e) { return e.type === "sleep"; });
    var sleeping = running().find(function (e) { return e.type === "sleep"; });
    var sleepMin = evToday.filter(function (e) { return e.type === "sleep"; }).reduce(function (s, e) {
      var a = Math.max(new Date(e.started_at).getTime(), today), b = e.ended_at ? new Date(e.ended_at).getTime() : Date.now();
      return s + Math.max(0, b - a) / 60000;
    }, 0);
    var canWrite = S.role === "parent" || S.role === "proche";

    var fAge = freshAge();
    var tile = function (k, color, v, s, onclick, cat) {
      var roll = fAge != null && S.fresh.cat === cat;
      return h("button", { class: "tile" + (roll ? " roll" : ""), vars: roll ? { "--age": -fAge + "ms" } : null, onclick: onclick, disabled: !canWrite },
        h("span", { class: "k", vars: { color: color }, text: k }), h("span", { class: "vbox" }, h("span", { class: "v", text: v })), h("span", { class: "s", text: s }));
    };

    var recent = S.events.filter(function (e) { return new Date(e.started_at).getTime() >= today - 86400000; }).slice(0, 12);
    var mems = S.members.slice().sort(function (a, b) { return (b.user_id === S.user.id) - (a.user_id === S.user.id); });
    var membersInit = mems.slice(0, 3).map(function (m) { return memberAvatar(m, "34px"); });
    if (mems.length > 3) membersInit.push(h("span", { class: "avatar mav more", text: "+" + (mems.length - 3) }));

    mount(h("main", { class: "screen" },
      h("div", { class: "top" },
        h("div", { class: "who" },
          h("span", { class: "eyebrow", text: S.family.name + " · " + DAYS[new Date().getDay()] + " " + new Date().getDate() + " " + MONTHS[new Date().getMonth()] }),
          h("button", { class: "child-btn", vars: { "--child": c.color }, onclick: S.children.length > 1 ? childSwitcher : null, "aria-label": S.children.length > 1 ? "Changer d'enfant" : null },
            h("span", { class: "dot" }), h("span", { class: "name", text: c.first_name }), S.children.length > 1 ? h("span", { class: "muted", vars: { "font-size": "20px" }, text: "▾" }) : null),
          h("span", { class: "small muted", text: ageLabel(c) })),
        h("div", { class: "who-side" },
          h("a", { href: "#/famille", class: "mstack", "aria-label": "Membres de la famille" }, membersInit),
          syncBadge())),
      sootheCard(),
      !sleeping ? napCard(canWrite) : null,
      nextApptCard(),
      h("section", { class: "stack", vars: { gap: "8px" } },
        h("span", { class: "eyebrow", text: "En ce moment" }),
        h("div", { class: "tiles" },
          tile("Dernier repas", CAT_COLOR.repas, lastFeed ? ago(lastFeed.ended_at || lastFeed.started_at) : "-", lastFeed ? label(lastFeed).replace("Tétée ", "sein ") : "aucun", function () { sheetFeed(); }, "repas"),
          // Couches : une quantité (changes du jour), pas une durée
          (function () { var nd = evToday.filter(function (e) { return e.type === "diaper"; }).length;
            return tile("Couches auj.", CAT_COLOR.couche, String(nd), lastDiaper ? "dernière " + ago(lastDiaper.started_at) : "aucune", function () { sheetDiaper(); }, "couche"); })(),
          tile("Sommeil", CAT_COLOR.sommeil, sleeping ? dur((Date.now() - new Date(sleeping.started_at)) / 60000) : lastSleep ? ago(lastSleep.ended_at || lastSleep.started_at) : "-", sleeping ? "il dort" : lastSleep ? "éveillé" : "aucun", function () { sheetSleep(); }, "sommeil"))),
      h("section", { class: "card" },
        h("div", { class: "row between" }, h("span", { class: "eyebrow", text: "Aujourd'hui" }), h("a", { href: "#/journal", class: "small", text: "Voir le journal" })),
        dayStrip(today, { label: "Frise des 24 heures : sommeils, repas et couches" }), hourAxis(),
        legend([["l-sleep", "Sommeil"], ["l-feed", "Repas"], ["l-diaper", "Couches"]]),
        h("div", { class: "counts" + (ENTER ? " enter" : "") },
          h("div", null, h("b", { text: evToday.filter(function (e) { return CAT[e.type] === "repas" && e.type !== "feed.pump"; }).length }), h("span", { vars: { color: CAT_COLOR.repas }, text: "repas" })),
          h("div", null, h("b", { text: evToday.filter(function (e) { return e.type === "diaper" && e.data.pee; }).length }), h("span", { vars: { color: CAT_COLOR.couche }, text: "mouillées" })),
          h("div", null, h("b", { text: evToday.filter(function (e) { return e.type === "diaper" && e.data.poo; }).length }), h("span", { vars: { color: CAT_COLOR.couche }, text: "selles" })),
          h("div", null, h("b", { text: dur(sleepMin).replace(NB + "h" + NB, "h") }), h("span", { vars: { color: CAT_COLOR.sommeil }, text: "sommeil" }))),
        h("div", { class: "list" }, recent.length ? recent.map(function (e) { return eventRow(e, canWrite); }) : h("span", { class: "empty", text: "Pas encore de saisie. Touchez le bouton + en bas, elles s'afficheront sur la frise." }))),
      !isStandalone() && !lsGet("gloups.installHidden") ? h("a", { href: "#/installer", class: "card ok", vars: { "text-decoration": "none" } }, h("b", { text: "Installer Gloups sur l'écran d'accueil" }), h("span", { class: "small", text: "Plein écran, plus rapide, un tap pour noter." })) : null
    ));
    appEl.append(dock("home", canWrite));
  }

  // Prochain rendez-vous dans les 14 jours
  function nextApptCard() {
    var now = Date.now();
    var a = myAppts().filter(function (x) { return apptEnd(x).getTime() > now && new Date(x.starts_at).getTime() < now + 14 * DAY_MS; })[0];
    if (!a) return null;
    return h("button", { class: "appt-card", onclick: function () { sheetApptDetail(a); } },
      h("span", { class: "ic", "aria-hidden": "true" }, icon("cal", 22)),
      h("span", { class: "grow" }, h("span", { class: "k", text: "Prochain rendez-vous" }), h("b", { text: a.title }), h("span", { class: "s", text: apptWhen(a) + (a.location ? " · " + a.location : "") })));
  }
  function eventRow(e, canWrite) {
    var d = evDuration(e), age = freshAge(e.id);
    var item = h("div", { class: "item" + (age != null ? " fresh" : ""), vars: age != null ? { "--age": -age + "ms" } : null },
      h("span", { class: "when", text: hhmm(e.started_at) }),
      h("span", { class: "badge", vars: { background: CAT_COLOR[CAT[e.type]] || "#888" } }),
      h("span", { class: "what" }, h("b", { text: label(e) }), h("span", { text: [e.ended_at ? d : "en cours", S.profiles[e.created_by] ? "par " + S.profiles[e.created_by] : null].filter(Boolean).join(" · ") })),
      canWrite ? h("button", { class: "del sr-only", "aria-label": "Supprimer " + label(e), onclick: function () { removeEvent(e); } }, icon("trash", 18)) : null);
    if (!canWrite) return item;
    var wrap = h("div", { class: "swipe" }, h("div", { class: "swipe-bg", "aria-hidden": "true" }, icon("trash", 22)), item);
    var x0 = null, y0 = 0, dx = 0, mode = null;
    item.addEventListener("pointerdown", function (ev) { if (ev.button) return; x0 = ev.clientX; y0 = ev.clientY; dx = 0; mode = null; });
    item.addEventListener("pointermove", function (ev) {
      if (x0 == null) return;
      var mx = ev.clientX - x0, my = ev.clientY - y0;
      if (!mode) {
        if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.2) { mode = "h"; try { item.setPointerCapture(ev.pointerId); } catch (er) { /* ignore */ } wrap.classList.add("moving"); }
        else if (Math.abs(my) > 8) { x0 = null; return; }
      }
      if (mode === "h") {
        dx = Math.min(0, mx); if (dx < -140) dx = -140 + (dx + 140) * 0.35;
        item.style.transform = "translateX(" + dx + "px)";
        wrap.classList.toggle("armed", dx < -90);
      }
    });
    var end = function () {
      if (mode === "h") {
        wrap.classList.remove("moving");
        if (dx < -90) {
          item.style.transform = "translateX(-105%)";
          wrap.style.height = wrap.offsetHeight + "px"; void wrap.offsetHeight;
          wrap.classList.add("gone");
          setTimeout(function () { removeEvent(e); }, 300);
        } else { item.style.transform = ""; wrap.classList.remove("armed"); }
      }
      x0 = null; mode = null;
    };
    item.addEventListener("pointerup", end); item.addEventListener("pointercancel", end);
    return wrap;
  }

  /* ---------- Barre du bas : onglets et bouton central qui éclot ---------- */
  var tabInd = { x: null };
  function dock(active, canWrite) {
    var tab = function (href, ic, txt, key) {
      return h("a", { href: href, "aria-current": active === key ? "page" : null, "data-tab": key }, icon(ic, 22), h("span", { text: txt }));
    };
    if (!PEEK) fabSync(true, canWrite);
    // L'indicateur naît déjà à sa dernière place : pas de glissement depuis la gauche à chaque nouvel affichage
    var ind = h("span", { class: "tab-ind" + (tabInd.x != null ? " on" : ""), "aria-hidden": "true" });
    if (tabInd.x != null) ind.style.transform = "translateX(" + tabInd.x + "px)";
    var nav = h("nav", { class: "dock" + (canWrite ? " has-fab" : ""), "aria-label": "Navigation principale" },
      tab("#/", "home", "Aujourd'hui", "home"), tab("#/journal", "list", "Journal", "journal"),
      canWrite ? h("span", { class: "fab-gap", "aria-hidden": "true" }) : null,
      tab("#/tendances", "chart", "Tendances", "tendances"), tab("#/famille", "family", "Famille", "famille"), ind);
    if (!PEEK) requestAnimationFrame(function () {
      var a = nav.querySelector('[data-tab="' + active + '"]'); if (!a || !nav.isConnected) return;
      var x = a.offsetLeft + a.offsetWidth / 2 - 10;
      if (tabInd.x != null && tabInd.x !== x) {
        ind.style.transition = "none"; ind.style.transform = "translateX(" + tabInd.x + "px)"; void ind.offsetWidth;
        ind.style.transition = ""; ind.classList.add("moving");
        setTimeout(function () { ind.classList.remove("moving"); }, 380);
      }
      else if (tabInd.x == null) { ind.style.transition = "none"; ind.style.transform = "translateX(" + x + "px)"; void ind.offsetWidth; ind.style.transition = ""; }
      ind.style.transform = "translateX(" + x + "px)"; ind.classList.add("on");
      tabInd.x = x;
    });
    return h("div", { class: "dock-wrap" }, nav);
  }

  // Bulles : libellé, couleur, icône (ou lettre), diamètre
  var BUB = {
    repas: ["Repas", "repas", "bottle", 60], sommeil: ["Sommeil", "sommeil", "moon", 60], couche: ["Couche", "couche", "diaper", 60],
    pleurs: ["Pleurs", "pleurs", "wave", 60], plus: ["Plus", "neutre", "dots", 60],
    g: ["Sein gauche", "repas", "G", 78], d: ["Sein droit", "repas", "D", 78], biberon: ["Biberon", "repas", "bottle", 58], tirelait: ["Tire-lait", "repas", "drop", 58],
    pipi: ["Pipi", "couche", "drop", 64], deux: ["Les deux", "couche", "diaper", 64], selles: ["Selles", "couche", "diaper", 64],
    bain: ["Bain", "sante", "bath", 56], temp: ["Température", "sante", "temp", 56], poids: ["Poids", "sante", "scale", 56], note: ["Note", "neutre", "note", 56], sons: ["Sons", "sommeil", "music", 56]
  };
  function arc(ids) {
    var o = {}, n = ids.length;
    ids.forEach(function (id, i) { var a = (155 - 130 * i / (n - 1)) * Math.PI / 180; o[id] = [Math.round(135 * Math.cos(a)), Math.round(-150 * Math.sin(a))]; });
    return o;
  }
  var LEVELS = {
    root: arc(["repas", "sommeil", "couche", "pleurs", "plus"]),
    repas: { g: [-92, -112], d: [92, -112], biberon: [-46, -218], tirelait: [46, -218] },
    couche: { pipi: [-104, -96], deux: [0, -168], selles: [104, -96] },
    plus: arc(["bain", "temp", "poids", "note", "sons"])
  };
  var QUESTION = { root: "Que se passe-t-il ?", repas: "Quel repas ?", couche: "Quelle couche ?", plus: "Autre saisie" };
  var fab = { el: null, level: null, canWrite: false, bubbles: {}, pills: {} };

  function suggestedSide() {
    var last = S.events.find(function (e) { return e.type === "feed.breast"; });
    return last ? (last.data.side === "left" ? "right" : last.data.side === "right" ? "left" : null) : null;
  }
  function runningOf(type) { return running().find(function (e) { return e.type === type; }); }
  function stopWithToast(ev) {
    stopEvent(ev).then(function (x) { if (x) toast(label(x) + " · " + dur((new Date(x.ended_at) - new Date(x.started_at)) / 60000)); });
  }
  function fabAction(id) {
    var go = function (l) { fabLevel(l); };
    var then = function (fn) { fabLevel(null); fn(); };
    track("fab", id);
    switch (id) {
      case "repas": case "couche": case "plus": go(id); return;
      case "sommeil": then(async function () {
        var c = runningOf("sleep"); if (c) { stopWithToast(c); return; }
        var ev = await logEvent("sleep", {}, { running: true }); var s2 = lsGet("gloups.sndSleep");
        if (ev && s2 && s2 !== "none") sndPlay(s2, sndMinutes(), ev.id);
      }); return;
      case "pleurs": then(function () { var c = runningOf("cry"); if (c) stopWithToast(c); else logEvent("cry", {}, { running: true }); }); return;
      case "g": then(function () { dockBreast("left"); }); return;
      case "d": then(function () { dockBreast("right"); }); return;
      case "biberon": then(sheetBottle); return;
      case "tirelait": then(sheetPump); return;
      case "pipi": then(function () { logEvent("diaper", { pee: true, poo: false }); }); return;
      case "selles": then(function () { sheetPoo(false); }); return;
      case "deux": then(function () { sheetPoo(true); }); return;
      case "bain": then(function () { logEvent("bath", {}); }); return;
      case "temp": then(sheetTemp); return;
      case "poids": then(sheetWeight); return;
      case "note": then(sheetNote); return;
      case "sons": then(function () { sheetSounds(); }); return;
    }
  }
  function fabBuild() {
    var bd = h("div", { class: "fab-bd", onclick: function () { fabLevel(null); } });
    var q = h("div", { class: "fab-q", "aria-hidden": "true" });
    var layer = h("div", { class: "fab-bubbles" });
    Object.keys(BUB).forEach(function (id) {
      var b = BUB[id];
      var disc = h("span", { class: "disc" }, b[2].length === 1 ? h("b", { text: b[2] }) : icon(b[2], b[3] > 60 ? 26 : 24),
        id === "g" || id === "d" ? h("span", { class: "sug", text: "suggéré" }) : null);
      var lbl = h("span", { class: "lbl", text: b[0] });
      var lp = null, lpDone = false;
      var btn = h("button", { class: "bub c-" + b[1], tabindex: "-1", "aria-hidden": "true", vars: { "--d": b[3] + "px" }, onclick: function () { if (lpDone) { lpDone = false; return; } fabAction(id); } }, disc, lbl);
      // Appui long : noter après coup (le tap reste instantané)
      if (AFTER[id]) {
        var cancel = function () { clearTimeout(lp); lp = null; };
        btn.addEventListener("pointerdown", function () { lpDone = false; cancel(); lp = setTimeout(function () {
          lpDone = true; lp = null; if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) { /* rien */ }
          lsSet("gloups.lpUsed", "1"); track("fab", "apres_" + id); fabLevel(null); sheetAfter(id);
        }, 450); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (n) { btn.addEventListener(n, cancel); });
        btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      }
      fab.bubbles[id] = { btn: btn, lbl: lbl };
      layer.append(btn);
    });
    var btn = h("button", { class: "fab", "aria-label": "Nouvelle saisie", "aria-expanded": "false", onclick: function () { fabLevel(fab.level === "root" ? null : "root"); } }, h("span", { class: "rot" }, icon("plus", 30)));
    var pills = h("div", { class: "pills", role: "group", "aria-label": "Activités en cours" });
    var who = h("div", { class: "fab-who" });
    fab.el = h("div", { class: "fab-root" }, pills, bd, who, q, layer, btn);
    fab.parts = { bd: bd, q: q, btn: btn, pills: pills, who: who };
    document.body.append(fab.el);
  }
  function fabLevel(l) {
    if (!fab.el) return;
    if (l && !fab.canWrite) l = null;
    fab.level = l;
    var cur = l ? LEVELS[l] : {}, keys = Object.keys(cur);
    var k = Math.min(1, Math.max(0.72, (window.innerWidth / 2 - 52) / 135));
    var sug = suggestedSide(), sleeping = runningOf("sleep"), crying = runningOf("cry");
    fab.bubbles.sommeil.lbl.textContent = sleeping ? "Réveil" : "Sommeil";
    fab.bubbles.pleurs.lbl.textContent = crying ? "Fin des pleurs" : "Pleurs";
    Object.keys(fab.bubbles).forEach(function (id) {
      var b = fab.bubbles[id], p = cur[id], on = !!p;
      b.btn.style.setProperty("--x", (on ? p[0] * k : 0) + "px");
      b.btn.style.setProperty("--y", (on ? p[1] : 24) + "px");
      b.btn.style.setProperty("--dl", (on ? keys.indexOf(id) * 40 : 0) + "ms");
      b.btn.classList.toggle("on", on);
      b.btn.classList.toggle("is-sug", (id === "g" && sug === "left") || (id === "d" && sug === "right"));
      b.btn.tabIndex = on ? 0 : -1;
      b.btn.setAttribute("aria-hidden", on ? "false" : "true");
    });
    fab.parts.q.replaceChildren(l ? QUESTION[l] : "", l && l !== "plus" && !lsGet("gloups.lpUsed") ? h("span", { class: "fab-hint", text: "Appui long sur une bulle : noter après coup" }) : "");
    if (l && twinMode()) fab.parts.who.replaceChildren(forPicker(function () { if (fab.level) fabLevel(fab.level); })); else if (!l) fab.parts.who.replaceChildren();
    fab.el.classList.toggle("has-who", !!l && twinMode());
    fab.el.classList.toggle("open", !!l);
    document.documentElement.classList.toggle("fab-open", !!l);
    fab.parts.btn.setAttribute("aria-expanded", l ? "true" : "false");
    fab.parts.btn.setAttribute("aria-label", !l ? "Nouvelle saisie" : l === "root" ? "Fermer" : "Retour");
    if (l) { var first = fab.bubbles[keys[0]]; if (first) setTimeout(function () { if (fab.level === l) first.btn.focus({ preventScroll: true }); }, 60); }
  }
  // Appelé à chaque rendu : visibilité du bouton, pilules des activités en cours
  function fabSync(visible, canWrite) {
    if (!fab.el) fabBuild();
    fab.canWrite = !!canWrite;
    fab.el.classList.toggle("shown", !!visible);
    fab.el.classList.toggle("can-write", !!(visible && canWrite));
    if (!visible || !canWrite) { if (fab.level) fabLevel(null); }
    else if (fab.level) fabLevel(fab.level);
    var live = visible ? running().slice(0, 2) : [];
    var ids = live.map(function (e) { return e.id; });
    Object.keys(fab.pills).forEach(function (id) {
      if (ids.indexOf(id) >= 0) return;
      var el = fab.pills[id]; delete fab.pills[id];
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 260);
    });
    live.forEach(function (ev) {
      var el = pill(ev, canWrite);
      if (fab.pills[ev.id]) fab.pills[ev.id].replaceWith(el); else el.classList.add("in");
      fab.pills[ev.id] = el;
      fab.parts.pills.append(el);
    });
    document.documentElement.style.setProperty("--pills-h", (live.length * 72) + "px");
    sndRender();
  }
  function pill(ev, canWrite) {
    var acts = h("div", { class: "acts" });
    if (canWrite) {
      if (ev.type === "feed.breast" && ev.data.side !== "both") acts.append(h("button", { class: "swap", "aria-label": "Changer de côté", onclick: async function () {
        var stopped = await stopEvent(ev); if (!stopped) return;
        await logEvent("feed.breast", { side: ev.data.side === "left" ? "right" : "left" }, { running: true });
      } }, icon("swap", 18), h("span", { text: "Côté" })));
      if (ev.type === "sleep" && !(SND.id && SND.linked === ev.id)) acts.append(h("button", { class: "swap", "aria-label": "Lancer un son", onclick: function () { sheetSleep(); } }, icon("music", 18), h("span", { text: "Son" })));
      acts.append(h("button", { class: "stop", onclick: function () { stopWithToast(ev); }, text: ev.type === "sleep" ? "Réveil" : "Terminer" }));
    }
    var tEl = h("span", { class: "t", text: label(ev) + " · depuis " + hhmm(ev.started_at) });
    var tm = h("span", { class: "time", "data-start": ev.started_at, text: clock((Date.now() - new Date(ev.started_at)) / 1000) });
    var txt = h("div", { class: "txt" }, tEl, tm);
    var el = h("div", { class: "pill", "data-id": ev.id }, h("span", { class: "breath", "aria-hidden": "true" }), txt, acts);
    // Lancé trop tard (ou trop tôt) : glisser la pastille décale le début, minute par minute
    if (canWrite) {
      var px = null, shift = 0, s0 = new Date(ev.started_at).getTime();
      var floor = S.events.filter(function (e) { return e.type === ev.type && e.id !== ev.id && e.ended_at && new Date(e.ended_at).getTime() <= s0; })
        .reduce(function (m, e) { return Math.max(m, new Date(e.ended_at).getTime()); }, s0 - 6 * 3600000);
      var lim = function (m) { return Math.max(Math.round((floor - s0) / 60000), Math.min(m, Math.floor((Date.now() - s0) / 60000) - 1)); };
      txt.addEventListener("pointerdown", function (e) { px = e.clientX; shift = 0; el.classList.add("drag"); try { txt.setPointerCapture(e.pointerId); } catch (x) { /* rien */ } });
      txt.addEventListener("pointermove", function (e) {
        if (px == null) return;
        var dx = e.clientX - px; shift = lim(Math.round(dx / 3));
        el.style.transform = "translateX(" + (dx * 0.3) + "px)";
        var st = s0 + shift * 60000;
        tEl.textContent = (ev.type === "sleep" ? "Endormi à " : "Début à ") + hhmm(new Date(st)) + (shift ? " · " + (shift < 0 ? "−" : "+") + Math.abs(shift) + NB + "min" : "");
        tm.dataset.start = new Date(st).toISOString(); tm.textContent = clock((Date.now() - st) / 1000);
      });
      var done = async function () {
        if (px == null) return;
        px = null; el.classList.remove("drag"); el.style.transform = "";
        if (!shift) return;
        var iso = new Date(s0 + shift * 60000).toISOString(), old = ev.started_at;
        var q = sb.from("events").update({ started_at: iso });
        var r = ev.data && ev.data.twin_group ? await q.eq("family_id", S.family.id).eq("data->>twin_group", ev.data.twin_group).is("ended_at", null).select()
          : await q.eq("id", ev.id).select();
        if (r.error) { toast(errMsg(r.error), { error: true }); route(); return; }
        (r.data || []).forEach(replaceEvent); route();
        toast((ev.type === "sleep" ? "Endormi à " : "Début à ") + hhmm(new Date(iso)), { action: { label: "Annuler", fn: async function () {
          var r2 = await sb.from("events").update({ started_at: old }).eq("id", ev.id).select(); if (!r2.error) { (r2.data || []).forEach(replaceEvent); route(); }
        } } });
      };
      txt.addEventListener("pointerup", done); txt.addEventListener("pointercancel", done);
    }
    return el;
  }

  function childSwitcher() {
    openSheet("Changer d'enfant", h("div", { class: "stack" }, S.children.map(function (c) {
      return h("button", { class: "btn full", vars: { "justify-content": "flex-start" }, onclick: async function () { S.child = c; weights = null; lsSet("gloups.child", c.id); closeSheet(); await loadEvents(); route(); } },
        h("span", { class: "avatar", vars: { background: c.color, width: "32px", height: "32px" }, text: initials(c.first_name) }), c.first_name);
    })));
  }

  /* ---------- Berceuses et sons apaisants ---------- */
  // Créés pour Gloups : airs traditionnels ou classiques libres de droits, bruits générés. Fichiers dans audio/.
  var SOUNDS = [
    { id: "clair", name: "Au clair de la lune", kind: "berceuse" }, { id: "etoile", name: "Ah ! vous dirai-je, maman", kind: "berceuse" },
    { id: "jacques", name: "Frère Jacques", kind: "berceuse" }, { id: "brahms", name: "Berceuse de Brahms", kind: "berceuse" },
    { id: "gymno", name: "Gymnopédie n° 1", kind: "berceuse" }, { id: "canon", name: "Canon de Pachelbel", kind: "berceuse" },
    { id: "green", name: "Greensleeves", kind: "berceuse" }, { id: "ode", name: "Ode à la joie", kind: "berceuse" },
    { id: "blanc", name: "Bruit blanc", kind: "bruit" }, { id: "rose", name: "Bruit rose, plus doux", kind: "bruit" },
    { id: "grave", name: "Bruit grave, comme un ventilateur", kind: "bruit" }, { id: "pluie", name: "Pluie douce", kind: "bruit" },
    { id: "chut", name: "Chut répété", kind: "bruit" }, { id: "coeur", name: "Battements de cœur", kind: "bruit" },
    { id: "vagues", name: "Vagues", kind: "bruit" }
  ];
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var SND = { audio: null, id: null, until: null, paused: false, timer: null, el: null, linked: null, vol: +(lsGet("gloups.sndVol") || 0.8) };
  function sndInfo(id) { return SOUNDS.find(function (x) { return x.id === id; }); }
  function sndMinutes() { return lsGet("gloups.sndT") || "30"; }
  function sndPlay(id, minutes, linkedId) {
    if (!SND.audio) { SND.audio = new Audio(); SND.audio.loop = true; SND.audio.preload = "auto"; SND.audio.setAttribute("playsinline", ""); }
    var a = SND.audio;
    if (SND.id !== id || !a.src) a.src = "audio/" + id + ".m4a";
    SND.id = id; SND.paused = false; SND.linked = linkedId || null;
    if (!IOS) a.volume = SND.vol;
    var m = minutes || sndMinutes();
    SND.until = m === "inf" ? null : Date.now() + (+m) * 60000;
    var pr = a.play(); if (pr && pr.catch) pr.catch(function () { SND.paused = true; sndRender(); });
    clearInterval(SND.timer); SND.timer = setInterval(sndTick, 1000);
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: sndInfo(id).name, artist: "Gloups", artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
        navigator.mediaSession.setActionHandler("play", function () { sndToggle(); });
        navigator.mediaSession.setActionHandler("pause", function () { sndToggle(); });
        navigator.mediaSession.setActionHandler("stop", function () { sndStop(); });
      } catch (e) { /* rien */ }
    }
    track("action", "son_" + id);
    sndRefresh();
  }
  function sndToggle() {
    if (!SND.id) return;
    if (SND.paused) { SND.paused = false; var pr = SND.audio.play(); if (pr && pr.catch) pr.catch(function () {}); }
    else { SND.paused = true; SND.audio.pause(); }
    sndRender();
  }
  function sndStop() {
    if (SND.audio) { SND.audio.pause(); if (!IOS) SND.audio.volume = SND.vol; }
    SND.id = null; SND.until = null; SND.linked = null; clearInterval(SND.timer);
    if ("mediaSession" in navigator) { try { navigator.mediaSession.metadata = null; } catch (e) { /* rien */ } }
    sndRefresh();
  }
  function sndTick() {
    if (!SND.id) return;
    if (SND.until && !SND.paused) {
      var left = SND.until - Date.now();
      if (left <= 0) { sndStop(); return; }
      if (left < 60000 && !IOS) SND.audio.volume = SND.vol * left / 60000; // baisse douce la dernière minute
    }
    var t = SND.el && SND.el.querySelector(".snd-left"); if (t) t.textContent = sndLeftText();
  }
  function sndLeftText() {
    if (SND.paused) return "en pause";
    if (!SND.until) return "en boucle";
    var m = Math.max(1, Math.ceil((SND.until - Date.now()) / 60000));
    return "s'arrête dans " + m + NB + "min";
  }
  function sndRefresh() { if (fab.el && fab.parts) fabSync(fab.el.classList.contains("shown"), fab.canWrite); else sndRender(); }
  // Pastille de lecture, au-dessus des minuteurs
  function sndRender() {
    if (SND.el) { SND.el.remove(); SND.el = null; }
    if (SND.id && fab.parts && fab.el && fab.el.classList.contains("shown")) {
      var inf = sndInfo(SND.id);
      SND.el = h("div", { class: "pill snd" },
        h("button", { class: "snd-open", "aria-label": "Tous les sons", onclick: function () { sheetSounds(); } },
          h("span", { class: "snd-ico" + (SND.paused ? "" : " on") }, SND.paused ? icon(inf.kind === "berceuse" ? "music" : "noise", 18) : h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i"))),
          h("span", { class: "txt" }, h("span", { class: "t2", text: inf.name }), h("span", { class: "snd-left", text: sndLeftText() }))),
        h("div", { class: "acts" },
          h("button", { class: "rnd", "aria-label": SND.paused ? "Reprendre" : "Pause", onclick: sndToggle }, icon(SND.paused ? "play" : "pause", 18)),
          h("button", { class: "rnd", "aria-label": "Arrêter le son", onclick: sndStop }, icon("stop", 16))));
      fab.parts.pills.append(SND.el);
    }
    var n = Object.keys(fab.pills || {}).length + (SND.el ? 1 : 0);
    document.documentElement.style.setProperty("--pills-h", (n * 72) + "px");
    var card = document.querySelector("main .soothe"); if (card) card.replaceWith(sootheCard());
  }
  // Toute la bibliothèque : berceuses, bruits, minuterie, volume
  function sheetSounds(tab) {
    tab = tab || ((sndInfo(SND.id || lsGet("gloups.snd") || "clair") || {}).kind) || "berceuse";
    var body = h("div", { class: "stack" });
    function draw() {
      var seg = h("div", { class: "seg" }, [["berceuse", "Berceuses"], ["bruit", "Bruits apaisants"]].map(function (o) {
        return h("button", { "aria-pressed": tab === o[0] ? "true" : "false", onclick: function () { tab = o[0]; draw(); }, text: o[1] });
      }));
      var list = h("div", { class: "snd-list" }, SOUNDS.filter(function (x) { return x.kind === tab; }).map(function (x) {
        var on = SND.id === x.id && !SND.paused;
        return h("button", { class: "snd-row" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: function () {
          if (SND.id === x.id) sndToggle(); else sndPlay(x.id, null, SND.linked);
          lsSet("gloups.snd", x.id); draw();
        } },
          h("span", { class: "snd-ico" + (on ? " on" : "") }, on ? h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")) : icon(x.kind === "berceuse" ? "music" : "noise", 20)),
          h("span", { class: "txt" }, h("b", { text: x.name }), h("span", { class: "small muted", text: on ? sndLeftText() : x.kind === "berceuse" ? "boîte à musique, en boucle" : "continu" })),
          h("span", { class: "snd-act", text: on ? "Pause" : SND.id === x.id ? "Reprendre" : "Écouter" }));
      }));
      var mins = sndMinutes();
      var tseg = h("div", { class: "seg" }, [["15", "15 min"], ["30", "30 min"], ["45", "45 min"], ["inf", "Jamais"]].map(function (o) {
        return h("button", { "aria-pressed": mins === o[0] ? "true" : "false", onclick: function () {
          lsSet("gloups.sndT", o[0]); if (SND.id) SND.until = o[0] === "inf" ? null : Date.now() + (+o[0]) * 60000; draw(); sndRender();
        }, text: o[1] });
      }));
      var vol = IOS ? h("span", { class: "small muted", text: "Volume : utilisez les boutons du téléphone." })
        : h("label", { class: "row", vars: { gap: "10px" } }, h("span", { class: "small muted", text: "Volume" }), h("input", { type: "range", min: "0", max: "100", value: String(Math.round(SND.vol * 100)), "aria-label": "Volume", vars: { flex: "1" }, oninput: function (e) { SND.vol = e.target.value / 100; lsSet("gloups.sndVol", String(SND.vol)); if (SND.audio) SND.audio.volume = SND.vol; } }));
      body.replaceChildren(seg, list,
        h("div", { class: "field" }, h("span", { text: "S'arrête après" }), tseg),
        h("span", { class: "small muted", text: "Le volume baisse doucement la dernière minute." }), vol,
        SND.id ? h("button", { class: "btn ghost full", onclick: function () { sndStop(); draw(); }, text: "Arrêter le son" }) : "",
        h("span", { class: "small muted", text: "Berceuses créées pour Gloups sur des airs libres de droits." }));
    }
    draw();
    openSheet("Sons apaisants", body);
  }
  // Pendant des pleurs : apaiser en un tap, et ce qui a marché la dernière fois
  function sootheCard() {
    var cry = runningOf("cry");
    if (!cry) return h("span", { class: "soothe", hidden: true });
    var opts = [["chut", "Chut répété"], ["coeur", "Battements de cœur"], ["blanc", "Bruit blanc"]];
    var last = S.events.find(function (e) { return e.type === "cry" && e.ended_at && e.data && e.data.soothe; });
    var lastTxt = last ? (sndInfo(last.data.soothe) || {}).name + ", calmé en " + dur((new Date(last.ended_at) - new Date(last.started_at)) / 60000) : null;
    return h("section", { class: "card soothe" },
      h("div", { class: "row between" }, h("b", { text: "Apaiser" }), h("button", { class: "linkbtn", onclick: function () { sheetSounds("bruit"); }, text: "Tous les sons" })),
      h("div", { class: "soothe-grid" }, opts.map(function (o) {
        var on = SND.id === o[0] && !SND.paused;
        return h("button", { class: "soothe-btn s-" + o[0] + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: function () {
          if (on) sndStop(); else sndPlay(o[0], "30", cry.id);
        } }, h("span", { class: "disc" }, on ? h("span", { class: "eq", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i")) : icon(o[0] === "coeur" ? "heart" : o[0] === "chut" ? "wave" : "noise", 22)), h("span", { text: o[1] }));
      })),
      lastTxt ? h("span", { class: "small muted", text: "La dernière fois : " + lastTxt + "." }) : null);
  }

  /* ---------- Feuilles de saisie ---------- */
  function timeChooser() {
    var choice = 0;
    var custom = h("input", { class: "input", type: "time", hidden: true, value: hhmm(new Date()) });
    var chips = h("div", { class: "chips" });
    var opts = [[0, "Maintenant"], [15, "Il y a 15 min"], [30, "Il y a 30 min"], [-1, "Autre heure"]];
    function draw() {
      chips.replaceChildren.apply(chips, opts.map(function (o) {
        return h("button", { type: "button", class: "chip", "aria-pressed": choice === o[0] ? "true" : "false", onclick: function () { choice = o[0]; custom.hidden = choice !== -1; draw(); }, text: o[1] });
      }));
    }
    draw();
    return {
      el: h("div", { class: "field" }, h("span", { text: "Heure" }), chips, custom),
      value: function () {
        if (choice >= 0) return new Date(Date.now() - choice * 60000);
        var p = custom.value.split(":"), d = new Date(); d.setHours(+p[0], +p[1], 0, 0);
        if (d > new Date()) d = new Date(d.getTime() - 86400000);
        return d;
      }
    };
  }
  function selectField(lbl, map, empty) {
    var s = h("select", { class: "input" }, h("option", { value: "", text: empty || "Non précisé" }), Object.keys(map).map(function (k) { return h("option", { value: k, text: map[k] }); }));
    return { el: h("label", { class: "field" }, h("span", { text: lbl }), s), value: function () { return s.value || null; } };
  }

  function sheetFeed() {
    openSheet("Repas", h("div", { class: "stack" }, entryPicker(),
      h("div", { class: "big3" },
        h("button", { class: "bigbtn repas", onclick: function () { closeSheet(); dockBreast("left"); }, text: "Sein gauche" }),
        h("button", { class: "bigbtn repas", onclick: function () { closeSheet(); dockBreast("right"); }, text: "Sein droit" }),
        h("button", { class: "bigbtn repas", onclick: function () { logEvent("feed.breast", { side: "both" }, { running: true }); }, text: "Les deux" })),
      h("div", { class: "big2" },
        h("button", { class: "bigbtn neutral", onclick: sheetBottle, text: "Biberon" }),
        h("button", { class: "bigbtn neutral", onclick: sheetPump, text: "Tire-lait" })),
      h("button", { class: "btn full", onclick: sheetPastBreast, text: "Noter une tétée passée" })));
  }
  async function dockBreast(side) {
    var cur = running().find(function (e) { return e.type === "feed.breast"; });
    if (cur) await stopEvent(cur);
    logEvent("feed.breast", { side: side }, { running: true });
  }
  function sheetPastBreast() {
    var side = "left", mins = 15;
    var sideSeg = h("div", { class: "seg" });
    function drawSide() { sideSeg.replaceChildren.apply(sideSeg, [["left", "Gauche"], ["right", "Droit"], ["both", "Les deux"]].map(function (o) { return h("button", { type: "button", "aria-pressed": side === o[0] ? "true" : "false", onclick: function () { side = o[0]; drawSide(); }, text: o[1] }); })); }
    drawSide();
    var durChips = h("div", { class: "chips" });
    function drawDur() { durChips.replaceChildren.apply(durChips, [5, 10, 15, 20, 30, 45].map(function (m) { return h("button", { type: "button", class: "chip", "aria-pressed": mins === m ? "true" : "false", onclick: function () { mins = m; drawDur(); }, text: m + NB + "min" }); })); }
    drawDur();
    var t = timeChooser();
    openSheet("Tétée passée", h("div", { class: "stack" }, entryPicker(), sideSeg, h("div", { class: "field" }, h("span", { text: "Durée" }), durChips), t.el,
      h("button", { class: "btn primary full", onclick: function () { var st = t.value(); logEvent("feed.breast", { side: side }, { started: st, ended: new Date(st.getTime() + mins * 60000) }); }, text: "Enregistrer" })));
  }
  function sheetBottle() {
    var ml = 90;
    var chips = h("div", { class: "chips" });
    function draw() { chips.replaceChildren.apply(chips, [30, 60, 90, 120, 150, 180, 210].map(function (v) { return h("button", { type: "button", class: "chip", "aria-pressed": ml === v ? "true" : "false", onclick: function () { ml = v; draw(); }, text: v + NB + "ml" }); })); }
    draw();
    var milk = selectField("Lait", { breastmilk: "Lait maternel", formula: "Lait infantile", other: "Autre" });
    var t = timeChooser();
    openSheet("Biberon", h("div", { class: "stack" }, entryPicker(), h("div", { class: "field" }, h("span", { text: "Quantité" }), chips), milk.el, t.el,
      h("button", { class: "btn primary full", onclick: function () { var d = { ml: ml }; if (milk.value()) d.milk = milk.value(); logEvent("feed.bottle", d, { started: t.value() }); }, text: "Enregistrer le biberon" })));
  }
  function sheetPump() {
    var ml = selectField("Quantité", { 20: "20 ml", 40: "40 ml", 60: "60 ml", 80: "80 ml", 100: "100 ml", 120: "120 ml", 150: "150 ml" });
    var side = selectField("Côté", { left: "Gauche", right: "Droit", both: "Les deux" });
    var t = timeChooser();
    openSheet("Tire-lait", h("div", { class: "stack" }, entryPicker(), ml.el, side.el, t.el,
      h("button", { class: "btn primary full", onclick: function () { var d = {}; if (ml.value()) d.ml = parseInt(ml.value(), 10); if (side.value()) d.side = side.value(); logEvent("feed.pump", d, { started: t.value() }); }, text: "Enregistrer" })));
  }
  // Couleurs affichées en vrai, pour choisir d'un coup d'oeil
  var COLOR_SWATCH = { yellow: "#E9C440", mustard: "#C99A2E", green: "#6E8B3D", brown: "#7A5230", black: "#2A2522", white: "#EFE8D6", red: "#B03A2E" };
  function pickChips(map, swatches) {
    var val = null, box = h("div", { class: swatches ? "swatches" : "chips", role: "group" });
    function draw() {
      box.replaceChildren.apply(box, Object.keys(map).map(function (k) {
        return h("button", { type: "button", class: swatches ? "swatch" : "chip", "aria-pressed": val === k ? "true" : "false", onclick: function () { val = val === k ? null : k; draw(); if (box.onpick) box.onpick(val); } },
          swatches ? h("span", { class: "sw", vars: { background: swatches[k] } }) : null, map[k]);
      }));
    }
    draw();
    return { el: box, value: function () { return val; } };
  }
  function sheetPoo(pee, started) {
    var color = pickChips(COLORS, COLOR_SWATCH), texture = pickChips(TEXTURES);
    var warn = h("div", { class: "card alert small", hidden: true, text: "Selles blanches, noires ou avec du sang : demandez un avis médical sans attendre." });
    // Les premiers jours, les selles noires ou vert foncé (méconium) sont normales
    var bd = S.child && S.child.birth_date ? new Date(S.child.birth_date + "T00:00:00") : null;
    var newborn = bd && (Date.now() - bd.getTime()) < 4 * 86400000;
    color.el.onpick = function (v) {
      if (v === "black" && newborn) { warn.className = "card small"; warn.textContent = "Les premières selles (méconium) sont noires ou vert foncé : c'est normal les premiers jours."; warn.hidden = false; return; }
      warn.className = "card alert small"; warn.textContent = "Selles blanches, noires ou avec du sang : demandez un avis médical sans attendre.";
      warn.hidden = ["white", "black", "red"].indexOf(v) < 0;
    };
    var save = function (details) { return function () {
      var d = { pee: pee, poo: true };
      if (details && color.value()) d.color = color.value();
      if (details && texture.value()) d.texture = texture.value();
      logEvent("diaper", d, { started: started || new Date() });
    }; };
    openSheet(pee ? "Pipi et selles" : "Selles", h("div", { class: "stack" }, entryPicker(),
      h("div", { class: "field" }, h("span", { text: "Couleur" }), color.el),
      h("div", { class: "field" }, h("span", { text: "Aspect" }), texture.el),
      warn,
      h("button", { class: "btn primary full", onclick: save(true), text: "Enregistrer" }),
      h("button", { class: "btn ghost full", onclick: save(false), text: "Enregistrer sans préciser" })));
  }
  function sheetDiaper() {
    var t = timeChooser();
    openSheet("Couche", h("div", { class: "stack" }, entryPicker(),
      h("div", { class: "big3" },
        h("button", { class: "bigbtn couche", onclick: function () { logEvent("diaper", { pee: true, poo: false }, { started: t.value() }); }, text: "Pipi" }),
        h("button", { class: "bigbtn couche", onclick: function () { sheetPoo(false, t.value()); }, text: "Selles" }),
        h("button", { class: "bigbtn couche", onclick: function () { sheetPoo(true, t.value()); }, text: "Les deux" })),
      t.el));
  }
  function sheetSleep() {
    var cur = running().find(function (e) { return e.type === "sleep"; });
    var place = selectField("Lieu", PLACES);
    if (cur) {
      // Sieste déjà lancée (par exemple avec le bouton +) : on peut encore lancer ou changer le son
      var cS = SND.id && SND.linked === cur.id ? SND.id : (lsGet("gloups.sndSleep") && lsGet("gloups.sndSleep") !== "none" ? lsGet("gloups.sndSleep") : "clair"), cT = sndMinutes();
      var cBox = h("div", { class: "stack", vars: { gap: "8px" } });
      var drawCur = function () {
        var playing = SND.id && SND.linked === cur.id && !SND.paused;
        var ids = ["clair", "blanc", "pluie", "coeur"]; if (ids.indexOf(cS) < 0) ids.unshift(cS);
        cBox.replaceChildren(
          h("div", { class: "row between" }, h("span", { class: "small muted", vars: { "font-weight": "700" }, text: "Son pour la sieste" }), h("button", { class: "linkbtn", onclick: function () { sheetSounds(); }, text: "Tous les sons" })),
          h("div", { class: "chips" }, ids.map(function (id) {
            return h("button", { class: "chip", "aria-pressed": cS === id ? "true" : "false", onclick: function () { cS = id; if (playing) { sndPlay(cS, cT, cur.id); lsSet("gloups.sndSleep", cS); } drawCur(); }, text: sndInfo(id).name });
          })),
          h("div", { class: "field" }, h("span", { text: "S'arrête après" }), h("div", { class: "seg" }, [["15", "15 min"], ["30", "30 min"], ["45", "45 min"], ["inf", "Jamais"]].map(function (o) {
            return h("button", { "aria-pressed": cT === o[0] ? "true" : "false", onclick: function () { cT = o[0]; lsSet("gloups.sndT", cT); if (playing) SND.until = cT === "inf" ? null : Date.now() + (+cT) * 60000; sndRender(); drawCur(); }, text: o[1] });
          }))),
          playing ? h("button", { class: "btn full", onclick: function () { sndStop(); drawCur(); }, text: "Arrêter le son" })
            : h("button", { class: "bigbtn sommeil", onclick: function () { lsSet("gloups.sndSleep", cS); lsSet("gloups.sndT", cT); sndPlay(cS, cT, cur.id); closeSheet(); }, text: "Lancer " + sndInfo(cS).name.toLowerCase() }));
      };
      drawCur();
      openSheet("Sommeil", h("div", { class: "stack" }, h("p", { text: "Endormi depuis " + hhmm(cur.started_at) + " (" + ago(cur.started_at) + ")." }),
        cBox,
        h("button", { class: "btn primary full", onclick: function () { closeSheet(); stopEvent(cur); }, text: "Il se réveille" })));
      return;
    }
    // Après coup : l'arc, sans saisir d'heure
    var pastBtn = h("button", { class: "btn full" });
    var past = arcDial("sleep", { start: Date.now() - 95 * 60000, end: Date.now() - 15 * 60000, onChange: function (v) {
      pastBtn.disabled = v.busy;
      pastBtn.textContent = v.live ? "Il dort encore, lancer le minuteur" : "Enregistrer, " + hhmm(v.start) + " à " + hhmm(v.end);
    } });
    pastBtn.onclick = function () {
      var v = past.get(); if (v.busy) return;
      var d = {}; if (place.value()) d.place = place.value();
      if (v.live) logEvent("sleep", d, { running: true, started: v.start }); else logEvent("sleep", d, { started: v.start, ended: v.end });
    };
    // Pour l'endormir : un son lancé en même temps que la sieste, retenu pour la prochaine fois
    var pickS = lsGet("gloups.sndSleep") || "none", pickT = sndMinutes();
    var sndBox = h("div", { class: "stack", vars: { gap: "8px" } });
    var go = h("button", { class: "bigbtn sommeil", onclick: async function () {
      var d = {}; if (place.value()) d.place = place.value();
      lsSet("gloups.sndSleep", pickS); lsSet("gloups.sndT", pickT);
      var ev = await logEvent("sleep", d, { running: true });
      if (ev && pickS !== "none") sndPlay(pickS, pickT, ev.id);
    } });
    function drawSnd() {
      var ids = ["none", "clair", "blanc", "pluie"]; var last = lsGet("gloups.snd"); if (last && ids.indexOf(last) < 0) ids.splice(1, 0, last);
      var chips = h("div", { class: "chips" }, ids.map(function (id) {
        return h("button", { class: "chip", "aria-pressed": pickS === id ? "true" : "false", onclick: function () { pickS = id; drawSnd(); }, text: id === "none" ? "Aucun son" : sndInfo(id).name });
      }));
      var tseg = h("div", { class: "seg" }, [["15", "15 min"], ["30", "30 min"], ["45", "45 min"], ["inf", "Jamais"]].map(function (o) {
        return h("button", { "aria-pressed": pickT === o[0] ? "true" : "false", onclick: function () { pickT = o[0]; drawSnd(); }, text: o[1] });
      }));
      sndBox.replaceChildren(
        h("div", { class: "row between" }, h("span", { class: "small muted", vars: { "font-weight": "700" }, text: "Pour l'endormir" }), h("button", { class: "linkbtn", onclick: function () { sheetSounds(); }, text: "Tous les sons" })),
        chips,
        pickS !== "none" ? h("div", { class: "field" }, h("span", { text: "S'arrête après" }), tseg) : "");
      go.textContent = pickS === "none" ? "Il s'endort maintenant" : "Il s'endort, lancer " + sndInfo(pickS).name.toLowerCase();
    }
    drawSnd();
    openSheet("Sommeil", h("div", { class: "stack" }, entryPicker(),
      place.el, sndBox,
      go,
      h("div", { class: "card stack" }, h("b", { text: "Ou noter après coup" }), past.el, pastBtn)));
  }
  /* ---------- Noter après coup : l'arc en demi-cercle ----------
     La journée se pose sous le pouce : début à gauche, maintenant à droite. Deux poignées (début, fin)
     ou une seule (couche). Fin collée à « maintenant » = encore en cours. Pas de 5 min. */
  var ARC_K = { sleep: { c: "#4A4190", bg: "#CFC8EC" }, cry: { c: "#B04A3A", bg: "#EBC9C0" }, "feed.breast": { c: "#A8661A", bg: "#EBD3B4" }, diaper: { c: "#2B7262", bg: "#BFDCD3" } };
  function arcDial(type, o) {
    var M = 60000, STEP = 5 * M, now = Math.floor(Date.now() / STEP) * STEP;
    var point = !!o.point, span = 8 * 60 * M, start = o.start, end = point ? null : o.end, drag = null, edgeT = null, lastH = null;
    var K = ARC_K[type] || ARC_K.sleep, cx = 180, cy = 206, R = 146;
    var same = S.events.filter(function (e) { return e.type === type && !e.deleted_at && (!o.skip || e.id !== o.skip); });
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "-18 0 396 248");
    var rt = h("div", { class: "t" }), rd = h("div", { class: "d", vars: { color: K.c } });
    var el = h("div", { class: "arc" }, svg, h("div", { class: "arc-read" }, rt, rd));
    function ws() { return now - span; }
    function ang(t) { return Math.PI * (1 - (t - ws()) / span); }
    function pt(a, r) { return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
    function arcP(t1, t2, r) { var a = pt(ang(t1), r), b = pt(ang(t2), r); return "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "A" + r + " " + r + " 0 0 1 " + b[0].toFixed(1) + " " + b[1].toFixed(1); }
    function busy() {
      if (point) return false;
      return same.some(function (e) { var a = new Date(e.started_at).getTime(), b = e.ended_at ? new Date(e.ended_at).getTime() : Date.now(); return start < b && end > a; });
    }
    function draw() {
      var live = !point && end >= now;
      var s = '<path d="' + arcP(ws(), now, R) + '" stroke="#EFE8DA" stroke-width="38" fill="none" stroke-linecap="round"/>';
      var hStep = span > 12 * 60 * M ? 3 : span > 8 * 60 * M ? 2 : 1;
      for (var t = Math.ceil(ws() / 3600000) * 3600000; t <= now; t += 3600000) {
        var a = ang(t), p1 = pt(a, R + 21), p2 = pt(a, R + 26), l = pt(a, R + 38), hr = new Date(t).getHours();
        s += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#C9C0AE" stroke-width="2" stroke-linecap="round"/>';
        if (hr % hStep === 0) s += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#5B655D">' + hr + ' h</text>';
      }
      same.forEach(function (e) {
        var a = new Date(e.started_at).getTime(), b = e.ended_at ? new Date(e.ended_at).getTime() : Date.now();
        if (b > ws() && !point) s += '<path d="' + arcP(Math.max(a, ws()), Math.min(b, now), R) + '" stroke="' + K.bg + '" stroke-width="38" fill="none"/>';
      });
      S.events.forEach(function (e) {
        var t2 = new Date(e.started_at).getTime(); if (t2 <= ws() || t2 > now || e.type === type) return;
        var p = pt(ang(t2), R - 30), c = CAT[e.type];
        if (c === "repas") s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + CAT_COLOR.repas + '"/>';
        else if (c === "couche") s += '<rect x="' + (p[0] - 4.5) + '" y="' + (p[1] - 4.5) + '" width="9" height="9" rx="2.5" fill="' + CAT_COLOR.couche + '"/>';
        else if (c === "sommeil") s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="none" stroke="' + CAT_COLOR.sommeil + '" stroke-width="2"/>';
      });
      if (!point) s += '<path d="' + arcP(start, end, R) + '" stroke="' + (busy() ? "#B0423A" : K.c) + '" stroke-width="38" fill="none" stroke-linecap="round"/>';
      var hs = point ? [["start", start]] : [["start", start], ["end", end]];
      hs.forEach(function (x) {
        var p = pt(ang(x[1]), R), on = drag === x[0], c = x[0] === "start" ? K.c : "#A8661A";
        var ic = type !== "sleep" ? '<circle r="5" fill="' + c + '"/>' : x[0] === "start" ? '<path d="M4 -6a7 7 0 1 0 6 10a6 6 0 0 1 -6 -10z" fill="' + c + '"/>'
          : '<path d="M0 -4a4 4 0 1 1 0 8a4 4 0 1 1 0 -8M0 -9v2M0 7v2M-9 0h2M7 0h2M-6.4 -6.4l1.4 1.4M5 5l1.4 1.4M-6.4 6.4l1.4 -1.4M5 -5l1.4 -1.4" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>';
        s += '<g transform="translate(' + p[0].toFixed(1) + " " + p[1].toFixed(1) + ')"><circle r="' + (on ? 25 : 22) + '" fill="#FFFDF8" stroke="' + c + '" stroke-width="3" style="filter:drop-shadow(0 3px 6px rgba(30,42,36,.25))"/>' + ic + "</g>";
      });
      s += '<text x="376" y="' + (cy + 38) + '" text-anchor="end" font-size="12" font-weight="700" fill="' + (live ? K.c : "#5B655D") + '">maintenant</text>';
      svg.innerHTML = s;
      if (point) { rt.textContent = hhmm(new Date(start)); rd.textContent = "il y a " + dur((now - start) / M); }
      else {
        rt.textContent = hhmm(new Date(start)) + " → " + (live ? "…" : hhmm(new Date(end)));
        rd.textContent = busy() ? "Chevauche une saisie déjà notée" : live ? "encore en cours, depuis " + dur((now - start) / M) : dur((end - start) / M);
      }
      svg.setAttribute("aria-label", rt.textContent);
      if (o.onChange) o.onChange(api.get());
    }
    function toTime(e) {
      var b = svg.getBoundingClientRect(), k = 396 / b.width, x = (e.clientX - b.left) * k - 18, y = (e.clientY - b.top) * k;
      var a = Math.atan2(cy - y, x - cx); if (a < 0) a = x < cx ? Math.PI : 0;
      return { t: Math.round((ws() + (1 - a / Math.PI) * span) / STEP) * STEP, a: a };
    }
    function stopEdge() { clearInterval(edgeT); edgeT = null; }
    function move(e) {
      if (!drag) return;
      var r = toTime(e);
      if (drag === "start") {
        start = Math.max(ws(), Math.min(r.t, point ? now : end - 10 * M));
        if (r.a > Math.PI - 0.07 && span < 24 * 60 * M) {
          if (!edgeT) edgeT = setInterval(function () { if (span < 24 * 60 * M) { span += 2 * 60 * M; start = ws(); draw(); } }, 550);
        } else stopEdge();
      } else { end = Math.min(now, Math.max(r.t, start + 10 * M)); if (now - end <= STEP) end = now; }
      var hh = Math.floor((drag === "start" ? start : end) / 3600000);
      if (hh !== lastH) { lastH = hh; if (navigator.vibrate) try { navigator.vibrate(6); } catch (x) { /* rien */ } }
      draw();
    }
    svg.addEventListener("pointerdown", function (e) {
      var r = toTime(e); drag = point || Math.abs(r.t - start) <= Math.abs(r.t - end) ? "start" : "end";
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
      move(e);
    });
    svg.addEventListener("pointermove", move);
    var up = function () { drag = null; stopEdge(); draw(); };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    // Le geste reste dans l'arc : ni fermeture de la feuille, ni défilement
    ["touchstart", "touchmove"].forEach(function (n) { svg.addEventListener(n, function (e) { e.stopPropagation(); }, { passive: true }); });
    // Position de départ libre : on recule avant ce qui est déjà noté
    for (var i = 0; i < 6 && busy(); i++) {
      var hit = same.map(function (e) { return new Date(e.started_at).getTime(); }).filter(function (a) { return a < end; }).sort(function (a, b) { return b - a; })[0];
      if (hit == null) break;
      var len = end - start; end = Math.floor(hit / STEP) * STEP - STEP; start = end - len;
      if (start < ws()) { start = ws(); if (end <= start + 10 * M) break; }
    }
    var api = { el: el, get: function () { return { start: new Date(start), end: point || end >= now ? null : new Date(end), live: !point && end >= now, busy: busy() }; } };
    draw();
    return api;
  }
  // Feuille « après coup » ouverte par un appui long sur une bulle du +
  var AFTER = {
    sommeil: { t: "Sommeil, après coup", type: "sleep", data: {} }, pleurs: { t: "Pleurs, après coup", type: "cry", data: {} },
    g: { t: "Sein gauche, après coup", type: "feed.breast", data: { side: "left" }, len: 15 }, d: { t: "Sein droit, après coup", type: "feed.breast", data: { side: "right" }, len: 15 },
    pipi: { t: "Pipi, après coup", type: "diaper", point: true, data: { pee: true, poo: false } },
    selles: { t: "Selles, après coup", type: "diaper", point: true, poo: false }, deux: { t: "Pipi et selles, après coup", type: "diaper", point: true, poo: true }
  };
  function sheetAfter(id) {
    var a = AFTER[id], M = 60000, now = Date.now();
    var save = h("button", { class: "btn primary full" });
    var dial = arcDial(a.type, { point: a.point, start: now - (a.point ? 40 : a.len ? 40 : 95) * M, end: now - (a.len ? 25 : 15) * M, onChange: function (v) {
      save.disabled = v.busy;
      save.textContent = a.point ? "Noter à " + hhmm(v.start) : v.live ? "Encore en cours, lancer le minuteur" : "Enregistrer, " + hhmm(v.start) + " à " + hhmm(v.end);
    } });
    save.onclick = function () {
      var v = dial.get(); if (v.busy) return;
      if (id === "selles" || id === "deux") { sheetPoo(a.poo, v.start); return; }
      if (a.point) logEvent(a.type, a.data, { started: v.start });
      else if (v.live) logEvent(a.type, a.data, { running: true, started: v.start });
      else logEvent(a.type, a.data, { started: v.start, ended: v.end });
    };
    dial.get(); save.textContent = save.textContent || "Enregistrer";
    openSheet(a.t, h("div", { class: "stack" }, entryPicker(), dial.el,
      h("p", { class: "small muted arc-hint", text: a.point ? "Glissez le point à l'heure du change." : "Glissez le début et la fin. Fin sur « maintenant » : encore en cours. Tenez le début au bord gauche pour remonter plus loin." }),
      save));
    var v0 = dial.get(); save.disabled = v0.busy;
    save.textContent = a.point ? "Noter à " + hhmm(v0.start) : v0.live ? "Encore en cours, lancer le minuteur" : "Enregistrer, " + hhmm(v0.start) + " à " + hhmm(v0.end);
  }
  function timeToday(v) { var p = v.split(":"), d = new Date(); d.setHours(+p[0], +p[1], 0, 0); if (d > new Date()) d = new Date(d.getTime() - 86400000); return d; }

  function sheetPlus() {
    openSheet("Plus", h("div", { class: "stack" }, entryPicker(),
      h("div", { class: "big3" },
        h("button", { class: "bigbtn pleurs", onclick: function () { logEvent("cry", {}, { running: true }); }, text: "Pleurs" }),
        h("button", { class: "bigbtn couche", onclick: function () { logEvent("bath", {}, {}); }, text: "Bain" }),
        h("button", { class: "bigbtn neutral", onclick: sheetNote, text: "Note" })),
      h("div", { class: "big3" },
        h("button", { class: "bigbtn sante", onclick: sheetTemp, text: "Température" }),
        h("button", { class: "bigbtn sante", onclick: sheetWeight, text: "Poids" }),
        h("button", { class: "bigbtn repas", onclick: sheetPump, text: "Tire-lait" }))));
  }
  function sheetNote() {
    var ta = h("textarea", { class: "input", maxlength: 500, placeholder: "Ce qui s'est passé, une question pour le pédiatre..." });
    openSheet("Note", h("div", { class: "stack" }, entryPicker(), ta, h("button", { class: "btn primary full", onclick: function () { if (ta.value.trim()) logEvent("note", { text: ta.value.trim() }); }, text: "Enregistrer la note" })));
  }
  async function saveMeasure(kind, value, method) {
    var row = { family_id: S.family.id, child_id: S.child.id, kind: kind, value: value, measured_at: new Date().toISOString() };
    if (method) row.method = method;
    var r = await health.from("measurements").insert(row);
    if (r.error) { toast(errMsg(r.error), { error: true }); return false; }
    if (kind === "weight_g") weights = null;
    closeSheet(); route(); return true;
  }
  function sheetTemp() {
    var inp = h("input", { class: "input", type: "number", inputmode: "decimal", step: "0.1", min: "34", max: "43", placeholder: "37,2" });
    var method = selectField("Prise", { rectal: "Rectale", axillary: "Sous le bras", ear: "Auriculaire", forehead: "Frontale" });
    openSheet("Température", h("div", { class: "stack" }, h("label", { class: "field" }, h("span", { text: "Température en °C" }), inp), method.el,
      h("button", { class: "btn primary full", onclick: async function () {
        var v = parseFloat(String(inp.value).replace(",", "."));
        if (!(v >= 30 && v <= 44)) { toast("Température invalide.", { error: true }); return; }
        if (await saveMeasure("temp_dc", Math.round(v * 10), method.value())) {
          var young = S.child.birth_date && (Date.now() - new Date(S.child.birth_date)) < 91 * 86400000;
          if (v >= 38 && young) toast("38 °C ou plus avant 3 mois : consultez un médecin rapidement. Urgence : 15 ou 112.", { error: true });
          else toast("Température notée : " + String(v).replace(".", ",") + NB + "°C");
        }
      }, text: "Enregistrer" })));
  }
  function sheetWeight() {
    var inp = h("input", { class: "input", type: "number", inputmode: "decimal", step: "0.01", min: "0.3", max: "40", placeholder: "3,42" });
    openSheet("Poids", h("div", { class: "stack" }, h("label", { class: "field" }, h("span", { text: "Poids en kg" }), inp),
      h("button", { class: "btn primary full", onclick: async function () {
        var v = parseFloat(String(inp.value).replace(",", "."));
        if (!(v >= 0.3 && v <= 40)) { toast("Poids invalide.", { error: true }); return; }
        if (await saveMeasure("weight_g", Math.round(v * 1000), "home")) toast("Poids noté : " + String(v).replace(".", ",") + NB + "kg");
      }, text: "Enregistrer" })));
  }

  /* ---------- Graphiques et frises (vides tant qu'il n'y a pas de données) ---------- */
  var DAY_MS = 86400000;
  var DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  function isFeed(e) { return e.type === "feed.breast" || e.type === "feed.bottle"; }
  function evEnd(e) { return e.ended_at ? new Date(e.ended_at).getTime() : Date.now(); }
  // Morceaux d'événements dans une journée donnée, en heures (0 à 24)
  function inDay(dayStart, pred) {
    var a0 = dayStart, b0 = dayStart + DAY_MS;
    return S.events.filter(pred).map(function (e) {
      var a = new Date(e.started_at).getTime(), b = Math.max(a, evEnd(e));
      if (b < a0 || a >= b0) return null;
      return { e: e, a: (Math.max(a, a0) - a0) / 3600000, b: (Math.min(b, b0) - a0) / 3600000, min: (Math.min(b, b0) - Math.max(a, a0)) / 60000 };
    }).filter(Boolean);
  }
  function startsIn(dayStart, pred) {
    return S.events.filter(function (e) { var t = new Date(e.started_at).getTime(); return pred(e) && t >= dayStart && t < dayStart + DAY_MS; });
  }
  function last7() { var t = startOfDay(new Date()).getTime(), out = []; for (var i = 6; i >= 0; i--) out.push(t - i * DAY_MS); return out; }
  function pct(x) { return (Math.max(0, Math.min(24, x)) / 24 * 100).toFixed(2) + "%"; }
  function hourAxis() { return h("div", { class: "axis" }, ["0 h", "6 h", "12 h", "18 h", "24 h"].map(function (t) { return h("span", { text: t }); })); }
  function legend(items) { return h("div", { class: "legend" }, items.map(function (it) { return h("span", null, h("i", { class: it[0] }), it[1]); })); }

  // Frise horizontale d'une journée : sommeils en blocs, repas en points, couches en carrés
  function dayStrip(dayStart, opts) {
    opts = opts || {};
    var track = h("div", { class: "strip" + (opts.compact ? " compact" : "") + (ENTER ? " draw" : ""), role: "img", "aria-label": opts.label || "Frise des 24 heures" }, h("div", { class: "bar" }));
    var n = 0, mark = function (e, cls) { var a = freshAge(e.id); return a != null ? { cls: cls + " pop", age: -a + "ms" } : { cls: cls, age: null }; };
    inDay(dayStart, function (e) { return e.type === "sleep"; }).forEach(function (s) {
      var m = mark(s.e, "seg-sleep" + (s.e.ended_at ? "" : " on"));
      track.append(h("div", { class: m.cls, vars: { left: pct(s.a), width: "max(3px, " + pct(s.b - s.a) + ")", "--i": n++, "--age": m.age } }));
    });
    startsIn(dayStart, isFeed).forEach(function (e) { var m = mark(e, "dot-feed"); track.append(h("div", { class: m.cls, vars: { left: pct((new Date(e.started_at) - dayStart) / 3600000), "--i": n++, "--age": m.age } })); });
    if (!opts.compact) startsIn(dayStart, function (e) { return e.type === "diaper"; }).forEach(function (e) { var m = mark(e, "dot-diaper"); track.append(h("div", { class: m.cls, vars: { left: pct((new Date(e.started_at) - dayStart) / 3600000), "--i": n++, "--age": m.age } })); });
    if (dayStart === startOfDay(new Date()).getTime()) track.append(h("div", { class: "now", vars: { left: pct((Date.now() - dayStart) / 3600000) } }));
    return track;
  }

  // Estimation de la prochaine sieste à partir des éveils observés (médiane), sans valeur externe
  function nextNap() {
    var sleeps = S.events.filter(function (e) { return e.type === "sleep" && e.ended_at; }).slice().sort(function (a, b) { return new Date(a.started_at) - new Date(b.started_at); });
    var gaps = [];
    for (var i = 1; i < sleeps.length; i++) {
      var g = (new Date(sleeps[i].started_at) - new Date(sleeps[i - 1].ended_at)) / 60000;
      if (g > 0 && g < 360) gaps.push(g);
    }
    if (gaps.length < 3 || !sleeps.length) return null;
    gaps = gaps.slice(-12).sort(function (a, b) { return a - b; });
    var med = gaps[Math.floor(gaps.length / 2)];
    var from = new Date(sleeps[sleeps.length - 1].ended_at);
    var at = new Date(from.getTime() + med * 60000);
    return { at: at, from: from, med: med, n: gaps.length };
  }
  function napCard(canWrite) {
    var n = nextNap();
    var p = n ? Math.max(0, Math.min(1, (Date.now() - n.from) / Math.max(1, n.at - n.from))) : 0;
    var due = n && Date.now() >= n.at.getTime() - 5 * 60000;
    var ring = document.createElementNS(SVGNS, "svg");
    ring.setAttribute("viewBox", "0 0 72 72"); ring.setAttribute("class", "nap-ring" + (ENTER ? " draw" : "")); ring.setAttribute("aria-hidden", "true");
    [["nap-track", 0], ["nap-prog", 1]].forEach(function (c) {
      var ci = document.createElementNS(SVGNS, "circle");
      ci.setAttribute("cx", "36"); ci.setAttribute("cy", "36"); ci.setAttribute("r", "32"); ci.setAttribute("pathLength", "100"); ci.setAttribute("class", c[0]);
      if (c[1]) ci.style.setProperty("--off", (100 - p * 100).toFixed(1));
      ring.appendChild(ci);
    });
    var moon = canWrite ? h("button", { class: "nap-btn", "aria-label": "Il s'endort maintenant", onclick: sheetSleep }, icon("moon", 24)) : h("span", { class: "nap-btn", "aria-hidden": "true" }, icon("moon", 24));
    return h("section", { class: "nap" + (due ? " due" : ""), "aria-label": "Prochaine sieste" },
      h("div", { class: "stack", vars: { gap: "4px" } },
        h("span", { class: "k", text: "Prochaine sieste estimée" }),
        h("span", { class: "v", text: n ? "vers " + hhmm(n.at) : "à venir" }),
        h("span", { class: "s", text: n ? "D'après ses " + n.n + " derniers éveils (" + dur(n.med) + " en général)" : "Estimée dès 3 sommeils notés, à partir de son propre rythme" })),
      h("div", { class: "nap-dial" }, ring, moon));
  }

  // Histogramme sur 7 jours avec bande de repère
  function barChart(o) {
    var max = o.max, chart = h("div", { class: "bars" + (ENTER ? " rise" : ""), role: "img", "aria-label": o.title });
    if (o.band) chart.append(h("div", { class: "band " + o.cls, vars: { bottom: (o.band[0] / max * 100) + "%", height: ((o.band[1] - o.band[0]) / max * 100) + "%" } }),
      h("span", { class: "band-l " + o.cls, vars: { bottom: (o.band[1] / max * 100) + "%" }, text: o.bandLabel }));
    o.values.forEach(function (v, i) {
      chart.append(h("div", { class: "col" }, h("div", { class: "fill " + o.cls + (o.low && v != null && v > 0 && v < o.band[0] ? " low" : ""), vars: { height: v ? Math.min(100, v / max * 100) + "%" : "0", "--i": i } })));
    });
    var days = o.days.map(function (d, i) { return h("span", { text: i === 6 ? "auj." : DAYS_SHORT[new Date(d).getDay()] }); });
    var has = o.values.some(function (v) { return v > 0; });
    return h("section", { class: "card chart" },
      h("div", { class: "row between" }, h("h2", { class: "title-m", text: o.title }), h("span", { class: "avg " + o.cls, text: has ? "moy. " + o.fmt(o.avg) : "aucune donnée" })),
      chart, h("div", { class: "bars-x" }, days), o.extra || null);
  }
  function mean(vals) { var v = vals.filter(function (x) { return x > 0; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : 0; }
  function dec(x) { return (Math.round(x * 10) / 10).toString().replace(".", ","); }

  /* ---------- Écran : tendances ---------- */
  var weights = null, trendsWait = false, trendsEnter = false, trendsPrev = null;
  async function loadWeights() {
    var r = await health.from("measurements").select("value, measured_at").eq("child_id", S.child.id).eq("kind", "weight_g").is("deleted_at", null).order("measured_at").limit(200);
    trendsWait = false;
    if (weights !== null) return;
    weights = r.error ? [] : (r.data || []);
    if (location.hash === "#/tendances") { ENTER = trendsEnter; trendsEnter = false; screenTrends(); if (ENTER) afterEnter("tendances", trendsPrev); ENTER = false; }
    else trendsEnter = false;
  }
  function screenTrends() {
    var canWrite = S.role === "parent" || S.role === "proche";
    if (!S.child) { screenHome(); return; }
    if (weights === null) {
      var first = !trendsWait;
      if (first) { trendsWait = true; loadWeights(); setTimeout(function () { if (weights === null && location.hash === "#/tendances") { weights = []; ENTER = trendsEnter; trendsEnter = false; screenTrends(); if (ENTER) afterEnter("tendances", trendsPrev); ENTER = false; } }, 1500); }
      if (ENTER && first && appEl.firstChild) { trendsEnter = true; return; }
    }
    var days = last7();
    var sleepH = days.map(function (d) { return inDay(d, function (e) { return e.type === "sleep"; }).reduce(function (s, x) { return s + x.min; }, 0) / 60; });
    var feeds = days.map(function (d) { return startsIn(d, isFeed).length; });
    var wet = days.map(function (d) { return startsIn(d, function (e) { return e.type === "diaper" && e.data && e.data.pee; }).length; });
    var breastMin = days.map(function (d) { return inDay(d, function (e) { return e.type === "feed.breast" && e.ended_at; }).reduce(function (s, x) { return s + x.min; }, 0); });
    var allFeeds = S.events.filter(isFeed).slice().sort(function (a, b) { return new Date(a.started_at) - new Date(b.started_at); });
    var gaps = []; for (var i = 1; i < allFeeds.length; i++) { var g = (new Date(allFeeds[i].started_at) - new Date(allFeeds[i - 1].started_at)) / 60000; if (g > 0 && g < 480) gaps.push(g); }
    var left = 0, right = 0;
    S.events.forEach(function (e) { if (e.type === "feed.breast" && e.ended_at) { var m = (new Date(e.ended_at) - new Date(e.started_at)) / 60000; if (e.data.side === "left") left += m; else if (e.data.side === "right") right += m; else { left += m / 2; right += m / 2; } } });
    var stat = function (v, l) { return h("div", null, h("b", { text: v }), h("span", { text: l })); };

    // Rythme
    var rhythm = h("section", { class: "card chart" },
      h("div", { class: "row between" }, h("h2", { class: "title-m", text: "Rythme" }), h("span", { class: "small muted", text: "7 derniers jours" })),
      h("div", { class: "rhythm" }, days.map(function (d, i) {
        return h("div", { class: "rrow" }, h("span", { class: "d", text: i === 6 ? "auj." : DAYS_SHORT[new Date(d).getDay()] }), dayStrip(d, { compact: true, label: dayLabel(d) }));
      })),
      h("div", { class: "rhythm-x" }, hourAxis()),
      legend([["l-sleep", "Sommeil"], ["l-feed", "Repas"]]));

    // Pleurs : carte de chaleur 7 x 24
    var cryMin = 0;
    var heat = h("div", { class: "heat" + (ENTER ? " rise" : ""), role: "img", "aria-label": "Pleurs par heure sur 7 jours" }, days.map(function (d, i) {
      var cells = []; for (var hh = 0; hh < 24; hh++) cells.push(0);
      inDay(d, function (e) { return e.type === "cry"; }).forEach(function (s) {
        cryMin += s.min;
        for (var hh2 = Math.floor(s.a); hh2 < Math.min(24, Math.ceil(s.b)); hh2++) cells[hh2] += Math.max(0, Math.min(s.b, hh2 + 1) - Math.max(s.a, hh2)) * 60;
      });
      return h("div", { class: "hrow", vars: { "--i": i } }, h("span", { class: "d", text: i === 6 ? "auj." : DAYS_SHORT[new Date(d).getDay()] }),
        h("div", { class: "cells" }, cells.map(function (m) { return h("span", { vars: m > 0 ? { background: "rgba(176,74,58," + (0.2 + Math.min(1, m / 30) * 0.75).toFixed(2) + ")" } : null }); })));
    }));
    var cryDays = days.filter(function (d) { return S.events.some(function (e) { var t = new Date(e.started_at).getTime(); return t >= d && t < d + DAY_MS; }); }).length;

    // Poids
    var wBody;
    var W = (weights || []).map(function (w) { return { t: new Date(w.measured_at).getTime(), kg: w.value / 1000 }; });
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 320 130"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("class", "wsvg"); svg.setAttribute("aria-hidden", "true");
    var base = document.createElementNS(SVGNS, "line");
    [["x1", 0], ["y1", 112], ["x2", 320], ["y2", 112], ["stroke", "#E4DCCB"], ["vector-effect", "non-scaling-stroke"]].forEach(function (p) { base.setAttribute(p[0], p[1]); });
    svg.appendChild(base);
    var wWrap = h("div", { class: "wchart" + (ENTER ? " rise" : ""), role: "img", "aria-label": W.length ? "Courbe de poids" : "Courbe de poids vide" }, svg);
    if (W.length) {
      var t0 = W[0].t, t1 = Math.max(W[W.length - 1].t, t0 + DAY_MS);
      var lo = Math.min.apply(null, W.map(function (w) { return w.kg; })), hi = Math.max.apply(null, W.map(function (w) { return w.kg; }));
      var pad2 = Math.max(0.1, (hi - lo) * 0.25); lo -= pad2; hi += pad2;
      var X = function (t) { return 16 + (t - t0) / (t1 - t0) * 288; }, Y = function (kg) { return 100 - (kg - lo) / (hi - lo) * 80; };
      var pl = document.createElementNS(SVGNS, "polyline");
      pl.setAttribute("points", W.map(function (w) { return X(w.t).toFixed(1) + "," + Y(w.kg).toFixed(1); }).join(" "));
      [["fill", "none"], ["stroke", "#2E5D94"], ["stroke-width", "2.5"], ["stroke-linejoin", "round"], ["vector-effect", "non-scaling-stroke"]].forEach(function (p) { pl.setAttribute(p[0], p[1]); });
      svg.appendChild(pl);
      W.forEach(function (w) { wWrap.append(h("span", { class: "wdot", vars: { left: (X(w.t) / 320 * 100) + "%", top: (Y(w.kg) / 130 * 100) + "%" } })); });
      wBody = h("span", { class: "avg sante", text: dec(W[W.length - 1].kg).replace(/(,\d)$/, "$1") + NB + "kg le " + new Date(W[W.length - 1].t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) });
    } else {
      wWrap.append(h("span", { class: "wempty", text: canWrite ? "Notez un poids avec Plus, puis Poids" : "Aucun poids noté" }));
      wBody = h("span", { class: "avg sante", text: "aucune donnée" });
    }

    mount(h("main", { class: "screen" },
      h("span", { class: "eyebrow", text: S.child.first_name + " · 7 derniers jours" }),
      h("h1", { class: "title-l", text: "Tendances" }),
      rhythm,
      barChart({ title: "Sommeil / 24 h", cls: "sommeil", days: days, values: sleepH, max: 20, band: [14, 17], bandLabel: "repère 14 à 17 h", avg: mean(sleepH), fmt: function (x) { return dur(x * 60); } }),
      barChart({ title: "Repas / 24 h", cls: "repas", days: days, values: feeds, max: 15, band: [8, 12], bandLabel: "repère 8 à 12", avg: mean(feeds), fmt: dec,
        extra: h("div", { class: "stats" },
          stat(mean(breastMin) ? dur(mean(breastMin)) : "-", "au sein / jour"),
          stat(gaps.length ? dur(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length) : "-", "écart moyen"),
          stat(left + right ? Math.round(left / (left + right) * 100) + " / " + Math.round(right / (left + right) * 100) : "-", "% gauche / droit")) }),
      barChart({ title: "Couches mouillées", cls: "couche", days: days, values: wet, max: 10, band: [6, 8], bandLabel: "repère 6 à 8", avg: mean(wet), fmt: dec, low: true }),
      h("section", { class: "card chart" },
        h("div", { class: "row between" }, h("h2", { class: "title-m", text: "Pleurs par heure" }), h("span", { class: "avg pleurs", text: cryMin ? Math.round(cryMin / Math.max(1, cryDays)) + NB + "min / jour" : "aucune donnée" })),
        heat, h("div", { class: "heat-x" }, hourAxis())),
      h("section", { class: "card chart" },
        h("div", { class: "row between" }, h("h2", { class: "title-m", text: "Poids" }), wBody), wWrap),
      h("p", { class: "small muted", text: "Repères indicatifs, à discuter avec la sage-femme ou le pédiatre. Sommeil : National Sleep Foundation (0 à 3 mois). Repas : AFPA, premier mois. Couches : Manuel MSD." })));
    appEl.append(dock("tendances", canWrite));
  }

  /* ---------- Rendez-vous ---------- */
  var KINDS = [["pediatre", "Pédiatre", "Péd."], ["sage_femme", "Sage-femme", "Sage-f."], ["vaccin", "Vaccin", "Vaccin"], ["pmi", "PMI", "PMI"], ["examen", "Examen", "Examen"], ["autre", "Autre", "Rdv"]];
  var KIND_LBL = {}, KIND_SHORT = {};
  KINDS.forEach(function (k) { KIND_LBL[k[0]] = k[1]; KIND_SHORT[k[0]] = k[2]; });
  var REMINDERS = [["veille", "La veille à 18:00"], ["1h", "1 h avant"], ["15min", "15 min avant"]];
  async function loadAppts() {
    if (!S.family) { S.appts = []; return; }
    var r = await health.from("appointments").select("*").eq("family_id", S.family.id).is("deleted_at", null)
      .gte("starts_at", new Date(Date.now() - 200 * DAY_MS).toISOString()).order("starts_at").limit(500);
    S.appts = r.error ? [] : (r.data || []);
  }
  function myAppts() { return (S.appts || []).filter(function (a) { return !a.child_id || !S.child || a.child_id === S.child.id; }); }
  function apptsIn(a0, b0) { return myAppts().filter(function (a) { var t = new Date(a.starts_at).getTime(); return t >= a0 && t < b0; }); }
  function apptEnd(a) { return a.ends_at ? new Date(a.ends_at) : new Date(new Date(a.starts_at).getTime() + 30 * 60000); }
  function childOf(a) { var c = S.children.find(function (x) { return x.id === a.child_id; }); return c ? c.first_name : ""; }
  function fmtDayLong(d) { return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); }
  function isoDate(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function atLocal(dateStr, timeStr) { var p = dateStr.split("-"), q = timeStr.split(":"); return new Date(+p[0], +p[1] - 1, +p[2], +q[0], +q[1], 0, 0); }
  function apptWhen(a) {
    var s = new Date(a.starts_at), t = startOfDay(s).getTime(), today = startOfDay(new Date()).getTime();
    var day = t === today ? "Aujourd'hui" : t === today + DAY_MS ? "Demain" : DAYS[s.getDay()] + " " + s.getDate() + " " + MONTHS[s.getMonth()];
    return day + " · " + hhmm(s) + (a.ends_at ? " à " + hhmm(a.ends_at) : "");
  }
  // Lien Google Agenda prérempli (aucune autorisation demandée)
  function gcalLink(a) {
    var f = function (d) { return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    var who = childOf(a);
    var p = new URLSearchParams({ action: "TEMPLATE", text: a.title + (who ? " · " + who : ""), dates: f(a.starts_at) + "/" + f(apptEnd(a)) });
    if (a.location) p.set("location", a.location);
    p.set("details", (a.notes ? a.notes + "\n\n" : "") + "Ajouté depuis Gloups");
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }
  function switchBtn(on, label, sub, onchange) {
    var b = h("button", { type: "button", class: "switch-row", role: "switch", "aria-checked": on ? "true" : "false" },
      h("span", { class: "grow" }, h("b", { text: label }), sub ? h("span", { class: "small muted", text: sub }) : null), h("span", { class: "switch", "aria-hidden": "true" }));
    b.addEventListener("click", function () { on = !on; b.setAttribute("aria-checked", on ? "true" : "false"); onchange(on); });
    return b;
  }
  function sheetAppt(a, preset) {
    var edit = !!(a && a.id);
    var kind = edit ? a.kind : "pediatre", touched = edit;
    var base = preset && preset.date != null ? new Date(preset.date) : new Date();
    var start = edit ? new Date(a.starts_at) : (function () {
      var d = new Date(base), now = new Date();
      if (startOfDay(d).getTime() === startOfDay(now).getTime()) { d = new Date(now.getTime() + 3600000); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); }
      else d.setHours(10, 0, 0, 0);
      return d;
    })();
    var end = edit ? apptEnd(a) : new Date(start.getTime() + 30 * 60000);
    var reminders = edit ? (a.reminders || []).slice() : ["veille", "1h"];
    var gcal = lsGet("gloups.gcal") === "1";
    var title = h("input", { class: "input", maxlength: 120, value: edit ? a.title : KIND_LBL[kind] });
    title.addEventListener("input", function () { touched = true; });
    var kinds = h("div", { class: "chips" });
    function drawKinds() {
      kinds.replaceChildren.apply(kinds, KINDS.map(function (k) {
        return h("button", { type: "button", class: "chip kind", "aria-pressed": kind === k[0] ? "true" : "false", onclick: function () { kind = k[0]; if (!touched) title.value = k[0] === "autre" ? "Rendez-vous" : k[1]; drawKinds(); }, text: k[1] });
      }));
    }
    drawKinds();
    var date = h("input", { class: "input", type: "date", value: isoDate(start) });
    var t1 = h("input", { class: "input", type: "time", value: hhmm(start) });
    var t2 = h("input", { class: "input", type: "time", value: hhmm(end) });
    var span = end - start;
    t1.addEventListener("change", function () { if (!t1.value) return; var s2 = atLocal(date.value || isoDate(start), t1.value); t2.value = hhmm(new Date(s2.getTime() + Math.max(15 * 60000, span))); });
    t2.addEventListener("change", function () { if (t1.value && t2.value) span = atLocal("2000-01-01", t2.value) - atLocal("2000-01-01", t1.value); });
    var loc = h("input", { class: "input", maxlength: 200, placeholder: "Cabinet, PMI, maternité...", value: edit && a.location ? a.location : "" });
    var notes = h("textarea", { class: "input", maxlength: 1000, placeholder: "Questions à poser, documents à apporter..." });
    if (edit && a.notes) notes.value = a.notes;
    var rem = h("div", { class: "chips" });
    function drawRem() {
      rem.replaceChildren.apply(rem, REMINDERS.map(function (r) {
        var on = reminders.indexOf(r[0]) >= 0;
        return h("button", { type: "button", class: "chip rem", "aria-pressed": on ? "true" : "false", onclick: function () { reminders = on ? reminders.filter(function (x) { return x !== r[0]; }) : reminders.concat([r[0]]); drawRem(); }, text: (on ? "✓ " : "") + r[1] });
      }));
    }
    drawRem();
    var saveBtn = h("button", { class: "btn primary full", text: edit ? "Enregistrer les modifications" : "Enregistrer le rendez-vous" });
    saveBtn.addEventListener("click", async function () {
      var t = title.value.trim();
      if (!t) { toast("Donnez un titre au rendez-vous.", { error: true }); return; }
      if (!date.value || !t1.value) { toast("Choisissez la date et l'heure.", { error: true }); return; }
      var s2 = atLocal(date.value, t1.value), e2 = t2.value ? atLocal(date.value, t2.value) : new Date(s2.getTime() + 30 * 60000);
      if (e2 <= s2) e2 = new Date(e2.getTime() + DAY_MS);
      var row = { title: t, kind: kind, starts_at: s2.toISOString(), ends_at: e2.toISOString(), location: loc.value.trim() || null, notes: notes.value.trim() || null, reminders: reminders };
      saveBtn.disabled = true;
      var r = edit
        ? await health.from("appointments").update(row).eq("id", a.id).select().single()
        : await health.from("appointments").insert(Object.assign({ family_id: S.family.id, child_id: S.child ? S.child.id : null }, row)).select().single();
      saveBtn.disabled = false;
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      S.appts = (S.appts || []).filter(function (x) { return x.id !== r.data.id; }).concat([r.data]).sort(function (x, y) { return new Date(x.starts_at) - new Date(y.starts_at); });
      lsSet("gloups.gcal", gcal ? "1" : null);
      closeSheet(); route();
      toast(edit ? "Rendez-vous modifié" : "Rendez-vous enregistré · " + apptWhen(r.data));
      if (gcal) setTimeout(function () { sheetApptDetail(r.data, { justSaved: true }); }, 280);
    });
    openSheet(edit ? "Modifier le rendez-vous" : "Nouveau rendez-vous", h("div", { class: "stack" },
      h("div", { class: "field" }, h("span", { text: "Type" }), kinds),
      h("label", { class: "field" }, h("span", { text: "Titre" }), title),
      h("div", { class: "dt3" },
        h("label", { class: "field" }, h("span", { text: "Date" }), date),
        h("label", { class: "field" }, h("span", { text: "Début" }), t1),
        h("label", { class: "field" }, h("span", { text: "Fin" }), t2)),
      h("label", { class: "field" }, h("span", { text: "Lieu (facultatif)" }), loc),
      h("label", { class: "field" }, h("span", { text: "Notes (facultatif)" }), notes),
      h("div", { class: "field" }, h("span", { text: "Rappels dans l'agenda abonné" }), rem),
      switchBtn(gcal, "Ajouter aussi à mon Google Agenda", "Propose l'ajout en un tap juste après l'enregistrement", function (v) { gcal = v; }),
      saveBtn));
  }
  function sheetApptDetail(a, opts) {
    opts = opts || {};
    var canWrite = S.role === "parent" || S.role === "proche";
    var who = childOf(a);
    openSheet(KIND_LBL[a.kind] || "Rendez-vous", h("div", { class: "stack" },
      h("div", { class: "appt-detail" },
        h("span", { class: "k", text: fmtDayLong(a.starts_at) }),
        h("b", { class: "t", text: hhmm(a.starts_at) + " à " + hhmm(apptEnd(a)) }),
        h("span", { class: "n", text: a.title + (who ? " · " + who : "") }),
        a.location ? h("span", { class: "small", text: a.location }) : null,
        a.notes ? h("p", { class: "small", text: a.notes }) : null),
      opts.justSaved ? h("p", { class: "small muted", text: "Enregistré dans Gloups. Ajoutez-le aussi à votre Google Agenda :" }) : null,
      h("a", { class: "btn primary full", href: gcalLink(a), target: "_blank", rel: "noopener" }, "Ajouter à Google Agenda"),
      canWrite ? h("div", { class: "big2" },
        h("button", { class: "btn", onclick: function () { sheetAppt(a); }, text: "Modifier" }),
        h("button", { class: "btn", vars: { color: "var(--alert)" }, onclick: function () { removeAppt(a); }, text: "Supprimer" })) : null,
      h("p", { class: "small muted", text: "Le bouton Google Agenda crée une copie : une modification faite ensuite dans Gloups n'y sera pas reportée. Pour un suivi automatique, utilisez l'abonnement (onglet Famille)." })));
  }
  async function removeAppt(a) {
    var r = await health.from("appointments").update({ deleted_at: new Date().toISOString() }).eq("id", a.id);
    if (r.error) { toast(errMsg(r.error), { error: true }); return; }
    S.appts = (S.appts || []).filter(function (x) { return x.id !== a.id; });
    closeSheet(); route();
    toast("Rendez-vous supprimé", { action: { label: "Rétablir", fn: async function () {
      var u = await health.from("appointments").update({ deleted_at: null }).eq("id", a.id).select().single();
      if (!u.error) { S.appts = S.appts.concat([u.data]).sort(function (x, y) { return new Date(x.starts_at) - new Date(y.starts_at); }); route(); }
    } } });
  }
  function apptRow(a) {
    return h("button", { class: "appt-row", onclick: function () { sheetApptDetail(a); } },
      h("span", { class: "when", text: hhmm(a.starts_at) }),
      h("span", { class: "what" }, h("b", { text: a.title }), h("span", { text: [KIND_LBL[a.kind], a.location].filter(Boolean).join(" · ") })));
  }

  /* ---------- Écran : journal (vues Jour, Semaine, Mois) ---------- */
  var J = { day: null, view: "jour", list: false, dir: 0 };
  (function () { var v = lsGet("gloups.jview"); if (v === "liste") J.list = true; else if (v === "semaine" || v === "mois") J.view = v; })();
  function addDays(t, n) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); }
  function weekStart(t) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7).getTime(); }
  function monthStart(t) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  function addMonths(t, n) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); }
  function journalSave() { lsSet("gloups.jview", J.view === "jour" ? (J.list ? "liste" : "jour") : J.view); }
  function journalShift(n) {
    var d = J.day;
    if (J.view === "jour") d = addDays(d, n);
    else if (J.view === "semaine") d = addDays(d, 7 * n);
    else { var m = addMonths(d, n), today = startOfDay(new Date()).getTime(); d = monthStart(today) === m ? today : m; }
    J.dir = n; J.day = d; screenJournal(); J.dir = 0;
  }
  function journalGo(d, view) { if (view) { J.view = view; journalSave(); } J.dir = d > J.day ? 1 : d < J.day ? -1 : 0; J.day = d; screenJournal(); J.dir = 0; }
  // Charge les saisies plus anciennes quand on remonte dans le temps
  var evLoading = false;
  async function ensureEvents(from) {
    if (!S.child || evLoading || (S.evFrom != null && S.evFrom <= from)) return;
    evLoading = true;
    var to = new Date(S.evFrom != null ? S.evFrom : Date.now()).toISOString();
    var r = await sb.from("events").select("*").eq("child_id", S.child.id).is("deleted_at", null)
      .gte("started_at", new Date(from).toISOString()).lt("started_at", to).order("started_at", { ascending: false }).limit(4000);
    evLoading = false;
    if (r.error) return;
    var ids = {}; S.events.forEach(function (e) { ids[e.id] = 1; });
    S.events = S.events.concat((r.data || []).filter(function (e) { return !ids[e.id]; })).sort(function (a, b) { return new Date(b.started_at) - new Date(a.started_at); });
    S.evFrom = from;
    if (location.hash === "#/journal") screenJournal();
  }
  function daySummary(d) {
    var evs = startsIn(d, function () { return true; });
    if (!evs.length) return "Aucune saisie ce jour";
    var feeds = evs.filter(isFeed).length, diapers = evs.filter(function (e) { return e.type === "diaper"; }).length;
    var sleepM = inDay(d, function (e) { return e.type === "sleep"; }).reduce(function (s, x) { return s + x.min; }, 0);
    return feeds + " repas · " + diapers + " couche" + (diapers > 1 ? "s" : "") + " · " + dur(sleepM) + " de sommeil";
  }

  function dayView(d0, isToday, canWrite) {
    var dayEvs = S.events.filter(function (e) { var t = new Date(e.started_at).getTime(); return t >= d0 && t < d0 + DAY_MS; });
    var appts = apptsIn(d0, d0 + DAY_MS);
    var mini = h("div", { class: "seg mini" }, [[false, "Frise"], [true, "Liste"]].map(function (o) {
      return h("button", { "aria-pressed": J.list === o[0] ? "true" : "false", onclick: function () { J.list = o[0]; journalSave(); screenJournal(); }, text: o[1] });
    }));
    var body;
    if (J.list) {
      var list = dayEvs.slice().sort(function (a, b) { return new Date(b.started_at) - new Date(a.started_at); });
      body = h("section", { class: "card" }, h("div", { class: "row between" }, h("b", { class: "title-m", text: dayLabel(d0) }), mini),
        appts.length ? h("div", { class: "list" }, appts.map(apptRow)) : null,
        h("div", { class: "list" }, list.length ? list.map(function (e) { return eventRow(e, canWrite); }) : h("span", { class: "empty", text: "Aucune saisie ce jour." })));
    } else {
      var PX = 28, grid = h("div", { class: "tl-body", vars: { height: (24 * PX) + "px" } });
      for (var i = 0; i <= 24; i++) grid.append(h("div", { class: "tl-hour" + (i % 3 === 0 ? " major" : ""), vars: { top: (i * PX) + "px" } }, h("span", { text: i % 2 === 0 && i < 24 ? pad(i) + ":00" : "" })));
      var block = function (col, a, b, cls, txt, minH) {
        var top = a * PX, hgt = Math.max(minH, (b - a) * PX - 2);
        return h("div", { class: "tl-ev tl-c" + col + " " + cls, vars: { top: top + "px", height: hgt + "px" } }, h("span", { text: txt }));
      };
      inDay(d0, function (e) { return e.type === "sleep"; }).forEach(function (x) {
        grid.append(block(0, x.a, x.b, "sommeil" + (x.e.ended_at ? "" : " on"), hhmm(x.e.started_at) + " · " + (x.e.ended_at ? dur(x.min) : "en cours"), 22));
      });
      inDay(d0, isFeed).forEach(function (x) {
        var d = x.e.data || {}, t = x.e.type === "feed.bottle" ? (d.ml != null ? d.ml + NB + "ml" : "Biberon") : ({ left: "G", right: "D", both: "G+D" }[d.side] || "Sein") + " " + (x.e.ended_at ? Math.round(x.min) + "'" : "...");
        grid.append(block(1, x.a, x.b, "repas", t, 20));
      });
      startsIn(d0, function (e) { return e.type === "diaper"; }).forEach(function (e) {
        var a = (new Date(e.started_at) - d0) / 3600000, d = e.data || {};
        grid.append(block(2, a, a, "couche" + (d.poo ? " poo" : ""), d.pee && d.poo ? "les deux" : d.poo ? "selles" : "pipi", 20));
      });
      inDay(d0, function (e) { return ["cry", "bath", "note", "feed.pump"].indexOf(e.type) >= 0; }).forEach(function (x) {
        var t = { cry: "Pleurs", bath: "Bain", note: "Note", "feed.pump": "Tire-lait" }[x.e.type];
        if (x.e.type === "cry" && x.e.ended_at && x.min >= 1) t += " " + Math.round(x.min) + "'";
        grid.append(block(3, x.a, x.b, x.e.type === "cry" ? "pleurs" : x.e.type === "note" ? "neutre" : "sante", t, 20));
      });
      appts.forEach(function (ap) {
        var a = (new Date(ap.starts_at) - d0) / 3600000, b = Math.min(24, (apptEnd(ap) - d0) / 3600000);
        grid.append(h("button", { class: "tl-appt", vars: { top: (a * PX) + "px", height: Math.max(26, (b - a) * PX - 2) + "px" }, onclick: function () { sheetApptDetail(ap); } },
          h("b", { text: hhmm(ap.starts_at) + " · " + ap.title }), ap.location ? h("span", { text: ap.location }) : null));
      });
      if (isToday) {
        var ny = (Date.now() - d0) / 3600000 * PX;
        grid.append(h("div", { class: "tl-now", vars: { top: ny + "px" } }, h("span", { text: hhmm(new Date()) })));
      }
      var empty = !grid.querySelector(".tl-ev, .tl-appt");
      body = h("section", { class: "card tl", "aria-label": "Frise de la journée" },
        h("div", { class: "row between" }, h("b", { class: "title-m", text: dayLabel(d0) }), mini),
        h("div", { class: "tl-head" }, h("span", { class: "sommeil", text: "Sommeil" }), h("span", { class: "repas", text: "Repas" }), h("span", { class: "couche", text: "Couches" }), h("span", { class: "pleurs", text: "Autres" })),
        empty ? h("span", { class: "empty", text: isToday ? "Rien de noté aujourd'hui. Chaque saisie apparaîtra ici à son heure." : "Aucune saisie ce jour." }) : null,
        grid);
    }
    var feedsN = dayEvs.filter(isFeed).length;
    var breast = inDay(d0, function (e) { return e.type === "feed.breast" && e.ended_at; }).reduce(function (s2, x) { return s2 + x.min; }, 0);
    var wetN = dayEvs.filter(function (e) { return e.type === "diaper" && e.data && e.data.pee; }).length;
    var pooN = dayEvs.filter(function (e) { return e.type === "diaper" && e.data && e.data.poo; }).length;
    var sleepM = inDay(d0, function (e) { return e.type === "sleep"; }).reduce(function (s2, x) { return s2 + x.min; }, 0);
    var cries = inDay(d0, function (e) { return e.type === "cry"; });
    var cryM = cries.reduce(function (s2, x) { return s2 + x.min; }, 0);
    var sum = function (v, n) { return h("div", null, h("b", { text: v }), h("span", { text: n })); };
    var summary = h("section", { class: "card green sum" },
      h("span", { class: "eyebrow", text: isToday ? "Depuis minuit" : dayLabel(d0) }),
      h("div", { class: "sum-grid" },
        sum(feedsN + " repas", breast ? dur(breast) + " au sein" : "aucune tétée chronométrée"),
        sum(wetN + " + " + pooN, "couches mouillées + selles"),
        sum(dur(sleepM), "de sommeil"),
        sum(cryM >= 1 ? dur(cryM) : "0 min", "de pleurs, " + cries.length + " épisode" + (cries.length > 1 ? "s" : ""))));
    return { body: body, extra: summary };
  }

  function weekView(w0) {
    var PXH = 20, days = [], today = startOfDay(new Date()).getTime();
    for (var i = 0; i < 7; i++) days.push(addDays(w0, i));
    var head = h("div", { class: "wk-head" }, h("span"), days.map(function (d) {
      var x = new Date(d);
      return h("button", { class: "wk-d" + (d === today ? " today" : ""), "aria-label": "Voir le " + fmtDayLong(d), onclick: function () { journalGo(d, "jour"); } },
        h("span", { text: DAYS_SHORT[x.getDay()] }), h("b", { text: x.getDate() }));
    }));
    var grid = h("div", { class: "wk-grid", vars: { height: (24 * PXH) + "px" } });
    for (var hh = 0; hh <= 24; hh += 3) grid.append(h("div", { class: "wk-hour", vars: { top: (hh * PXH) + "px" } }, h("span", { text: hh < 24 ? hh + NB + "h" : "" })));
    days.forEach(function (d, i) {
      var col = h("div", { class: "wk-col" + (d === today ? " today" : ""), vars: { left: "calc(30px + (100% - 30px) * " + i + " / 7)", width: "calc((100% - 30px) / 7)" } });
      inDay(d, function (e) { return e.type === "sleep"; }).forEach(function (x) { col.append(h("div", { class: "wk-sleep" + (x.e.ended_at ? "" : " on"), vars: { top: (x.a * PXH) + "px", height: Math.max(2, (x.b - x.a) * PXH) + "px" } })); });
      startsIn(d, isFeed).forEach(function (e) { col.append(h("div", { class: "wk-feed", vars: { top: ((new Date(e.started_at) - d) / 3600000 * PXH) + "px" } })); });
      startsIn(d, function (e) { return e.type === "diaper"; }).forEach(function (e) { col.append(h("div", { class: "wk-diaper", vars: { top: ((new Date(e.started_at) - d) / 3600000 * PXH) + "px" } })); });
      apptsIn(d, addDays(d, 1)).forEach(function (ap) {
        var a = (new Date(ap.starts_at) - d) / 3600000, b = Math.min(24, (apptEnd(ap) - d) / 3600000);
        col.append(h("button", { class: "wk-appt", vars: { top: (a * PXH) + "px", height: Math.max(26, (b - a) * PXH) + "px" }, "aria-label": ap.title + ", " + hhmm(ap.starts_at), onclick: function () { sheetApptDetail(ap); } },
          h("b", { text: hhmm(ap.starts_at) }), h("span", { text: KIND_SHORT[ap.kind] || "Rdv" })));
      });
      if (d === today) col.append(h("div", { class: "wk-now", vars: { top: ((Date.now() - d) / 3600000 * PXH) + "px" } }));
      grid.append(col);
    });
    return h("section", { class: "card wk", "aria-label": "Semaine" }, head, grid,
      legend([["l-sleep", "Sommeil"], ["l-feed", "Repas"], ["l-diaper", "Couche"], ["l-appt", "Rendez-vous"]]));
  }

  function monthView(m0) {
    var start = weekStart(m0), mEnd = addMonths(m0, 1), today = startOfDay(new Date()).getTime();
    var marks = {};
    S.events.forEach(function (e) {
      var k = startOfDay(new Date(e.started_at)).getTime();
      if (k < start || k >= addDays(mEnd, 7)) return;
      var m = marks[k] || (marks[k] = {});
      if (e.type === "sleep") m.s = 1; else if (isFeed(e)) m.f = 1; else if (e.type === "diaper") m.c = 1;
    });
    var cells = [];
    for (var d = start, n = 0; d < mEnd || n % 7 !== 0; d = addDays(d, 1), n++) {
      (function (d) {
        var x = new Date(d), m = marks[d] || {}, ap = apptsIn(d, addDays(d, 1));
        var dots = h("span", { class: "mo-dots" }, m.s ? h("i", { class: "s" }) : null, m.f ? h("i", { class: "f" }) : null, m.c ? h("i", { class: "c" }) : null);
        cells.push(h("button", { class: "mo-c" + (d < m0 || d >= mEnd ? " out" : "") + (d === today ? " today" : "") + (d === J.day ? " sel" : ""), "aria-label": fmtDayLong(d) + (ap.length ? ", " + ap.length + " rendez-vous" : ""), onclick: function () { J.day = d; screenJournal(); } },
          h("b", { text: x.getDate() }), dots,
          ap.slice(0, 2).map(function (a) { return h("span", { class: "mo-appt", text: KIND_SHORT[a.kind] || "Rdv" }); }),
          ap.length > 2 ? h("span", { class: "mo-more", text: "+" + (ap.length - 2) }) : null));
      })(d);
    }
    var sel = J.day, selAppts = apptsIn(sel, addDays(sel, 1));
    return {
      body: h("section", { class: "card mo", "aria-label": "Mois" },
        h("div", { class: "mo-head" }, ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(function (t) { return h("span", { text: t }); })),
        h("div", { class: "mo-grid" }, cells)),
      extra: h("section", { class: "card" },
        h("div", { class: "row between" }, h("b", { class: "title-m", text: fmtDayLong(sel).replace(/^./, function (c) { return c.toUpperCase(); }) }),
          h("button", { class: "btn ghost small", onclick: function () { journalGo(sel, "jour"); }, text: "Voir le jour" })),
        selAppts.length ? h("div", { class: "list" }, selAppts.map(apptRow)) : null,
        h("span", { class: "small muted", text: daySummary(sel) }))
    };
  }

  function screenJournal() {
    var canWrite = S.role === "parent" || S.role === "proche";
    var today = startOfDay(new Date()).getTime();
    if (J.day == null) J.day = today;
    var d0 = J.day, isToday = d0 === today, dayDir = J.dir;
    var label, rangeStart, isNow;
    if (J.view === "semaine") {
      var w0 = weekStart(d0), w1 = addDays(w0, 6), a0 = new Date(w0), a1 = new Date(w1);
      label = a0.getMonth() === a1.getMonth() ? a0.getDate() + " au " + a1.getDate() + " " + a1.toLocaleDateString("fr-FR", { month: "long" }) : a0.getDate() + " " + MONTHS[a0.getMonth()] + " au " + a1.getDate() + " " + MONTHS[a1.getMonth()];
      rangeStart = w0; isNow = today >= w0 && today <= w1;
    } else if (J.view === "mois") {
      var m0 = monthStart(d0);
      label = new Date(m0).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^./, function (c) { return c.toUpperCase(); });
      rangeStart = weekStart(m0); isNow = monthStart(today) === m0;
    } else {
      label = fmtDayLong(d0); rangeStart = d0; isNow = isToday;
    }
    if (S.evFrom != null && rangeStart < S.evFrom && rangeStart <= today) ensureEvents(rangeStart);

    var seg = h("div", { class: "seg" }, [["jour", "Jour"], ["semaine", "Semaine"], ["mois", "Mois"]].map(function (o) {
      return h("button", { "aria-pressed": J.view === o[0] ? "true" : "false", onclick: function () { if (J.view === o[0]) return; J.view = o[0]; journalSave(); screenJournal(); }, text: o[1] });
    }));
    var nav = h("div", { class: "jnav" },
      h("button", { class: "icon-btn", "aria-label": "Période précédente", onclick: function () { journalShift(-1); } }, icon("back", 20)),
      h("div", { class: "jnav-l" }, h("b", { text: label }), !isNow ? h("button", { class: "chip", onclick: function () { journalGo(today); }, text: "Aujourd'hui" }) : null),
      h("button", { class: "icon-btn flip", "aria-label": "Période suivante", onclick: function () { journalShift(1); } }, icon("back", 20)));

    var view = J.view === "semaine" ? { body: weekView(weekStart(d0)), extra: null } : J.view === "mois" ? monthView(monthStart(d0)) : dayView(d0, isToday, canWrite);
    var body = view.body;
    body.classList.add("jbody");
    if (dayDir) body.classList.add(dayDir > 0 ? "enter-r" : "enter-l");

    mount(h("main", { class: "screen" },
      h("div", { class: "row between", vars: { "align-items": "flex-end" } },
        h("div", { class: "stack", vars: { gap: "2px" } }, h("span", { class: "eyebrow", text: S.child ? S.child.first_name + (ageLabel(S.child) ? " · " + ageLabel(S.child) : "") : "" }), h("h1", { class: "title-l", text: "Journal" })),
        canWrite && S.family ? h("button", { class: "btn primary small add-rdv", onclick: function () { sheetAppt(null, { date: J.view === "jour" || J.view === "mois" ? d0 : Date.now() }); } }, icon("plus", 18), "Rendez-vous") : null),
      seg, nav, body, view.extra));
    appEl.append(dock("journal", canWrite));
    // Aujourd'hui : la frise défile jusqu'à l'heure actuelle
    if (J.view === "jour" && isToday && !J.list && (ENTER || dayDir)) {
      setTimeout(function () {
        var now = appEl.querySelector(".tl-now"); if (!now) return;
        var y = now.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45;
        if (y > 0) window.scrollTo({ top: y, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }, dayDir ? 120 : 420);
    }
  }

  /* ---------- Famille : abonnement agenda ---------- */
  function agendaSection() {
    var isParent = S.role === "parent";
    var box = h("div", { class: "stack" }), feed = null, opts = { summary: false, events: false };
    var feedUrl = function (tok) { return CFG.supabaseUrl + "/functions/v1/ical/" + tok + ".ics"; };
    var confirmBtn = function (txt, confirmTxt, fn) {
      var armed = false, b = h("button", { class: "btn ghost full danger", text: txt });
      b.addEventListener("click", function () {
        if (!armed) { armed = true; b.textContent = confirmTxt; setTimeout(function () { armed = false; b.textContent = txt; }, 4000); return; }
        fn();
      });
      return b;
    };
    async function create() {
      var r = await sb.rpc("api_v1_create_calendar_feed", { p_family: S.family.id });
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      lsSet("gloups.feed." + S.family.id, r.data);
      feed = { created_at: new Date().toISOString(), revoked_at: null, options: feed && feed.options };
      draw();
    }
    async function revoke() {
      var r = await sb.rpc("api_v1_revoke_calendar_feed", { p_family: S.family.id });
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      lsSet("gloups.feed." + S.family.id, null);
      if (feed) feed.revoked_at = new Date().toISOString();
      toast("Lien coupé : les agendas abonnés ne reçoivent plus rien.");
      draw();
    }
    async function setOpt(k, v) {
      opts[k] = v;
      var r = await sb.rpc("api_v1_set_calendar_feed_options", { p_family: S.family.id, p_summary: opts.summary, p_events: opts.events });
      if (r.error) toast(errMsg(r.error), { error: true });
    }
    function draw() {
      var name = S.child ? S.child.first_name : "votre enfant";
      if (!isParent) {
        box.replaceChildren(h("p", { class: "small", text: "Un parent peut abonner l'agenda de la famille. Chaque rendez-vous a aussi un bouton « Ajouter à Google Agenda »." }));
        return;
      }
      var active = feed && !feed.revoked_at, tok = lsGet("gloups.feed." + S.family.id);
      if (feed && feed.options) { opts.summary = !!feed.options.summary; opts.events = !!feed.options.events; }
      if (!active) {
        box.replaceChildren(
          h("p", { class: "small", text: "Un lien privé à ajouter une seule fois dans Google Agenda ou l'agenda de l'iPhone. Chaque rendez-vous créé, déplacé ou annulé dans Gloups suit tout seul." }),
          h("button", { class: "btn primary full", onclick: create, text: "Créer le lien d'abonnement" }));
        return;
      }
      var parts = [];
      if (tok) {
        var https = feedUrl(tok), webcal = https.replace(/^https:/, "webcal:");
        parts.push(
          h("a", { class: "btn primary full", href: "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(webcal), target: "_blank", rel: "noopener" }, "Ajouter à Google Agenda"),
          h("div", { class: "big2" },
            h("a", { class: "btn", href: webcal }, "Agenda iPhone"),
            h("button", { class: "btn", onclick: function () { navigator.clipboard.writeText(https).then(function () { toast("Lien copié. Gardez-le privé."); }); }, text: "Copier le lien" })),
          h("p", { class: "small muted", text: "Google Agenda : ouvrez ce bouton de préférence sur un ordinateur, l'app mobile Google Agenda ne sait pas s'abonner. L'agenda apparaît ensuite sur le téléphone." }));
      } else {
        parts.push(h("p", { class: "small", text: "Abonnement actif depuis le " + new Date(feed.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) + ". Le lien complet ne s'affiche que sur l'appareil qui l'a créé." }),
          confirmBtn("Créer un nouveau lien ici", "Confirmer : l'ancien lien cessera de fonctionner", create));
      }
      parts.push(
        h("span", { class: "eyebrow", text: "Ce qui apparaît dans votre agenda" }),
        h("div", { class: "switch-row static" }, h("span", { class: "grow" }, h("b", { text: "Rendez-vous" }), h("span", { class: "small muted", text: "pédiatre, sage-femme, vaccins, PMI, examens" })), h("span", { class: "small", text: "Toujours" })),
        switchBtn(opts.summary, "Résumé de la journée", "un événement par jour : repas, couches, sommeil", function (v) { setOpt("summary", v); }),
        switchBtn(opts.events, "Toutes les saisies", "chaque tétée, couche et sieste (très chargé)", function (v) { setOpt("events", v); }),
        h("div", { class: "card soft small", text: "Google Agenda relit ce lien à son rythme : un changement peut mettre plusieurs heures à apparaître, parfois jusqu'à une journée, sans moyen de forcer la mise à jour. L'agenda de l'iPhone suit son propre réglage de rafraîchissement." }),
        confirmBtn("Couper le lien", "Confirmer : couper le lien pour tous les agendas", revoke));
      box.replaceChildren.apply(box, parts);
    }
    if (isParent) {
      sb.from("calendar_feeds").select("created_at, revoked_at, options").eq("family_id", S.family.id).maybeSingle().then(function (r) { feed = r.data || null; draw(); });
      box.append(h("span", { class: "small muted", text: "Chargement..." }));
    } else draw();
    return h("section", { class: "card" }, h("b", { class: "title-m", text: "Agenda et Google Agenda" }),
      h("p", { class: "small muted", text: "Retrouvez les rendez-vous dans votre agenda habituel, sans rien ressaisir." }), box);
  }

  /* ---------- Écran : famille ---------- */
  function screenFamily() {
    var isParent = S.role === "parent";
    var roleLbl = { parent: "Parent", proche: "Proche", lecture: "Lecture" };
    var invite = h("div", { class: "stack" });
    var invRole = "proche";
    function drawInvite() {
      invite.replaceChildren(
        h("div", { class: "seg" }, ["parent", "proche", "lecture"].map(function (r) { return h("button", { "aria-pressed": invRole === r ? "true" : "false", onclick: function () { invRole = r; drawInvite(); }, text: roleLbl[r] }); })),
        h("p", { class: "small", text: { parent: "Parent : voit et saisit tout, gère la famille et les invitations.", proche: "Proche : voit et saisit repas, sommeils, couches et soins. Idéal pour grands-parents et nounou.", lecture: "Lecture : consulte seulement." }[invRole] }),
        h("button", { class: "btn light full", onclick: createInvite, text: "Créer une invitation" }));
    }
    async function createInvite() {
      var r = await sb.rpc("api_v1_create_invitation", { p_family: S.family.id, p_role: invRole });
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      var code = r.data, link = location.origin + location.pathname + "?invite=" + encodeURIComponent(code);
      var msg = "Rejoins la famille " + S.family.name + " sur Gloups : " + link + " (code " + code + ", valable 7 jours)";
      invite.replaceChildren(
        h("span", { class: "small", text: "Code d'invitation, valable 7 jours, une personne" }),
        h("span", { class: "codebox", text: code }),
        h("div", { class: "big2" },
          navigator.share ? h("button", { class: "btn light", onclick: function () { navigator.share({ title: "Gloups", text: msg }).catch(function () {}); } }, icon("share", 18), "Partager") : null,
          h("button", { class: "btn light", onclick: function () { navigator.clipboard.writeText(msg).then(function () { toast("Message copié"); }); }, text: "Copier le message" })),
        h("button", { class: "btn ghost", vars: { color: "var(--green-ink)" }, onclick: drawInvite, text: "Nouvelle invitation" }));
    }
    drawInvite();
    mount(h("main", { class: "screen" },
      h("span", { class: "eyebrow", text: "Famille" }),
      h("h1", { class: "title-l", text: S.family.name }),
      S.memberships.length > 1 ? h("div", { class: "card" }, h("b", { text: "Mes familles" }), S.memberships.map(function (m) {
        return h("button", { class: "btn full" + (m.family_id === S.family.id ? " primary" : ""), onclick: async function () { lsSet("gloups.family", m.family_id); lsSet("gloups.child", null); await boot(true); }, text: m.families.name });
      })) : null,
      h("section", { class: "card" }, h("b", { class: "title-m", text: "Enfants" }),
        S.children.map(function (c) { return h("div", { class: "member" }, h("span", { class: "avatar", vars: { background: c.color }, text: initials(c.first_name) }), h("span", { class: "grow" }, h("b", { text: c.first_name }), h("br"), h("span", { class: "small muted", text: ageLabel(c) }))); }),
        isParent && S.children.length > 1 ? switchBtn(twinMode(), S.children.length === 2 ? "Mode jumeaux" : "Mode multiples", "Choisir à chaque saisie : un enfant ou " + allLabel().toLowerCase() + " d'un coup", async function (v) {
          var st = Object.assign({}, S.family.settings || {}, { twins: v });
          var u = await sb.from("families").update({ settings: st }).eq("id", S.family.id);
          if (u.error) { toast(errMsg(u.error), { error: true }); return; }
          S.family.settings = st; track("action", v ? "jumeaux_on" : "jumeaux_off");
        }) : null,
        isParent ? h("button", { class: "btn full", onclick: function () { openSheet("Ajouter un enfant", familyForm(addChild, { childOnly: true })); }, text: "Ajouter un enfant" }) : null),
      h("section", { class: "card" }, h("b", { class: "title-m", text: "Membres" }),
        S.members.map(function (m) { var me = m.user_id === S.user.id; return h("div", { class: "member" }, memberAvatar(m), h("span", { class: "grow" }, h("span", { text: S.profiles[m.user_id] + (me ? " (vous)" : "") }), h("br"), h("span", { class: "small muted mstate", "data-uid": m.user_id, text: me ? "cet appareil" : S.online[m.user_id] ? "dans l'app" : "" })), h("span", { class: "role", text: roleLbl[m.role] })); }),
        S.members.length < 2 ? h("span", { class: "small muted", text: "Vous êtes seul pour l'instant. Invitez l'autre parent ci-dessous : son avatar apparaîtra en haut de l'écran Aujourd'hui, avec un point vert quand il a Gloups ouvert." }) : null),
      isParent ? h("section", { class: "card green" }, h("b", { class: "title-m", text: "Inviter quelqu'un" }), invite) : null,
      agendaSection(),
      S.isAdmin ? h("a", { href: "#/admin", class: "card", vars: { "text-decoration": "none", color: "inherit" } }, h("b", { class: "title-m", text: "Tableau de bord" }), h("span", { class: "small muted", text: "Chiffres globaux de Gloups, sans accès aux données des familles." })) : null,
      h("section", { class: "card" }, h("b", { class: "title-m", text: "Cet appareil" }),
        h("a", { href: "#/installer", class: "btn full", text: isStandalone() ? "App installée ✓" : "Installer sur l'écran d'accueil" }),
        h("button", { class: "btn full", onclick: function () { location.hash = "#/"; setTimeout(function () { startTour(true); }, 700); }, text: "Revoir la visite guidée" }),
        h("button", { class: "btn full", onclick: signOut, text: "Se déconnecter" }),
        h("span", { class: "small muted", text: "Gloups " + CFG.version + " · données hébergées dans l'UE" }))));
    appEl.append(dock("famille", S.role !== "lecture"));
  }
  async function addChild(vals) {
    var r = await sb.from("children").insert({ family_id: S.family.id, first_name: vals.child, birth_date: vals.born ? vals.date : null, due_date: vals.born ? null : vals.date, color: vals.color }).select().single();
    if (r.error) { toast(errMsg(r.error), { error: true }); return; }
    closeSheet(); lsSet("gloups.child", r.data.id); await boot(true);
  }

  /* ---------- Écran : installation ---------- */
  function detectBrowser() {
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return /CriOS/.test(ua) ? "chrome" : /FxiOS|EdgiOS/.test(ua) ? "other" : "safari";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  }
  // Ouverture de l'app : sert uniquement au comptage global (une fois par ouverture, au plus toutes les 30 min)
  var lastPing = 0;
  function ping() {
    lastPing = Date.now();
    var ua = navigator.userAgent, plat = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Android/.test(ua) ? "android" : "ordinateur";
    sb.rpc("api_v1_ping", { p_platform: plat, p_standalone: isStandalone(), p_version: (window.GLOUPS_CONFIG && GLOUPS_CONFIG.version) || "" }).then(function () {}, function () {});
  }
  // Compteurs d'usage anonymes (écrans vus, boutons utilisés) : aucun identifiant, aucun contenu
  var USE = {};
  function track(kind, name) { var k = kind + ":" + name; USE[k] = (USE[k] || 0) + 1; }
  function flushUsage() {
    var keys = Object.keys(USE); if (!keys.length || !S.user) return;
    var batch = USE; USE = {};
    sb.rpc("api_v1_track", { p_counts: batch }).then(function (r) { if (r.error) Object.keys(batch).forEach(function (k) { USE[k] = (USE[k] || 0) + batch[k]; }); }, function () {});
  }
  setInterval(flushUsage, 60000);

  /* ---------- Écran : tableau de bord administrateur (chiffres agrégés) ---------- */
  var ADM = { data: null, at: 0, loading: false, err: null };
  var TYPE_NAME = { "feed.breast": "Tétées", "feed.bottle": "Biberons", "feed.pump": "Tire-lait", sleep: "Sommeils", diaper: "Couches", cry: "Pleurs", bath: "Bains", note: "Notes" };
  async function loadAdmin() {
    ADM.loading = true; ADM.err = null;
    var r = await sb.rpc("api_admin_stats");
    ADM.loading = false;
    if (r.error) ADM.err = errMsg(r.error); else { ADM.data = r.data; ADM.at = Date.now(); }
    if (location.hash === "#/admin") screenAdmin();
  }
  function screenAdmin() {
    if (!ADM.data && !ADM.loading && !ADM.err || Date.now() - ADM.at > 60000 && !ADM.loading) loadAdmin();
    var d = ADM.data, n = function (x) { return (x || 0).toLocaleString("fr-FR"); };
    var kpi = function (v, l, sub) { return h("div", { class: "kpi" }, h("b", { text: v }), h("span", { text: l }), sub ? h("span", { class: "sub", text: sub }) : null); };
    var body;
    if (!d) body = h("section", { class: "card" }, h("span", { class: "muted", text: ADM.err || "Chargement…" }));
    else {
      var roles = d.members_by_role || {}, daily = d.daily || [];
      var spark = function (key, color, title) {
        var max = Math.max(1, Math.max.apply(null, daily.map(function (x) { return x[key]; })));
        return h("section", { class: "card" },
          h("div", { class: "row between" }, h("b", { text: title }), h("span", { class: "small muted", text: "30 jours" })),
          h("div", { class: "spark", role: "img", "aria-label": title + " sur 30 jours" }, daily.map(function (x) {
            return h("span", { title: x.day + " : " + x[key], vars: { height: Math.max(2, x[key] / max * 100) + "%", background: x[key] ? color : "var(--line)" } });
          })),
          h("div", { class: "row between small muted" }, h("span", { text: "il y a 30 j" }), h("span", { text: "max " + max }), h("span", { text: "auj." })));
      };
      var hbars = function (obj, names, color) {
        var ks = Object.keys(obj || {}).sort(function (x, y) { return obj[y] - obj[x]; });
        if (!ks.length) return h("span", { class: "small muted", text: "Pas encore de données." });
        var mx = obj[ks[0]] || 1;
        return ks.map(function (k) {
          return h("div", { class: "hbar" }, h("span", { class: "l", text: (names && names[k]) || k.replace(/_/g, " ") }),
            h("span", { class: "t" }, h("span", { vars: { width: (obj[k] / mx * 100) + "%", background: typeof color === "function" ? color(k) : color } })), h("b", { text: n(obj[k]) }));
        });
      };
      var card = function (title, sub) { return h("section", { class: "card" }, h("div", { class: "row between" }, h("b", { text: title }), sub ? h("span", { class: "small muted", text: sub }) : null), Array.prototype.slice.call(arguments, 2)); };
      var pc = d.per_child_day_7d || {}, ret = d.retention_7d || {}, ev = d.events || {}, use = d.usage_30d || {}, inv = d.invitations_30d || {}, hl = d.health_30d || {};
      var AGE = { a_naitre: "à naître", m0_1: "0-1 mois", m1_3: "1-3 mois", m3_6: "3-6 mois", m6_12: "6-12 mois", plus_1an: "1 an et +" };
      var SCREEN = { accueil: "Aujourd'hui", journal_jour: "Journal jour", journal_semaine: "Journal semaine", journal_mois: "Journal mois", tendances: "Tendances", famille: "Famille", installer: "Installation", admin: "Tableau de bord" };
      var FAB = { repas: "Repas", sommeil: "Sommeil", couche: "Couche", pleurs: "Pleurs", plus: "Plus", g: "Sein gauche", d: "Sein droit", biberon: "Biberon", tirelait: "Tire-lait", pipi: "Pipi", selles: "Selles", deux: "Pipi + selles", bain: "Bain", temp: "Température", poids: "Poids", note: "Note" };
      var fbc = {}; Object.keys(d.families_by_children || {}).forEach(function (k) { fbc[k] = d.families_by_children[k]; });
      body = [
        card("Inscrits", null, h("div", { class: "kpis" },
            kpi(n(d.families), d.families > 1 ? "familles" : "famille", n(d.families_multi_parent) + " à deux parents"),
            kpi(n(d.children), d.children > 1 ? "enfants" : "enfant", n(d.children_unborn) + " à naître"),
            kpi(n(d.users), d.users > 1 ? "comptes" : "compte", n(roles.parent) + " parents, " + n((roles.proche || 0) + (roles.lecture || 0)) + " proches"))),
        card("Utilisation", null, h("div", { class: "kpis" },
            kpi(n(d.active.d1), "actifs auj.", n(d.opens.d1) + " ouvertures"),
            kpi(n(d.active.d7), "actifs 7 j", n(d.opens.d7) + " ouvertures"),
            kpi(n(d.active.d30), "actifs 30 j", n(d.opens.d30) + " ouvertures")),
          h("div", { class: "kpis" },
            kpi(ret.prev ? Math.round(ret.kept / ret.prev * 100) + " %" : "-", "reviennent", "d'une semaine à l'autre"),
            kpi(n(d.installed), "installées", "sur l'écran d'accueil"),
            kpi(n(ev.d1), "saisies auj.", n(ev.d7) + " sur 7 j"))),
        spark("active", "#1F4A3A", "Personnes actives par jour"),
        spark("opens", "#2B6A8A", "Ouvertures de l'app par jour"),
        spark("events", "#A8661A", "Saisies par jour"),
        spark("new_users", "#5A50A0", "Nouveaux comptes par jour"),
        card("Rythme moyen d'un enfant", "par jour, 7 derniers jours", h("div", { class: "kpis" },
            kpi(pc.feeds != null ? dec(pc.feeds) : "-", "repas"),
            kpi(pc.diapers != null ? dec(pc.diapers) : "-", "couches"),
            kpi(pc.sleep_h != null ? dec(pc.sleep_h) + " h" : "-", "de sommeil noté")),
          h("span", { class: "small muted", text: "Moyenne sur " + n(pc.children) + " enfant(s) ayant au moins une saisie." })),
        card("Saisies par type", "30 jours · " + n(ev.total) + " au total", hbars(d.events_by_type_30d, TYPE_NAME, function (t) { return CAT_COLOR[CAT[t]] || "#5B655D"; }),
          h("span", { class: "small muted", text: n(ev.twin_30d) + " notées pour plusieurs enfants d'un coup, " + n(ev.by_shortcut_30d) + " par raccourci, " + n(ev.deleted_30d) + " supprimées." })),
        card("Familles", null, h("span", { class: "small muted", text: "Nombre d'enfants par famille" }), hbars(fbc, { "1": "1 enfant", "2": "2 enfants", "3": "3 enfants" }, "#2B7262"),
          h("span", { class: "small muted", text: n(d.families_twins_mode) + " en mode jumeaux ou multiples." }),
          h("span", { class: "small muted", text: "Âge des enfants" }), hbars(d.children_age, AGE, "#A8661A")),
        card("Écrans consultés", "30 jours", hbars(use.screen, SCREEN, "#1F4A3A")),
        card("Bouton +", "30 jours", hbars(use.fab, FAB, "#A8661A")),
        card("Actions", "30 jours", hbars(use.action, null, "#5A50A0")),
        card("Appareils", "30 derniers jours", hbars(d.platforms, { ios: "iPhone", android: "Android", ordinateur: "Ordinateur" }, "#2B6A8A"),
          h("span", { class: "small muted", text: "Versions utilisées" }), hbars(d.versions, null, "#5B655D")),
        card("Autres", null, h("div", { class: "kpis" },
            kpi(n(inv.created), "invitations", n(inv.used) + " utilisées, 30 j"),
            kpi(n(hl.appointments_upcoming), "rendez-vous", "à venir"),
            kpi(n(d.calendar_feeds), "agendas", "synchronisés")),
          h("div", { class: "kpis" }, kpi(n(hl.measurements), "mesures", "poids, temp., 30 j"))),
        h("p", { class: "small muted", text: "Uniquement des comptes agrégés : aucun prénom, aucune saisie, aucune donnée de santé n'est lisible ici. Mis à jour " + new Date(d.generated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) + "." })
      ];
    }
    mount(h("main", { class: "screen" },
      h("a", { href: "#/famille", class: "small", text: "‹ Famille" }),
      h("span", { class: "eyebrow", text: "Administration" }),
      h("div", { class: "row between" }, h("h1", { class: "title-l", text: "Tableau de bord" }), h("button", { class: "btn ghost", onclick: function () { ADM.at = 0; loadAdmin(); }, text: "Actualiser" })),
      body));
    appEl.append(dock("famille", S.role === "parent" || S.role === "proche"));
  }

  function screenInstall(choice) {
    var b = choice || detectBrowser();
    var names = { safari: "iPhone · Safari", chrome: "iPhone · Chrome", other: "iPhone · autre navigateur", android: "Android", desktop: "Ordinateur" };
    var steps = {
      safari: [["Touchez ••• en bas à droite, puis Partager", "iOS 18 ou avant : l'icône Partager, en bas."], ["Choisissez « Sur l'écran d'accueil »", "Faites défiler la liste si besoin."], ["Laissez l'option app web activée, puis Ajouter", "L'icône Gloups apparaît avec vos apps."]],
      chrome: [["Touchez Partager, en haut à droite", "Barre masquée ? Faites glisser la page vers le bas."], ["Choisissez « Sur l'écran d'accueil »", "Faites défiler la liste si besoin."], ["Touchez Ajouter", "L'icône Gloups apparaît avec vos apps."]],
      other: [["Ouvrez cette page dans Safari", "Copiez l'adresse, puis collez-la dans Safari."], ["Suivez le guide Safari", "Partager, puis « Sur l'écran d'accueil »."]],
      desktop: [["Ouvrez Gloups sur votre téléphone", "Adresse : " + location.origin + location.pathname], ["Connectez-vous avec le même compte Google", "Votre famille s'affiche directement."]]
    };
    var seg = h("div", { class: "seg" }, [["safari", "Safari"], ["chrome", "Chrome"], ["android", "Android"]].map(function (o) {
      return h("button", { "aria-pressed": b === o[0] ? "true" : "false", onclick: function () { screenInstall(o[0]); }, text: o[1] });
    }));
    var content;
    if (isStandalone()) content = h("div", { class: "card ok" }, h("b", { text: "Gloups est installé sur cet appareil." }), h("span", { class: "small", text: "Vous l'utilisez déjà depuis l'icône." }));
    else if (b === "android") content = h("div", { class: "card" },
      h("p", { text: "Sur Android, Chrome propose l'installation directement." }),
      h("button", { class: "btn primary full", onclick: async function () {
        if (!S.deferredInstall) { toast("Menu ⋮ puis « Ajouter à l'écran d'accueil »."); return; }
        S.deferredInstall.prompt(); await S.deferredInstall.userChoice; S.deferredInstall = null;
      }, text: "Installer Gloups" }),
      h("span", { class: "small muted", text: "Si rien ne s'affiche : menu ⋮ puis « Ajouter à l'écran d'accueil »." }));
    else if (b === "safari") content = safariGuide();
    else content = h("ol", { class: "steps" }, steps[b].map(function (s, i) { return h("li", null, h("span", { class: "n", text: i + 1 }), h("span", { class: "t" }, h("b", { text: s[0] }), h("span", { text: s[1] }))); }));
    mount(h("main", { class: "screen plain" },
      h("a", { href: "#/", class: "row small", vars: { "text-decoration": "none", "font-weight": "650" } }, icon("back", 18), "Retour"),
      h("div", { class: "row" }, logo(), h("h1", { class: "title-l", text: "Mettez Gloups sur l'écran d'accueil" })),
      h("p", { class: "muted", text: "Une seule fois, 30 secondes. Ensuite Gloups s'ouvre en plein écran, déjà connecté." }),
      h("span", { class: "small muted", text: "Détecté : " + names[b] }), seg, content,
      S.family ? h("div", { class: "card ok small", text: "Votre famille est déjà enregistrée : depuis l'icône, vous retrouvez tout." }) : null,
      h("button", { class: "btn ghost", onclick: function () { lsSet("gloups.installHidden", "1"); location.hash = "#/"; }, text: "Plus tard, continuer dans le navigateur" })));
  }
  // Guide Safari en images : chaque étape montre le bouton exact à toucher
  function safariGuide() {
    var step = function (n, title, help, mock) { return h("li", { class: "gstep" }, h("span", { class: "n", text: n }), h("div", { class: "gt" }, h("b", { text: title }), help ? h("span", { class: "small muted", text: help }) : null, mock)); };
    var bar = h("div", { class: "mock-bar" }, h("span", { class: "mock-url", text: location.host }), h("span", { class: "mock-dots", "aria-label": "bouton •••" }, icon("dots", 20)));
    var menu = h("div", { class: "mock-menu" }, h("span", { class: "mock-row hl" }, icon("share", 18), "Partager"));
    var sheet = h("div", { class: "mock-menu" }, h("span", { class: "mock-row" }, icon("note", 18), "Ajouter un signet"), h("span", { class: "mock-row hl" }, icon("addsq", 18), "Sur l'écran d'accueil"));
    var add = h("div", { class: "mock-add" },
      h("div", { class: "mock-addtop" }, h("span", { class: "muted", text: "Annuler" }), h("b", { text: "Ajouter", class: "mock-pulse" })),
      h("div", { class: "mock-row" }, h("span", { text: "Ouvrir comme app web" }), h("span", { class: "mock-switch" })));
    return h("div", { class: "stack safari-guide" },
      h("ol", { class: "steps guide" },
        step(1, "Touchez le bouton ••• de la barre d'adresse", "En bas de l'écran, à droite de l'adresse.", bar),
        step(2, "Touchez Partager", null, menu),
        step(3, "Descendez et touchez « Sur l'écran d'accueil »", "Faites défiler la liste si besoin.", sheet),
        step(4, "Laissez « Ouvrir comme app web » activé, puis Ajouter", "L'icône Gloups apparaît avec vos apps.", add)),
      h("span", { class: "small muted", text: "Sur un iPhone plus ancien (iOS 18 ou avant) : touchez directement l'icône Partager en bas de l'écran, puis reprenez à l'étape 3." }),
      h("div", { class: "point-down", "aria-hidden": "true" }, h("span", { text: "Le bouton ••• est en bas" }), icon("back", 20)));
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); S.deferredInstall = e; });

  /* ---------- Navigation ---------- */
  /* ---------- Visite guidée au premier lancement (v0.10.0) ---------- */
  var TOUR = { on: false, i: 0, steps: [], root: null, timer: null };
  function tourKey() { return "gloups.tour." + (S.user ? S.user.id : ""); }
  function tourFind(sel) {
    if (!sel) return null;
    if (typeof sel === "function") return sel();
    return document.querySelector(sel);
  }
  function tourSteps() {
    var c = S.child ? S.child.first_name : "Bébé";
    var canWrite = S.role !== "lecture";
    var all = [
      { title: "Bienvenue dans Gloups", body: c + " est prêt. On vous montre l'essentiel en 30 secondes.", cta: "C'est parti", first: true },
      canWrite ? { sel: ".fab", round: true, title: "Notez en un tap", body: "Touchez +, puis une bulle : Repas, Sommeil, Couche ou Pleurs. Le minuteur démarre tout seul. « Plus » donne le bain, la température, le poids, une note et les berceuses." } : null,
      canWrite ? { sel: ".fab", round: true, demo: true, title: "C'était plus tôt ?", body: "Ouvrez le +, puis restez appuyé sur une bulle : glissez sur l'arc pour placer le début et la fin." } : null,
      { sel: "main.screen .nap", title: "Sa prochaine sieste", body: "Gloups apprend son rythme dès 3 sommeils notés et estime la prochaine sieste." },
      { sel: function () { var s = document.querySelector("main.screen section.card .strip"); if (!s) return null; var c = s.closest("section.card"); return [c.firstElementChild, c.querySelector(".counts") || s]; }, title: "Toute la journée d'un coup d'œil", body: "Chaque saisie apparaît sur la frise et dans la liste. Touchez-en une pour la corriger, glissez-la vers la gauche pour la supprimer." },
      { sel: '.dock [data-tab="journal"]', title: "Journal", body: "Toutes les saisies jour par jour ou en vue semaine, avec vos rendez-vous." },
      { sel: '.dock [data-tab="tendances"]', title: "Tendances", body: "Son rythme sur 7 jours, le sommeil par 24 heures, les pleurs par heure et la courbe de poids." },
      { sel: '.dock [data-tab="famille"]', title: "Famille", body: "Invitez l'autre parent avec un code : tout arrive chez lui en direct. Ajoutez un enfant, notez les rendez-vous, installez l'app. Vous pourrez aussi y revoir cette visite." },
      { title: "À vous de jouer", body: "Bonne route avec " + c + " !", cta: "Terminer", last: true }
    ];
    return all.filter(function (s) { return s && (!s.sel || tourFind(s.sel)); });
  }
  function startTour(force) {
    if (TOUR.on || !S.family) return;
    if (!force && lsGet(tourKey())) return;
    if (document.querySelector(".backdrop") || (fab && fab.level)) return;
    TOUR.steps = tourSteps(); TOUR.i = 0; TOUR.on = true;
    TOUR.root = h("div", { class: "tour", role: "dialog", "aria-modal": "true", "aria-label": "Visite guidée" });
    document.body.appendChild(TOUR.root);
    document.documentElement.classList.add("tour-open");
    tourShow();
    TOUR.timer = setInterval(tourPlace, 600);
    window.addEventListener("resize", tourPlace);
    track("action", force ? "visite_relancee" : "visite_debut");
  }
  function endTour(done) {
    if (!TOUR.on) return;
    lsSet(tourKey(), "1");
    clearInterval(TOUR.timer); window.removeEventListener("resize", tourPlace);
    var r = TOUR.root; TOUR.on = false; TOUR.root = null;
    document.documentElement.classList.remove("tour-open");
    if (r) { r.classList.add("out"); setTimeout(function () { r.remove(); }, 250); }
    track("action", done ? "visite_terminee" : "visite_passee");
  }
  function tourDemo() {
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 160 60"); svg.setAttribute("width", "150"); svg.setAttribute("height", "56");
    ["tour-arc-bg", "tour-arc"].forEach(function (c) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", "M10 56a70 70 0 0 1 140 0"); p.setAttribute("class", c); svg.appendChild(p);
    });
    return h("div", { class: "tour-demo", "aria-hidden": "true" }, h("span", { class: "tour-press" }, h("span", { class: "tour-hold" })), svg);
  }
  function tourShow() {
    var s = TOUR.steps[TOUR.i]; if (!s) { endTour(true); return; }
    var n = TOUR.steps.filter(function (x) { return x.sel; }).length;
    var k = TOUR.steps.slice(0, TOUR.i + 1).filter(function (x) { return x.sel; }).length;
    var next = function () { if (TOUR.i >= TOUR.steps.length - 1) endTour(true); else { TOUR.i++; tourShow(); } };
    var tip;
    if (!s.sel) {
      tip = h("div", { class: "tour-card" },
        h("div", { class: "tour-baby" + (s.last ? " party" : "") }, logo()),
        h("h2", { text: s.title }), h("p", { text: s.body }),
        h("button", { class: "btn primary full", type: "button", onclick: next, text: s.cta }),
        s.first ? h("button", { class: "btn ghost", type: "button", onclick: function () { endTour(false); }, text: "Plus tard" }) : null);
      TOUR.root.replaceChildren(h("div", { class: "tour-dim" }), tip);
    } else {
      if (!TOUR.root.querySelector(".tour-spot")) TOUR.root.replaceChildren(h("div", { class: "tour-spot" }), h("div", { class: "tour-ring" }));
      else Array.prototype.forEach.call(TOUR.root.querySelectorAll(".tour-tip, .tour-dim, .tour-card"), function (e) { e.remove(); });
      tip = h("div", { class: "tour-tip" },
        h("span", { class: "tour-k", text: "Étape " + k + " sur " + n }),
        h("b", { text: s.title }), h("p", { text: s.body }),
        s.demo ? tourDemo() : null,
        h("div", { class: "tour-foot" },
          h("button", { class: "tour-skip", type: "button", onclick: function () { endTour(false); }, text: "Passer" }),
          h("span", { class: "tour-dots", "aria-hidden": "true" }, TOUR.steps.filter(function (x) { return x.sel; }).map(function (x, j) { return h("i", { class: j === k - 1 ? "on" : null }); })),
          h("button", { class: "btn primary", type: "button", onclick: next, text: "Suivant" })));
      TOUR.root.appendChild(tip);
      var t = tourFind(s.sel); if (Array.isArray(t)) t = t[0];
      if (t) {
        var r0 = t.getBoundingClientRect();
        if (r0.top < 60 || r0.bottom > innerHeight - 90) t.scrollIntoView({ block: "center" });
      }
    }
    tourPlace();
    var b = tip.querySelector(".btn.primary"); if (b) b.focus({ preventScroll: true });
  }
  function tourPlace() {
    if (!TOUR.on) return;
    var s = TOUR.steps[TOUR.i]; if (!s || !s.sel) return;
    var t = tourFind(s.sel), spot = TOUR.root.querySelector(".tour-spot"), ring = TOUR.root.querySelector(".tour-ring"), tip = TOUR.root.querySelector(".tour-tip");
    if (!t || !spot || !tip) return;
    var r = Array.isArray(t) ? t.reduce(function (a, e) { var b = e.getBoundingClientRect(); return a ? { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; }, null) : t.getBoundingClientRect(), pad = s.round ? 6 : 10;
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    var box = { left: r.left - pad, top: r.top - pad, width: r.width + 2 * pad, height: r.height + 2 * pad };
    var rad = s.round ? box.width / 2 : 22;
    [spot, ring].forEach(function (e) {
      e.style.left = box.left + "px"; e.style.top = box.top + "px"; e.style.width = box.width + "px"; e.style.height = box.height + "px"; e.style.borderRadius = rad + "px";
    });
    var th = tip.offsetHeight, below = box.top + box.height + 14, above = box.top - 14 - th;
    var top = box.top + box.height / 2 > innerHeight / 2 ? Math.max(12, above) : Math.min(innerHeight - th - 12, below);
    tip.style.top = top + "px";
  }
  window.addEventListener("keydown", function (e) { if (TOUR.on && e.key === "Escape") endTour(false); });
  function route() {
    if (S.loading) return;
    if (!S.user) { screenWelcome(); return; }
    if (!S.profile || !S.profile.first_name) { screenName(); return; }
    var pendingInvite = lsGet("gloups.invite");
    if (pendingInvite) {
      mount(h("main", { class: "screen plain" }, logo("s"), h("h1", { class: "title-l", text: "Rejoindre une famille" }), joinForm(pendingInvite),
        h("button", { class: "btn ghost", onclick: function () { lsSet("gloups.invite", null); route(); }, text: "Ignorer cette invitation" })));
      return;
    }
    if (!S.family) { screenOnboarding(); return; }
    if (SW.active) { SW.pending = true; return; }
    var r = location.hash.replace(/^#\/?/, "");
    var key = (S.child ? S.child.id : "") + "/" + r;
    ENTER = key !== lastKey && !SW.nav;
    SW.nav = false;
    var prevIdx = TAB_IDX[lastKey ? lastKey.split("/")[1] : null];
    if (key !== lastKey) SCROLL_TOP = true;
    if (key !== lastKey) track("screen", r === "journal" && J.view ? "journal_" + J.view : r || "accueil");
    lastKey = key;
    if (r === "journal") screenJournal();
    else if (r === "tendances") screenTrends();
    else if (r === "famille") screenFamily();
    else if (r === "installer") screenInstall();
    else if (r === "admin" && S.isAdmin) screenAdmin();
    else { screenHome(); if (!TOUR.on) setTimeout(function () { if (!location.hash.replace(/^#\/?/, "")) startTour(false); }, 900); }
    if (ENTER) { if (trendsEnter) trendsPrev = prevIdx; else afterEnter(r, prevIdx); }
    ENTER = false;
  }
  // Animations d'entrée : seulement en arrivant sur un écran, pas quand il se redessine (temps réel, minute qui passe)
  var ENTER = false, lastKey = null;
  var TAB_IDX = { "": 0, journal: 1, tendances: 2, famille: 3 };
  function afterEnter(r, prevIdx) {
    var m = appEl.querySelector("main.screen"); if (!m) return;
    var i = TAB_IDX[r];
    if (prevIdx != null && i != null && i !== prevIdx) m.classList.add(i > prevIdx ? "enter-r" : "enter-l");
    else m.classList.add("enter-fade");
  }
  window.addEventListener("hashchange", function () { closeSheet(); route(); });

  // Glisser entre les onglets : l'écran suit le doigt et l'onglet voisin arrive en même temps
  var TABS = ["#/", "#/journal", "#/tendances", "#/famille"];
  var TAB_KEYS = ["home", "journal", "tendances", "famille"];
  var SW = { active: false, pending: false, nav: false };
  function renderPeek(hash) {
    var saved = Array.prototype.slice.call(appEl.childNodes), m = null;
    var sv = { ENTER: ENTER, jdir: J.dir };
    PEEK = true; ENTER = false; J.dir = 0;
    try {
      var r = hash.replace(/^#\/?/, "");
      if (r === "journal") screenJournal(); else if (r === "tendances") screenTrends(); else if (r === "famille") screenFamily(); else screenHome();
      m = appEl.querySelector("main.screen");
    } catch (e) { m = null; }
    PEEK = false; ENTER = sv.ENTER; J.dir = sv.jdir;
    appEl.replaceChildren.apply(appEl, saved);
    return m;
  }
  (function () {
    var x0 = 0, y0 = 0, lock = null, cur = null, idx = -1, W = 0, scrollY0 = 0;
    var peeks = {}, layer = null, dx = 0, hist = [], ind = null, xs = [];
    function blocked(el) {
      return sheetRoot.firstChild || (fab.el && fab.level) || !appEl.querySelector(".dock") ||
        (el.closest && el.closest(".swipe, input, textarea, select, .sheet, .fab-root, .backdrop"));
    }
    function curIndex() { var hsh = location.hash === "" || location.hash === "#" ? "#/" : location.hash; return TABS.indexOf(hsh); }
    function getPeek(j) {
      if (peeks[j] !== undefined) return peeks[j];
      var m = renderPeek(TABS[j]);
      if (!m) { peeks[j] = null; return null; }
      var box = h("div", { class: "peek", "aria-hidden": "true" }, m);
      layer.append(box);
      peeks[j] = box; return box;
    }
    function tabX(j) { return xs[j] != null ? xs[j] : null; }
    function apply(d) {
      var dir = d < 0 ? 1 : -1, j = idx + dir, has = j >= 0 && j < TABS.length;
      var shown = has ? d : d * 0.28; // résistance au bord
      cur.style.transform = "translate3d(" + shown + "px,0,0)";
      Object.keys(peeks).forEach(function (k) { var p = peeks[k]; if (p) p.style.visibility = (+k === j && has) ? "visible" : "hidden"; });
      if (has) { var p = getPeek(j); if (p) p.style.transform = "translate3d(" + (shown + (dir > 0 ? W : -W)) + "px,0,0)"; }
      if (ind && has && tabX(idx) != null && tabX(j) != null) {
        var t = Math.min(1, Math.abs(shown) / W), x = tabX(idx) + (tabX(j) - tabX(idx)) * t;
        ind.style.transition = "none"; ind.style.transform = "translateX(" + x + "px) scaleX(" + (1 + Math.sin(t * Math.PI) * 1.2) + ")";
      }
    }
    function cleanup() {
      if (layer) layer.remove();
      layer = null; peeks = {}; SW.active = false;
      if (cur) { cur.style.transition = ""; cur.style.transform = ""; cur.style.willChange = ""; }
      if (SW.pending) { SW.pending = false; route(); }
    }
    document.addEventListener("touchstart", function (e) {
      lock = null;
      if (e.touches.length !== 1 || SW.active || blocked(e.target)) return;
      idx = curIndex(); cur = appEl.querySelector("main.screen");
      if (idx < 0 || !cur) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; hist = [[Date.now(), x0]];
      lock = "?";
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!lock || e.touches.length !== 1) return;
      var x = e.touches[0].clientX, y = e.touches[0].clientY;
      if (lock === "?") {
        var ax = Math.abs(x - x0), ay = Math.abs(y - y0);
        if (ax < 8 && ay < 8) return;
        if (ax <= ay * 1.15) { lock = null; return; }
        lock = "h"; SW.active = true; W = window.innerWidth; scrollY0 = window.scrollY;
        x0 = x; // pas de saut au démarrage
        layer = h("div", { class: "peek-layer", "aria-hidden": "true" });
        document.body.append(layer);
        cur.style.willChange = "transform"; cur.style.transition = "none";
        ind = appEl.querySelector(".tab-ind");
        var nav = appEl.querySelector(".dock");
        xs = TAB_KEYS.map(function (k) { var a = nav && nav.querySelector('[data-tab="' + k + '"]'); return a ? a.offsetLeft + a.offsetWidth / 2 - 10 : null; });
      }
      if (lock !== "h") return;
      if (e.cancelable) e.preventDefault();
      dx = x - x0;
      hist.push([Date.now(), x]); if (hist.length > 6) hist.shift();
      apply(dx);
    }, { passive: false });
    function release() {
      if (lock !== "h") { lock = null; return; }
      lock = null;
      var a = hist[0], b = hist[hist.length - 1], v = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0; // px/ms
      var dir = dx < 0 ? 1 : -1, j = idx + dir, has = j >= 0 && j < TABS.length;
      var go = has && (Math.abs(dx) > W * 0.3 || (Math.abs(v) > 0.35 && Math.sign(v) === Math.sign(dx)));
      var target = go ? (dir > 0 ? -W : W) : 0;
      var remaining = Math.abs(target - (has ? dx : dx * 0.28));
      var ms = Math.max(160, Math.min(340, Math.abs(v) > 0.1 ? remaining / Math.abs(v) * 1.6 : remaining * 0.9));
      var ease = "transform " + ms + "ms cubic-bezier(.2,.8,.25,1)";
      cur.style.transition = ease;
      cur.style.transform = "translate3d(" + target + "px,0,0)";
      var p = has ? peeks[j] : null;
      if (p) { p.style.transition = ease; p.style.transform = "translate3d(" + (target + (dir > 0 ? W : -W)) + "px,0,0)"; }
      if (ind) {
        ind.style.transition = "transform " + ms + "ms cubic-bezier(.2,.8,.25,1)";
        var tx = go ? tabX(j) : tabX(idx);
        if (tx != null) ind.style.transform = "translateX(" + tx + "px)";
      }
      setTimeout(function () {
        if (go) {
          tabInd.x = tabX(j);
          SW.active = false; SW.pending = false; SW.nav = true;
          // Le vrai écran remplace l'aperçu au même endroit, sans attendre l'événement de navigation
          try { history.pushState(null, "", TABS[j]); } catch (er) { location.hash = TABS[j]; return; }
          route();
          cleanup();
        } else cleanup();
      }, ms + 20);
    }
    document.addEventListener("touchend", release, { passive: true });
    document.addEventListener("touchcancel", release, { passive: true });
  })();
  // Pas de zoom : pincement (Safari) et double tap
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("touchmove", function (e) { if (typeof e.scale === "number" && e.scale !== 1) e.preventDefault(); }, { passive: false });

  function screenName() {
    var input = h("input", { class: "input", maxlength: 60, autocomplete: "given-name", placeholder: "Votre prénom" });
    var btn = h("button", { class: "btn primary full", type: "submit", text: "Continuer" });
    mount(h("main", { class: "screen plain" }, logo("s"),
      h("h1", { class: "title-l", text: "Comment vous appelez-vous ?" }),
      h("p", { class: "muted", text: "Votre prénom apparaît à côté de vos saisies pour le reste de la famille." }),
      h("form", { class: "stack", onsubmit: async function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) return;
        btn.disabled = true;
        var r = await sb.from("profiles").update({ first_name: v }).eq("id", S.user.id).select().single();
        btn.disabled = false;
        if (r.error) { toast(errMsg(r.error), { error: true }); return; }
        S.profile = r.data; route();
      } }, h("label", { class: "field" }, h("span", { text: "Prénom" }), input), btn),
      h("button", { class: "btn ghost", onclick: signOut, text: "Se déconnecter" })));
    setTimeout(function () { input.focus(); }, 50);
  }

  async function boot(reload) {
    S.loading = true;
    try {
      if (!reload) {
        var s = await sb.auth.getSession();
        S.session = s.data.session; S.user = S.session ? S.session.user : null;
      }
      if (S.user) {
        await loadProfile();
        await loadMemberships();
        await loadFamily();
        await loadEvents();
        await loadAppts();
        subscribe();
        ping();
        sb.rpc("api_admin_is_admin").then(function (r) { var was = S.isAdmin; S.isAdmin = !r.error && r.data === true; if (S.isAdmin !== was && location.hash === "#/famille") route(); });
      }
    } catch (e) {
      S.loading = false;
      mount(h("main", { class: "screen plain" }, logo(), h("h1", { class: "title-l", text: "Connexion impossible" }), h("p", { class: "muted", text: errMsg(e) }), h("button", { class: "btn primary", onclick: function () { boot(); }, text: "Réessayer" })));
      return;
    }
    S.loading = false;
    route();
  }
  async function signOut() {
    if (S.channel) sb.removeChannel(S.channel);
    await sb.auth.signOut();
    ["gloups.family", "gloups.child"].forEach(function (k) { lsSet(k, null); });
    S.user = null; S.family = null; route();
  }

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_IN" && (!S.user || S.user.id !== session.user.id)) { S.session = session; S.user = session.user; boot(true); }
    if (event === "SIGNED_OUT") { S.user = null; }
  });

  // Invitation dans l'adresse (?invite=CODE) : gardée jusqu'après la connexion
  (function () {
    var p = new URLSearchParams(location.search);
    var inv = p.get("invite");
    if (inv && /^[A-Za-z0-9-]{7,9}$/.test(inv)) { lsSet("gloups.invite", inv.toUpperCase()); history.replaceState(null, "", location.pathname + location.hash); }
  })();

  // Minuteurs : mise à jour chaque seconde, sans tout redessiner
  setInterval(function () {
    document.querySelectorAll("[data-start]").forEach(function (el) { el.textContent = clock((Date.now() - new Date(el.getAttribute("data-start"))) / 1000); });
  }, 1000);
  // Les durées « depuis » se rafraîchissent chaque minute
  setInterval(function () { if (!sheetRoot.firstChild && !SW.active && (location.hash === "" || location.hash === "#/")) route(); }, 60000);
  document.addEventListener("visibilitychange", function () {
    var vis = document.visibilityState === "visible";
    if (!vis) flushUsage();
    if (S.channel && S.sync === "ok") { try { vis ? S.channel.track({ at: new Date().toISOString() }) : S.channel.untrack(); } catch (e) { /* rien */ } }
    if (vis && S.user) { if (S.sync === "off" && S.family) subscribe(); refresh(); if (Date.now() - lastPing > 30 * 60000) ping(); }
  });
  window.addEventListener("offline", function () { S.sync = "off"; S.online = {}; paintPresence(); });
  window.addEventListener("online", function () { if (S.user && S.family) { subscribe(); refresh(); } });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});

  boot();
})();

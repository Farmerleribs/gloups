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
    events: [], appts: [], evFrom: null, evChild: null, loading: true, channel: null, tick: null,
    deferredInstall: null
  };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- Rendu ---------- */
  var appEl = document.getElementById("app");
  var sheetRoot = document.getElementById("sheet-root");
  var toastRoot = document.getElementById("toast-root");
  function mount(node) { if (fab.el) fabSync(false); appEl.replaceChildren(node); window.scrollTo(0, 0); }

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
    setTimeout(function () { if (bd.parentNode === sheetRoot) sheetRoot.removeChild(bd); }, 240);
  }
  function openSheet(title, body) {
    var sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "grab" }),
      h("div", { class: "row between" }, h("h2", { class: "title-m", text: title }), h("button", { class: "btn ghost small", onclick: closeSheet, text: "Fermer" })),
      body);
    var bd = h("div", { class: "backdrop", onclick: function (e) { if (e.target === bd) closeSheet(); } }, sheet);
    sheetRoot.replaceChildren(bd);
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
    var r = await sb.from("family_members").select("family_id, role, status, families(id, name, timezone)").eq("user_id", S.user.id).eq("status", "active");
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
      sb.from("family_members").select("user_id, role, status, profiles(first_name)").eq("family_id", fid).eq("status", "active")
    ]);
    if (res[0].error) throw res[0].error;
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
    S.channel = sb.channel("events-" + S.family.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: "family_id=eq." + S.family.id }, function () { refresh(); })
      .subscribe();
  }
  var refreshing = null;
  function refresh() {
    clearTimeout(refreshing);
    refreshing = setTimeout(async function () {
      try { await Promise.all([loadEvents(), loadAppts()]); route(); } catch (e) { /* hors ligne : on garde l'affichage */ }
    }, 250);
  }

  async function logEvent(type, data, opts) {
    opts = opts || {};
    var now = new Date();
    var row = {
      id: uuid(), family_id: S.family.id, child_id: S.child.id, type: type,
      started_at: (opts.started || now).toISOString(),
      ended_at: opts.running ? null : (opts.ended || opts.started || now).toISOString(),
      data: data || {}, source: "app"
    };
    var r = await sb.from("events").insert(row).select().single();
    if (r.error) { toast(errMsg(r.error), { error: true }); return null; }
    S.events.unshift(r.data);
    S.fresh = { id: r.data.id, cat: CAT[r.data.type], t: Date.now() };
    closeSheet();
    route();
    toast(label(r.data) + (opts.running ? " · minuteur lancé" : " · " + hhmm(r.data.started_at)), {
      action: { label: "Annuler", fn: function () { removeEvent(r.data, true); } }
    });
    return r.data;
  }
  async function stopEvent(ev) {
    var r = await sb.from("events").update({ ended_at: new Date().toISOString() }).eq("id", ev.id).select().single();
    if (r.error) { toast(errMsg(r.error), { error: true }); return null; }
    replaceEvent(r.data); route();
    return r.data;
  }
  async function removeEvent(ev, silent) {
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

  /* ---------- Écran : connexion ---------- */
  function screenWelcome() {
    var invite = lsGet("gloups.invite");
    mount(h("main", { class: "screen plain" },
      h("div", { class: "stack", vars: { "margin-top": "12vh" } },
        logo(),
        h("h1", { class: "title-xl", text: "Gloups" }),
        h("p", { class: "muted", vars: { "font-size": "18px" }, text: "Le carnet de bébé pour toute la famille." }),
        invite ? h("div", { class: "card ok" }, h("b", { text: "Invitation reçue (" + invite + ")" }), h("span", { class: "small", text: "Connectez-vous pour rejoindre la famille." })) : null
      ),
      h("div", { class: "stack", vars: { "margin-top": "auto" } },
        h("button", { class: "btn dark full", onclick: signIn, text: "Continuer avec Google" }),
        h("p", { class: "small muted", vars: { "text-align": "center" } }, "Gratuit, sans mot de passe. Données hébergées dans l'Union européenne. ",
          h("a", { href: "confidentialite.html", text: "Confidentialité" }), " · ", h("a", { href: "conditions.html", text: "Conditions" }))
      )
    ));
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
    tab = tab || "create";
    var body = h("div", { class: "stack" });
    var seg = h("div", { class: "seg", role: "tablist" },
      h("button", { "aria-pressed": tab === "create" ? "true" : "false", onclick: function () { screenOnboarding("create"); }, text: "Créer une famille" }),
      h("button", { "aria-pressed": tab === "join" ? "true" : "false", onclick: function () { screenOnboarding("join"); }, text: "J'ai un code" }));
    mount(h("main", { class: "screen plain" },
      h("div", { class: "row" }, logo("s"), h("span", { class: "muted", text: "Bonjour " + (S.profile.first_name || "") })),
      h("h1", { class: "title-l", text: tab === "create" ? "Créons votre famille" : "Rejoindre une famille" }),
      seg, body,
      h("button", { class: "btn ghost", onclick: signOut, text: "Se déconnecter" })));
    if (tab === "create") body.append(familyForm(async function (vals) {
      var r = await sb.rpc("api_v1_create_family", { p_family_name: vals.family, p_child_first_name: vals.child, p_child_birth_date: vals.born ? vals.date : null, p_child_due_date: vals.born ? null : vals.date, p_child_color: vals.color });
      if (r.error) { toast(errMsg(r.error), { error: true }); return; }
      lsSet("gloups.family", r.data);
      await boot(true);
      if (!isStandalone()) location.hash = "#/installer";
    }));
    else body.append(joinForm(""));
  }

  var CHILD_COLORS = [["#2B7262", "Vert"], ["#5A50A0", "Lavande"], ["#A8661A", "Ocre"], ["#2E5D94", "Bleu"], ["#B04A3A", "Corail"]];
  function familyForm(onSubmit, opts) {
    opts = opts || {};
    var born = true, color = CHILD_COLORS[0][0];
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
      if (!child.value.trim() || !date.value || (!opts.childOnly && !fam.value.trim())) { toast("Complétez les champs.", { error: true }); return; }
      submit.disabled = true;
      await onSubmit({ family: fam.value.trim(), child: child.value.trim(), born: born, date: date.value, color: color });
      submit.disabled = false;
    } },
      opts.childOnly ? null : h("label", { class: "field" }, h("span", { text: "Nom de la famille" }), fam),
      h("label", { class: "field" }, h("span", { text: "Prénom de l'enfant" }), child),
      bornSeg,
      h("label", { class: "field" }, dateLbl, date),
      h("div", { class: "field" }, h("span", { text: "Couleur de l'enfant" }), colors),
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
    var membersInit = S.members.slice(0, 3).map(function (m) { return h("span", { class: "avatar", vars: { width: "32px", height: "32px", "font-size": "12px", "margin-left": "-6px", border: "2px solid var(--bg)" }, text: initials(S.profiles[m.user_id]) }); });

    mount(h("main", { class: "screen" },
      h("div", { class: "top" },
        h("div", { class: "who" },
          h("span", { class: "eyebrow", text: S.family.name + " · " + DAYS[new Date().getDay()] + " " + new Date().getDate() + " " + MONTHS[new Date().getMonth()] }),
          h("button", { class: "child-btn", vars: { "--child": c.color }, onclick: S.children.length > 1 ? childSwitcher : null, "aria-label": S.children.length > 1 ? "Changer d'enfant" : null },
            h("span", { class: "dot" }), h("span", { class: "name", text: c.first_name }), S.children.length > 1 ? h("span", { class: "muted", vars: { "font-size": "20px" }, text: "▾" }) : null),
          h("span", { class: "small muted", text: ageLabel(c) })),
        h("a", { href: "#/famille", class: "row", "aria-label": "Famille et réglages", vars: { "text-decoration": "none", gap: "0" } }, membersInit)),
      !sleeping ? napCard(canWrite) : null,
      nextApptCard(),
      h("section", { class: "stack", vars: { gap: "8px" } },
        h("span", { class: "eyebrow", text: "Depuis le dernier" }),
        h("div", { class: "tiles" },
          tile("Repas", CAT_COLOR.repas, lastFeed ? ago(lastFeed.ended_at || lastFeed.started_at) : "-", lastFeed ? label(lastFeed).replace("Tétée ", "sein ") : "aucun", function () { sheetFeed(); }, "repas"),
          tile("Couche", CAT_COLOR.couche, lastDiaper ? ago(lastDiaper.started_at) : "-", lastDiaper ? (lastDiaper.data.poo ? "selles" : "pipi") : "aucune", function () { sheetDiaper(); }, "couche"),
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
    fabSync(true, canWrite);
    var ind = h("span", { class: "tab-ind", "aria-hidden": "true" });
    var nav = h("nav", { class: "dock" + (canWrite ? " has-fab" : ""), "aria-label": "Navigation principale" },
      tab("#/", "home", "Aujourd'hui", "home"), tab("#/journal", "list", "Journal", "journal"),
      canWrite ? h("span", { class: "fab-gap", "aria-hidden": "true" }) : null,
      tab("#/tendances", "chart", "Tendances", "tendances"), tab("#/famille", "family", "Famille", "famille"), ind);
    requestAnimationFrame(function () {
      var a = nav.querySelector('[data-tab="' + active + '"]'); if (!a || !nav.isConnected) return;
      var x = a.offsetLeft + a.offsetWidth / 2 - 10;
      if (tabInd.x != null && tabInd.x !== x) {
        ind.style.transition = "none"; ind.style.transform = "translateX(" + tabInd.x + "px)"; void ind.offsetWidth;
        ind.style.transition = ""; ind.classList.add("moving");
        setTimeout(function () { ind.classList.remove("moving"); }, 380);
      }
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
    bain: ["Bain", "sante", "bath", 56], temp: ["Température", "sante", "temp", 56], poids: ["Poids", "sante", "scale", 56], note: ["Note", "neutre", "note", 56]
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
    plus: arc(["bain", "temp", "poids", "note"])
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
    switch (id) {
      case "repas": case "couche": case "plus": go(id); return;
      case "sommeil": then(function () { var c = runningOf("sleep"); if (c) stopWithToast(c); else logEvent("sleep", {}, { running: true }); }); return;
      case "pleurs": then(function () { var c = runningOf("cry"); if (c) stopWithToast(c); else logEvent("cry", {}, { running: true }); }); return;
      case "g": then(function () { dockBreast("left"); }); return;
      case "d": then(function () { dockBreast("right"); }); return;
      case "biberon": then(sheetBottle); return;
      case "tirelait": then(sheetPump); return;
      case "pipi": then(function () { logEvent("diaper", { pee: true, poo: false }); }); return;
      case "selles": then(function () { logEvent("diaper", { pee: false, poo: true }); }); return;
      case "deux": then(function () { logEvent("diaper", { pee: true, poo: true }); }); return;
      case "bain": then(function () { logEvent("bath", {}); }); return;
      case "temp": then(sheetTemp); return;
      case "poids": then(sheetWeight); return;
      case "note": then(sheetNote); return;
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
      var btn = h("button", { class: "bub c-" + b[1], tabindex: "-1", "aria-hidden": "true", vars: { "--d": b[3] + "px" }, onclick: function () { fabAction(id); } }, disc, lbl);
      fab.bubbles[id] = { btn: btn, lbl: lbl };
      layer.append(btn);
    });
    var btn = h("button", { class: "fab", "aria-label": "Nouvelle saisie", "aria-expanded": "false", onclick: function () { fabLevel(fab.level === "root" ? null : "root"); } }, h("span", { class: "rot" }, icon("plus", 30)));
    var pills = h("div", { class: "pills", role: "group", "aria-label": "Activités en cours" });
    fab.el = h("div", { class: "fab-root" }, pills, bd, q, layer, btn);
    fab.parts = { bd: bd, q: q, btn: btn, pills: pills };
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
    fab.parts.q.textContent = l ? QUESTION[l] : "";
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
  }
  function pill(ev, canWrite) {
    var acts = h("div", { class: "acts" });
    if (canWrite) {
      if (ev.type === "feed.breast" && ev.data.side !== "both") acts.append(h("button", { class: "swap", "aria-label": "Changer de côté", onclick: async function () {
        var stopped = await stopEvent(ev); if (!stopped) return;
        await logEvent("feed.breast", { side: ev.data.side === "left" ? "right" : "left" }, { running: true });
      } }, icon("swap", 18), h("span", { text: "Côté" })));
      acts.append(h("button", { class: "stop", onclick: function () { stopWithToast(ev); }, text: ev.type === "sleep" ? "Réveil" : "Terminer" }));
    }
    return h("div", { class: "pill", "data-id": ev.id },
      h("span", { class: "breath", "aria-hidden": "true" }),
      h("div", { class: "txt" }, h("span", { class: "t", text: label(ev) + " · depuis " + hhmm(ev.started_at) }),
        h("span", { class: "time", "data-start": ev.started_at, text: clock((Date.now() - new Date(ev.started_at)) / 1000) })),
      acts);
  }

  function childSwitcher() {
    openSheet("Changer d'enfant", h("div", { class: "stack" }, S.children.map(function (c) {
      return h("button", { class: "btn full", vars: { "justify-content": "flex-start" }, onclick: async function () { S.child = c; weights = null; lsSet("gloups.child", c.id); closeSheet(); await loadEvents(); route(); } },
        h("span", { class: "avatar", vars: { background: c.color, width: "32px", height: "32px" }, text: initials(c.first_name) }), c.first_name);
    })));
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
    openSheet("Repas", h("div", { class: "stack" },
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
    openSheet("Tétée passée", h("div", { class: "stack" }, sideSeg, h("div", { class: "field" }, h("span", { text: "Durée" }), durChips), t.el,
      h("button", { class: "btn primary full", onclick: function () { var st = t.value(); logEvent("feed.breast", { side: side }, { started: st, ended: new Date(st.getTime() + mins * 60000) }); }, text: "Enregistrer" })));
  }
  function sheetBottle() {
    var ml = 90;
    var chips = h("div", { class: "chips" });
    function draw() { chips.replaceChildren.apply(chips, [30, 60, 90, 120, 150, 180, 210].map(function (v) { return h("button", { type: "button", class: "chip", "aria-pressed": ml === v ? "true" : "false", onclick: function () { ml = v; draw(); }, text: v + NB + "ml" }); })); }
    draw();
    var milk = selectField("Lait", { breastmilk: "Lait maternel", formula: "Lait infantile", other: "Autre" });
    var t = timeChooser();
    openSheet("Biberon", h("div", { class: "stack" }, h("div", { class: "field" }, h("span", { text: "Quantité" }), chips), milk.el, t.el,
      h("button", { class: "btn primary full", onclick: function () { var d = { ml: ml }; if (milk.value()) d.milk = milk.value(); logEvent("feed.bottle", d, { started: t.value() }); }, text: "Enregistrer le biberon" })));
  }
  function sheetPump() {
    var ml = selectField("Quantité", { 20: "20 ml", 40: "40 ml", 60: "60 ml", 80: "80 ml", 100: "100 ml", 120: "120 ml", 150: "150 ml" });
    var side = selectField("Côté", { left: "Gauche", right: "Droit", both: "Les deux" });
    var t = timeChooser();
    openSheet("Tire-lait", h("div", { class: "stack" }, ml.el, side.el, t.el,
      h("button", { class: "btn primary full", onclick: function () { var d = {}; if (ml.value()) d.ml = parseInt(ml.value(), 10); if (side.value()) d.side = side.value(); logEvent("feed.pump", d, { started: t.value() }); }, text: "Enregistrer" })));
  }
  function sheetDiaper() {
    var color = selectField("Couleur des selles", COLORS);
    var texture = selectField("Consistance", TEXTURES);
    var t = timeChooser();
    var warn = h("div", { class: "card alert small", hidden: true, text: "Selles blanches, noires ou avec du sang : demandez un avis médical sans attendre." });
    color.el.querySelector("select").addEventListener("change", function (e) { warn.hidden = ["white", "black", "red"].indexOf(e.target.value) < 0; });
    var save = function (pee, poo) { return function () {
      var d = { pee: pee, poo: poo };
      if (poo && color.value()) d.color = color.value();
      if (poo && texture.value()) d.texture = texture.value();
      logEvent("diaper", d, { started: t.value() });
    }; };
    openSheet("Couche", h("div", { class: "stack" },
      h("div", { class: "big3" },
        h("button", { class: "bigbtn couche", onclick: save(true, false), text: "Pipi" }),
        h("button", { class: "bigbtn couche", onclick: save(false, true), text: "Selles" }),
        h("button", { class: "bigbtn couche", onclick: save(true, true), text: "Les deux" })),
      t.el, color.el, texture.el, warn));
  }
  function sheetSleep() {
    var cur = running().find(function (e) { return e.type === "sleep"; });
    var place = selectField("Lieu", PLACES);
    if (cur) {
      openSheet("Sommeil", h("div", { class: "stack" }, h("p", { text: "Endormi depuis " + hhmm(cur.started_at) + " (" + ago(cur.started_at) + ")." }),
        h("button", { class: "btn primary full", onclick: function () { closeSheet(); stopEvent(cur); }, text: "Il se réveille" })));
      return;
    }
    var start = h("input", { class: "input", type: "time", value: hhmm(new Date(Date.now() - 3600000)) });
    var end = h("input", { class: "input", type: "time", value: hhmm(new Date()) });
    openSheet("Sommeil", h("div", { class: "stack" },
      place.el,
      h("button", { class: "bigbtn sommeil", onclick: function () { var d = {}; if (place.value()) d.place = place.value(); logEvent("sleep", d, { running: true }); }, text: "Il s'endort maintenant" }),
      h("div", { class: "card" }, h("b", { text: "Ou noter un sommeil passé" }),
        h("div", { class: "big2" }, h("label", { class: "field" }, h("span", { text: "Endormi à" }), start), h("label", { class: "field" }, h("span", { text: "Réveillé à" }), end)),
        h("button", { class: "btn full", onclick: function () {
          var a = timeToday(start.value), b = timeToday(end.value);
          if (a > b) a = new Date(a.getTime() - 86400000);
          var d = {}; if (place.value()) d.place = place.value();
          logEvent("sleep", d, { started: a, ended: b });
        }, text: "Enregistrer ce sommeil" }))));
  }
  function timeToday(v) { var p = v.split(":"), d = new Date(); d.setHours(+p[0], +p[1], 0, 0); if (d > new Date()) d = new Date(d.getTime() - 86400000); return d; }

  function sheetPlus() {
    openSheet("Plus", h("div", { class: "stack" },
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
    openSheet("Note", h("div", { class: "stack" }, ta, h("button", { class: "btn primary full", onclick: function () { if (ta.value.trim()) logEvent("note", { text: ta.value.trim() }); }, text: "Enregistrer la note" })));
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
    // Glisser à gauche ou à droite pour changer de jour, de semaine ou de mois
    (function (el) {
      var x0 = null, y0 = 0, mode = null;
      el.addEventListener("pointerdown", function (ev) { if (ev.button || ev.target.closest(".swipe")) return; x0 = ev.clientX; y0 = ev.clientY; mode = null; });
      el.addEventListener("pointermove", function (ev) {
        if (x0 == null || mode) return;
        var mx = ev.clientX - x0, my = ev.clientY - y0;
        if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { x0 = null; return; }
        if (Math.abs(mx) > 60) { mode = "h"; x0 = null; journalShift(mx < 0 ? 1 : -1); }
      });
      el.addEventListener("pointerup", function () { x0 = null; });
      el.addEventListener("pointercancel", function () { x0 = null; });
    })(body);

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
        isParent ? h("button", { class: "btn full", onclick: function () { openSheet("Ajouter un enfant", familyForm(addChild, { childOnly: true })); }, text: "Ajouter un enfant" }) : null),
      h("section", { class: "card" }, h("b", { class: "title-m", text: "Membres" }),
        S.members.map(function (m) { return h("div", { class: "member" }, h("span", { class: "avatar", text: initials(S.profiles[m.user_id]) }), h("span", { class: "grow", text: S.profiles[m.user_id] + (m.user_id === S.user.id ? " (vous)" : "") }), h("span", { class: "role", text: roleLbl[m.role] })); })),
      isParent ? h("section", { class: "card green" }, h("b", { class: "title-m", text: "Inviter quelqu'un" }), invite) : null,
      agendaSection(),
      h("section", { class: "card" }, h("b", { class: "title-m", text: "Cet appareil" }),
        h("a", { href: "#/installer", class: "btn full", text: isStandalone() ? "App installée ✓" : "Installer sur l'écran d'accueil" }),
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
    else content = h("ol", { class: "steps" }, steps[b].map(function (s, i) { return h("li", null, h("span", { class: "n", text: i + 1 }), h("span", { class: "t" }, h("b", { text: s[0] }), h("span", { text: s[1] }))); }));
    mount(h("main", { class: "screen plain" },
      h("a", { href: "#/", class: "row small", vars: { "text-decoration": "none", "font-weight": "650" } }, icon("back", 18), "Retour"),
      h("div", { class: "row" }, logo(), h("h1", { class: "title-l", text: "Mettez Gloups sur l'écran d'accueil" })),
      h("p", { class: "muted", text: "Une seule fois, 30 secondes. Ensuite Gloups s'ouvre en plein écran, déjà connecté." }),
      h("span", { class: "small muted", text: "Détecté : " + names[b] }), seg, content,
      S.family ? h("div", { class: "card ok small", text: "Votre famille est déjà enregistrée : depuis l'icône, vous retrouvez tout." }) : null,
      h("button", { class: "btn ghost", onclick: function () { lsSet("gloups.installHidden", "1"); location.hash = "#/"; }, text: "Plus tard, continuer dans le navigateur" })));
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); S.deferredInstall = e; });

  /* ---------- Navigation ---------- */
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
    var r = location.hash.replace(/^#\/?/, "");
    var key = (S.child ? S.child.id : "") + "/" + r;
    ENTER = key !== lastKey;
    var prevIdx = TAB_IDX[lastKey ? lastKey.split("/")[1] : null];
    lastKey = key;
    if (r === "journal") screenJournal();
    else if (r === "tendances") screenTrends();
    else if (r === "famille") screenFamily();
    else if (r === "installer") screenInstall();
    else screenHome();
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
  setInterval(function () { if (!sheetRoot.firstChild && (location.hash === "" || location.hash === "#/")) route(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && S.user) refresh(); });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});

  boot();
})();

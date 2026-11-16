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
    dots: "M5 12h.01M12 12h.01M19 12h.01"
  };
  function icon(name, size) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("width", size || 22); s.setAttribute("height", size || 22); s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", name === "dots" ? "3.2" : "2");
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
    events: [], loading: true, channel: null, tick: null,
    deferredInstall: null
  };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- Rendu ---------- */
  var appEl = document.getElementById("app");
  var sheetRoot = document.getElementById("sheet-root");
  var toastRoot = document.getElementById("toast-root");
  function mount(node) { appEl.replaceChildren(node); window.scrollTo(0, 0); }

  var toastTimer = null;
  function toast(msg, opts) {
    opts = opts || {};
    clearTimeout(toastTimer);
    var t = h("div", { class: "toast" + (opts.error ? " err" : "") }, h("span", { class: "grow", text: msg }),
      opts.action ? h("button", { onclick: function () { toastRoot.replaceChildren(); opts.action.fn(); }, text: opts.action.label }) : null);
    toastRoot.replaceChildren(t);
    toastTimer = setTimeout(function () { toastRoot.replaceChildren(); }, opts.error ? 6000 : 5000);
  }

  function closeSheet() { sheetRoot.replaceChildren(); }
  function openSheet(title, body) {
    var sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "grab" }),
      h("div", { class: "row between" }, h("h2", { class: "title-m", text: title }), h("button", { class: "btn ghost small", onclick: closeSheet, text: "Fermer" })),
      body);
    var bd = h("div", { class: "backdrop", onclick: function (e) { if (e.target === bd) closeSheet(); } }, sheet);
    sheetRoot.replaceChildren(bd);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

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
    var since = new Date(startOfDay(new Date()).getTime() - 7 * 86400000).toISOString();
    var r = await sb.from("events").select("*").eq("child_id", S.child.id).is("deleted_at", null)
      .or("started_at.gte." + since + ",ended_at.is.null").order("started_at", { ascending: false }).limit(500);
    if (r.error) throw r.error;
    S.events = r.data || [];
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
      try { await loadEvents(); route(); } catch (e) { /* hors ligne : on garde l'affichage */ }
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
        emailBlock(),
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
    var lastBreast = S.events.find(function (e) { return e.type === "feed.breast"; });
    var suggested = lastBreast ? (lastBreast.data.side === "left" ? "right" : lastBreast.data.side === "right" ? "left" : null) : null;
    var sleepMin = evToday.filter(function (e) { return e.type === "sleep"; }).reduce(function (s, e) {
      var a = Math.max(new Date(e.started_at).getTime(), today), b = e.ended_at ? new Date(e.ended_at).getTime() : Date.now();
      return s + Math.max(0, b - a) / 60000;
    }, 0);
    var canWrite = S.role === "parent" || S.role === "proche";

    var lives = running().map(function (ev) {
      var t = h("div", { class: "time", "data-start": ev.started_at, text: clock((Date.now() - new Date(ev.started_at)) / 1000) });
      var actions = h("div", { class: "actions" });
      if (canWrite) {
        if (ev.type === "feed.breast" && ev.data.side !== "both") actions.append(h("button", { class: "btn light", onclick: async function () {
          var stopped = await stopEvent(ev); if (!stopped) return;
          await logEvent("feed.breast", { side: ev.data.side === "left" ? "right" : "left" }, { running: true });
        }, text: "Changer de côté" }));
        actions.append(h("button", { class: "btn light", onclick: function () { stopEvent(ev).then(function (x) { if (x) toast(label(x) + " · " + dur((new Date(x.ended_at) - new Date(x.started_at)) / 60000)); }); }, text: ev.type === "sleep" ? "Il se réveille" : "Terminer" }));
      }
      return h("section", { class: "live", "aria-label": "En cours" },
        h("div", { class: "head" }, h("span", { text: label(ev) + " en cours" }), h("span", { class: "since", text: "depuis " + hhmm(ev.started_at) + " · " + (S.profiles[ev.created_by] || "") })),
        t, actions);
    });

    var tile = function (k, color, v, s, onclick) {
      return h("button", { class: "tile", onclick: onclick, disabled: !canWrite },
        h("span", { class: "k", vars: { color: color }, text: k }), h("span", { class: "v", text: v }), h("span", { class: "s", text: s }));
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
      lives,
      h("section", { class: "stack", vars: { gap: "8px" } },
        h("span", { class: "eyebrow", text: "Depuis le dernier" }),
        h("div", { class: "tiles" },
          tile("Repas", CAT_COLOR.repas, lastFeed ? ago(lastFeed.ended_at || lastFeed.started_at) : "-", lastFeed ? label(lastFeed).replace("Tétée ", "sein ") : "aucun", function () { sheetFeed(); }),
          tile("Couche", CAT_COLOR.couche, lastDiaper ? ago(lastDiaper.started_at) : "-", lastDiaper ? (lastDiaper.data.poo ? "selles" : "pipi") : "aucune", function () { sheetDiaper(); }),
          tile("Sommeil", CAT_COLOR.sommeil, sleeping ? dur((Date.now() - new Date(sleeping.started_at)) / 60000) : lastSleep ? ago(lastSleep.ended_at || lastSleep.started_at) : "-", sleeping ? "il dort" : lastSleep ? "éveillé" : "aucun", function () { sheetSleep(); }))),
      h("section", { class: "card" },
        h("div", { class: "row between" }, h("span", { class: "eyebrow", text: "Aujourd'hui" }), h("a", { href: "#/journal", class: "small", text: "Journal" })),
        h("div", { class: "counts" },
          h("div", null, h("b", { text: evToday.filter(function (e) { return CAT[e.type] === "repas" && e.type !== "feed.pump"; }).length }), h("span", { vars: { color: CAT_COLOR.repas }, text: "repas" })),
          h("div", null, h("b", { text: evToday.filter(function (e) { return e.type === "diaper" && e.data.pee; }).length }), h("span", { vars: { color: CAT_COLOR.couche }, text: "mouillées" })),
          h("div", null, h("b", { text: evToday.filter(function (e) { return e.type === "diaper" && e.data.poo; }).length }), h("span", { vars: { color: CAT_COLOR.couche }, text: "selles" })),
          h("div", null, h("b", { text: dur(sleepMin).replace(NB + "h" + NB, "h") }), h("span", { vars: { color: CAT_COLOR.sommeil }, text: "sommeil" }))),
        h("div", { class: "list" }, recent.length ? recent.map(function (e) { return eventRow(e, canWrite); }) : h("span", { class: "empty", text: "Pas encore de saisie. Utilisez les boutons en bas." }))),
      !isStandalone() && !lsGet("gloups.installHidden") ? h("a", { href: "#/installer", class: "card ok", vars: { "text-decoration": "none" } }, h("b", { text: "Installer Gloups sur l'écran d'accueil" }), h("span", { class: "small", text: "Plein écran, plus rapide, un tap pour noter." })) : null
    ));
    appEl.append(dock("home", canWrite, suggested));
  }

  function eventRow(e, canWrite) {
    var d = evDuration(e);
    return h("div", { class: "item" },
      h("span", { class: "when", text: hhmm(e.started_at) }),
      h("span", { class: "badge", vars: { background: CAT_COLOR[CAT[e.type]] || "#888" } }),
      h("span", { class: "what" }, h("b", { text: label(e) }), h("span", { text: [e.ended_at ? d : "en cours", S.profiles[e.created_by] ? "par " + S.profiles[e.created_by] : null].filter(Boolean).join(" · ") })),
      canWrite ? h("button", { class: "del", "aria-label": "Supprimer " + label(e), onclick: function () { removeEvent(e); } }, icon("trash", 18)) : null);
  }

  function dock(active, canWrite, suggested) {
    var q = function (cls, txt, lbl, fn, tag) {
      return h("button", { class: "q " + cls, onclick: fn, disabled: !canWrite },
        tag ? h("span", { class: "tag", text: tag }) : null,
        h("span", { class: "ic", text: txt }), h("span", { class: "lbl", text: lbl }));
    };
    var startBreast = function (side) {
      return async function () {
        var cur = running().find(function (e) { return e.type === "feed.breast"; });
        if (cur) { await stopEvent(cur); }
        logEvent("feed.breast", { side: side }, { running: true });
      };
    };
    var quick = h("div", { class: "quick" },
      q("repas", "G", "Sein G", startBreast("left"), suggested === "left" ? "suggéré" : null),
      q("repas", "D", "Sein D", startBreast("right"), suggested === "right" ? "suggéré" : null),
      q("repas", "", "Biberon", sheetBottle),
      q("couche", "", "Couche", sheetDiaper),
      q("sommeil", "", "Sommeil", sheetSleep),
      q("plus", "", "Plus", sheetPlus));
    quick.children[2].querySelector(".ic").append(icon("bottle", 22));
    quick.children[3].querySelector(".ic").append(icon("drop", 22));
    quick.children[4].querySelector(".ic").append(icon("moon", 22));
    quick.children[5].querySelector(".ic").append(icon("plus", 22));
    var tab = function (href, txt, key) { return h("a", { href: href, "aria-current": active === key ? "page" : null, text: txt }); };
    return h("div", { class: "dock-wrap" }, h("nav", { class: "dock", "aria-label": "Saisie rapide et navigation" },
      active === "home" ? quick : null,
      h("div", { class: "tabs" }, tab("#/", "Aujourd'hui", "home"), tab("#/journal", "Journal", "journal"), tab("#/famille", "Famille", "famille"))));
  }

  function childSwitcher() {
    openSheet("Changer d'enfant", h("div", { class: "stack" }, S.children.map(function (c) {
      return h("button", { class: "btn full", vars: { "justify-content": "flex-start" }, onclick: async function () { S.child = c; lsSet("gloups.child", c.id); closeSheet(); await loadEvents(); route(); } },
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
    closeSheet(); return true;
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

  /* ---------- Écran : journal ---------- */
  function screenJournal() {
    var canWrite = S.role === "parent" || S.role === "proche";
    var groups = {};
    S.events.forEach(function (e) { var k = startOfDay(e.started_at).getTime(); (groups[k] = groups[k] || []).push(e); });
    var keys = Object.keys(groups).sort(function (a, b) { return b - a; });
    mount(h("main", { class: "screen" },
      h("span", { class: "eyebrow", text: S.child ? S.child.first_name + " · 7 derniers jours" : "" }),
      h("h1", { class: "title-l", text: "Journal" }),
      keys.length ? keys.map(function (k) {
        return h("section", { class: "card" }, h("b", { class: "title-m", text: dayLabel(+k) }),
          h("div", { class: "list" }, groups[k].map(function (e) { return eventRow(e, canWrite); })));
      }) : h("p", { class: "empty", text: "Rien sur les 7 derniers jours." })));
    appEl.append(dock("journal", canWrite));
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
    if (r === "journal") screenJournal();
    else if (r === "famille") screenFamily();
    else if (r === "installer") screenInstall();
    else screenHome();
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

/* Gloups · service worker : l'app s'ouvre même hors connexion. Les données passent toujours par le réseau. */
var VERSION = "gloups-0.10.0";
var SHELL = ["./", "index.html", "css/app.css", "js/config.js", "js/supabase.js", "js/app.js", "manifest.webmanifest",
  "fonts/google-sans-flex.woff2", "icons/icon.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API Supabase : jamais en cache
  // Sons : lecture directe par le navigateur (requêtes partielles), jamais via le cache
  if (url.pathname.indexOf("/audio/") >= 0 || req.headers.has("range")) return;
  if (req.mode === "navigate") {
    // page : réseau d'abord (nouvelle version), cache si hors ligne
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put("index.html", copy); }); return res;
    }).catch(function () { return caches.match("index.html"); }));
    return;
  }
  // fichiers de l'app : réseau d'abord pour rester à jour, cache en secours
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () { return caches.match(req); }));
});

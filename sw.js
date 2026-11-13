// Service worker de l'application « Recettes de famille » (GitHub Pages).
// - la page (index.html) : réseau d'abord, pour avoir toujours la dernière version ; copie en cache si pas de réseau ;
// - le reste (photos, scripts, logo, police) : cache d'abord, rempli au fur et à mesure ;
// - après l'installation, toutes les photos sont téléchargées en arrière-plan pour cuisiner sans connexion.
// Changer VERSION vide les anciens caches.
const VERSION = "recettes-v1";
const BASE = [
  "./", "index.html", "manifest.webmanifest",
  "lib/d3.min.js", "lib/topojson.min.js",
  "data/pays.js", "data/terre.js", "data/france.js",
  "logo/logo-site.svg", "logo/icone-192.png", "logo/icone-512.png", "logo/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// la page envoie la liste des photos : on les met en cache, sans bloquer
self.addEventListener("message", e => {
  if (e.data && e.data.type === "photos") {
    caches.open(VERSION).then(async c => {
      for (const url of e.data.liste) {
        if (!(await c.match(url))) { try { await c.add(url); } catch (_) {} }
      }
    });
  }
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const memeSite = url.origin === location.origin;
  const police = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!memeSite && !police) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { const copie = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copie)); return r; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(enCache => enCache || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const copie = r.clone(); caches.open(VERSION).then(c => c.put(req, copie)); }
      return r;
    }))
  );
});

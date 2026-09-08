const CACHE = "campo-livre-v3";

const SHELL = [
  "/",
  "/court",
  "/info",
  "/manifest.json",
  "/css/styles.css",
  "/js/config.js",
  "/js/utils.js",
  "/js/court.js",
  "/js/dashboard.js",
  "/images/pig.svg",
  "/images/app_icon_192.png",
  "/images/app_icon_512.png",
  "/images/icon_map.svg",
  "/images/icon_car.svg",
  "/images/icon_ball.svg",
  "/images/icon_fall.svg",
  "/images/icon_death.svg",
  "/images/icon_run.svg",
  "/images/icon_back.svg",
  "/images/icon_info.svg",
  "/images/icon_list.svg",
  "/images/icon_app.svg",
  "/images/icon_mail.svg",
  "/images/icon_siren.svg",
  "/images/icon_refresh.svg",
  "/images/icon_flag.svg",
  "/images/flag_aveiro.svg",
  "/images/flag_vagos.svg",
  "/images/flag_ilhavo.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

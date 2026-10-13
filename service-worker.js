const CACHE_NAME = 'rose-star-cache-v33';
const CACHE_ASSETS = [
    './index.html',
    './admin.html',
    './css/styles.css',
    './js/app.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/lv1.png',
    './assets/lv2.png',
    './assets/lv3.png',
    './assets/lv4.png',
    './assets/lv5.png',
    './assets/lv6.png',
    './assets/lv7.png',
    './assets/lv8.png',
    './assets/lv9.png',
    './assets/lv10.png',
    './assets/lv11.png',
    './assets/lv12.png',
    './assets/lv13.png',
    './assets/lv14.png',
    './assets/lv15.png',
    './assets/lv16.png',
    './assets/lv17.png',
    './assets/lv18.png',
    './assets/lv19.png',
    './assets/lv20.png',
    './assets/lv21.png',
    './assets/lv22.png',
    './assets/lv23.png',
    './assets/lv24.png',
    './assets/lv25.png',
    './assets/lv26.png',
    './assets/lv27.png',
    './assets/lv28.png',
    './assets/lv29.png',
    './assets/lv30.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// 混合快取策略：
// - HTML 導航請求：Network-first（優先取得最新版，網路失敗才回退快取）
// - 靜態資源：Stale-While-Revalidate（先顯示快取，背景更新）
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const isHtmlNavigation = req.mode === 'navigate' ||
        (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

    if (isHtmlNavigation) {
        // Network-first：優先從網路取得最新 HTML
        event.respondWith(
            fetch(req)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    // Stale-While-Revalidate：先回傳快取，背景更新快取
    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                }
                return networkResponse;
            }).catch(() => cached);
            return cached || networkFetch;
        })
    );
});

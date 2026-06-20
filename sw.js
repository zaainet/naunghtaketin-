const CACHE_NAME = 'naunghtaketin-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install - Essential ဖိုင်များကို Cache လုပ်ခြင်း
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.log('Cache install error:', err))
  );
});

// Activate - Cache အဟောင်းများကို ရှင်းလင်းခြင်း
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

 // Fetch - API requests များကို ကျော်ပြီး Static များကို Cache ပေးရန်
self.addEventListener('fetch', event => {
  // API URL ၂ ခုလုံး ပါဝင်နေလျှင် Cache မလုပ်ဘဲ တိုက်ရိုက် Network ကသွားစေရန် တားဆီးခြင်း
  if (event.request.url.includes('sheetdb.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});


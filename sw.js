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

// Fetch - API အတွက် Network Only / တခြား assets များအတွက် Cache First
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // SheetDB API Requests များကို Cache မလုပ်ဘဲ Network ကနေပဲ တိုက်ရိုက်သွားစေရန် (POST ရော GET ရော စိတ်ချရအောင်)
  if (url.href.includes('sheetdb.io')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // လိုင်းလုံးဝမရှိလျှင် Loading screen မှာပဲ ရပ်မနေစေဘဲ အဟောင်းရှိက ပြရန် သို့မဟုတ် error ကျော်ရန်
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static Assets (HTML, CDN CSS, JS, Fonts) - Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached; // Cache ထဲရှိလျှင် တိုက်ရိုက်ထုတ်ပေးမည်
      
      return fetch(event.request).then(response => {
        // Response မမှန်ကန်လျှင် Cache ထဲမသိမ်းပဲ ပြန်ပေးမည်
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        // Font သို့မဟုတ် CDN script များကို ပထမအကြိမ်ပွင့်ပြီးကတည်းက နောက်ပိုင်းအတွက် Cache ထဲ သိမ်းထားမည်
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Offline fallback စစ်ဆေးမှု (Error မတက်အောင် ? အမှန်ခြစ် စစ်ထားပါသည်)
      const acceptHeader = event.request.headers.get('accept');
      if (acceptHeader && acceptHeader.includes('text/html')) {
        return caches.match('/');
      }
      return new Response('နောင်ထိပ်တင် ဗေဒင် (Offline)', { status: 404 });
    })
  );
});

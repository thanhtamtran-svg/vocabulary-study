// Service Worker for Push Notifications + Offline Caching

var CACHE_NAME = 'vocab-study-v9';
var STATIC_ASSETS = [
  './',
  './manifest.json',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.svg',
  './icon-512.svg'
];

// Install: cache static assets + pre-cache all JS/CSS from the page
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {});
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// On first activation, pre-cache all JS/CSS chunks from the current page
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'PRECACHE_ASSETS') {
    var urls = event.data.urls || [];
    caches.open(CACHE_NAME).then(function(cache) {
      urls.forEach(function(url) {
        cache.match(url).then(function(cached) {
          if (!cached) {
            fetch(url).then(function(response) {
              if (response.ok) cache.put(url, response);
            }).catch(function() {});
          }
        });
      });
    });
  }
});

// Activate: clean old caches and claim clients
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for static assets, network-first for API calls
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Google Fonts: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone).catch(function() {});
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // API calls (supabase): network-first
  if (url.hostname.includes('supabase') || url.pathname.includes('/functions/') || url.pathname.includes('/rest/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  var isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot)(\?|$)/.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone).catch(function() {});
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});

// Push notification handling
self.addEventListener('push', function(event) {
  var data = {
    title: 'Vocabulary Study',
    body: 'Time to study your German words!',
    icon: './apple-touch-icon.png',
    badge: './favicon.svg',
    tag: 'study-reminder',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      var payload = event.data.json();
      data.title = payload.title || data.title;
      data.body = payload.body || data.body;
      if (payload.url) data.data.url = payload.url;
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      renotify: true,
      requireInteraction: true,
      data: data.data
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes(self.location.origin)) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

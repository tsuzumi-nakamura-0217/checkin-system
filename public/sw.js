self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple network-first fallback or just pass-through
  // Passing through allows standard browser caching to work for standard app behavior.
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Internet connection required.', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }));
});

/* wontech 앱 서비스워커 — 일반 새로고침에도 항상 최신 HTML을 받도록(network-first).
   페이지 요청을 캐시 무시하고 새로 받고, 네트워크 실패 시에만 폴백. 앱 자원 미캐싱(옛 버전 고착 함정 회피). */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req, {cache: 'reload'}).catch(function(){ return fetch(req); }));
  }
});

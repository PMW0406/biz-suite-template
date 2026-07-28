/* 자기소멸 서비스워커 — 예전 cache-first 워커가 오래된 HTML을 계속 서빙하는 문제 제거.
   설치 즉시 활성화 → 모든 캐시 삭제 → 스스로 등록 해제 → 열린 탭을 새로 로드(최신 HTML 수신). */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    try{ var keys = await caches.keys(); await Promise.all(keys.map(function(k){ return caches.delete(k); })); }catch(_){}
    try{ await self.registration.unregister(); }catch(_){}
    try{ var cs = await self.clients.matchAll({type:'window'}); cs.forEach(function(c){ try{ c.navigate(c.url); }catch(_){} }); }catch(_){}
  })());
});
/* fetch 핸들러 없음 — 요청을 가로채지 않으므로 항상 네트워크에서 최신 HTML을 받음 */

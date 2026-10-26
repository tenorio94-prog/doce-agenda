// Avisos do Doce Agenda (O13): só mostra as notificações que a página pede e abre o app ao tocar.
// Não guarda nada em cache nem intercepta requisições; sem "fetch", o site funciona como sem ele.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope).pathname;
    const open = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).find((client) => new URL(client.url).pathname.startsWith(scope));
    return open ? open.focus() : self.clients.openWindow(self.registration.scope);
  })());
});

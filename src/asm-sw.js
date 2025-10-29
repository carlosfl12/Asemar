self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Nuevos datos';
    const body = data.body || '';
    const url = data.url || '/asemar/display';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            data: { url }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification?.data?.url || '/asemar/display';
    event.waitUntil((async () => {
        const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const hit = all.find(c => c.url.includes(url));
        if (hit) return hit.focus();
        return clients.openWindow(url);
    })());
});

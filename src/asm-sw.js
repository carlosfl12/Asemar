self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = event.title || 'Nuevo evento';
    const body = data.body || '';
    const url = data.url || '/display';

    event.waitUntil(
        self.ServiceWorkerRegistration.showNotification(title, {
            body,
            data: { url }
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification?.data?.url || '/display';

    event.waitUntil(
        (async () => {
            const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
            const existing = allClients.find(c => c.url.includes(url));
            if (existing) {
                return existing.focus();
            }
            return clients.openWindow(url);
        })()
    );
});
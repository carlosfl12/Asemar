self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
        let data;
        try { data = event.data && event.data.json(); } catch { }

        if (!data) {
            // si usas “push sin payload”
            try {
                const res = await fetch('/asemar-api/push/poll.php', { cache: 'no-store' });
                if (res.ok) data = await res.json();
            } catch { }
        }

        const title = (data && data.title) || 'Notificación';
        const body = (data && data.body) || '';
        const url = (data && data.url) || 'http://localhost:4200/asemar/transfer'; // fallback a Google

        await self.registration.showNotification(title, {
            body,
            data: { url }
        });
    })());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // URL objetivo (con saneado)
    const raw = (event.notification?.data && event.notification.data.url) || 'http://localhost:4200/asemar/transfer';
    const urlStr = String(raw).trim();

    event.waitUntil((async () => {
        try {
            const target = new URL(urlStr, self.location.origin);
            const isExternal = target.origin !== self.location.origin;

            if (isExternal) {
                // Para orígenes externos: abrir nueva pestaña SIEMPRE
                await clients.openWindow(target.href);
                return;
            }

            const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const c of all) {
                if (c.url === target.href) {
                    await c.focus();
                    return;
                }
            }
            await clients.openWindow(target.href);
        } catch (e) {
            await clients.openWindow('https://www.google.com/');
        }
    })());
});


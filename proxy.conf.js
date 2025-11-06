const PROXY_CONFIG = {
    "/sse": {
        target: "https://demo.esphera.ai",
        secure: true,
        changeOrigin: true,
        logLevel: "debug",
        pathRewrite: {
            "^/sse": "/ws/n8n/signals_to_frontend/sse-server.php"
        },
        onProxyReq: (proxyReq, req, res) => {
            // Headers específicos para SSE
            proxyReq.setHeader('Accept', 'text/event-stream');
            proxyReq.setHeader('Cache-Control', 'no-cache');
            proxyReq.setHeader('Connection', 'keep-alive');
            console.log('[SSE Proxy] Request to:', proxyReq.path);
        },
        onProxyRes: (proxyRes, req, res) => {
            // Forzar headers CORS
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = '*';

            // Importante: No modificar Content-Type ni chunked encoding
            console.log('[SSE Proxy] Response headers:', proxyRes.headers);
        },
        onError: (err, req, res) => {
            console.error('[SSE Proxy] Error:', err);
        },
        timeout: 0,
        proxyTimeout: 0,
        ws: false,
        xfwd: true
    },
    "/send-event": {
        target: "https://demo.esphera.ai",
        secure: true,
        changeOrigin: true,
        logLevel: "debug",
        pathRewrite: {
            "^/send-event": "/ws/n8n/signals_to_frontend/send-event.php"
        }
    }
};

module.exports = PROXY_CONFIG;
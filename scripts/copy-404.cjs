const fs = require('fs');
const path = require('path');
const candidates = [
    path.resolve(__dirname, '../dist/asemar/index.html'),
    path.resolve(__dirname, '../dist/asemar/browser/index.html'),
];
const from = candidates.find(p => fs.existsSync(p));
if (!from) { console.warn('[copy-404] No index.html'); process.exit(0); }
const to = path.resolve(path.dirname(from), '404.html');
fs.copyFileSync(from, to);
console.log('[copy-404] 404.html creado en', to);

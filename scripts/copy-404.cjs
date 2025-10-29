// scripts/copy-404.cjs
const fs = require('fs');
const path = require('path');

// Posibles ubicaciones según config/versión
const candidates = [
    path.resolve(__dirname, '../dist/asemar/index.html'),
    path.resolve(__dirname, '../dist/asemar/browser/index.html'),
];

const from = candidates.find(p => fs.existsSync(p));
if (!from) {
    console.warn('[copy-404] No se encontró index.html en dist/asemar ni dist/asemar/browser. ' +
        '¿Falló el build o cambió outputPath? (continuo sin crear 404.html)');
    process.exit(0); // no romper el pipeline
}

const to = path.resolve(path.dirname(from), '404.html');
fs.copyFileSync(from, to);
console.log(`[copy-404] 404.html creado en ${to}`);

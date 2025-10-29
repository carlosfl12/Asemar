const fs = require('fs');
const path = require('path');
const dist = path.resolve(__dirname, '../dist/asemar');
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
console.log('404.html creado');

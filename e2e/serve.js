// Servidor estático con fallback a index.html para la PWA exportada en dist/.
const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'dist');
const tipos = {
  '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const ruta = decodeURIComponent(req.url.split('?')[0]);
  let archivo = path.join(raiz, ruta);
  if (!archivo.startsWith(raiz) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
    archivo = path.join(raiz, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream' });
  fs.createReadStream(archivo).pipe(res);
}).listen(Number(process.env.PORT) || 8081, () => console.log('PWA en puerto', process.env.PORT || 8081));

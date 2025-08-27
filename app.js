const http = require('http');
const querystring = require('querystring');
const fs = require('fs').promises;
const path = require('path');

const PORT = process.env.PORT || 3000;

/* ------------- Helpers ------------- */

/** Send HTML with UTF-8 headers */
function sendHtml(res, html, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

/** Send plain text with UTF-8 headers */
function sendText(res, text, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

/** Page template (simple, no external CSS) */
function page({ title = 'Servidor de palíndromos', body = '' }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; margin:2rem; line-height:1.55}
      input,button{font:inherit; padding:.5rem .7rem}
      label{display:block; margin:.75rem 0 .35rem}
      .muted{color:#0008}
      code{background:#0001; padding:.1rem .35rem; border-radius:4px}
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

/**
 * Normalize a word for palindrome checking.
 * - lowercases
 * - removes accents/diacritics
 * - removes all non alphanumeric chars (keeps 0-9, a-z)
 */
function normalizeWord(input) {
  const s = String(input ?? '')
    .toLowerCase()
    .normalize('NFD') // split accents
    .replace(/[\u0300-\u036f]/g, ''); // remove diacritics
  return s.replace(/[^a-z0-9]/g, ''); // keep only alphanumerics
}

/** Check if a word is palindrome (after normalization) */
function isPalindrome(word) {
  const n = normalizeWord(word);
  if (!n) return false; // empty not considered palindrome here
  const reversed = n.split('').reverse().join('');
  return n === reversed;
}

/** Append a log line to consultas.txt (creates file if missing) */
async function logQuery(originalWord, result) {
  const logPath = path.resolve(__dirname, 'consultas.txt');
  const line = `El usuario ha comprobado la palabra "${originalWord}" y ${
    result ? 'es' : 'NO es'
  } un palíndromo.\n`;
  await fs.appendFile(logPath, line, 'utf8');
}

/* ------------- Server ------------- */

const server = http.createServer(async (req, res) => {
  try {
    // Only GET is needed for the exercise
    if (req.method !== 'GET') {
      return sendText(res, 'Method Not Allowed', 405);
    }

    // Parse URL and query params
    const [ pathname = '/', queryString = '' ] = req.url.split('?');
    const query = querystring.parse(queryString.replace(/^\?/, ''));

    // Route: root -> HTML form
    if (pathname === '/') {
      const html = page({
        title: 'Comprobar palíndromo',
        body: `
          <h1>Comprobar palíndromo</h1>
          <p class="muted">Este formulario envía una petición <code>GET</code> al endpoint <code>/comprobar</code>.</p>
          <form action="/comprobar" method="GET">
            <label for="palabra">Palabra</label>
            <input id="palabra" name="palabra" type="text" required autocomplete="off" />
            <button type="submit">Comprobar</button>
          </form>
          <p class="muted">Ejemplos: radar, reconocer, “Anita lava la tina”, “Sé verlas al revés”.</p>
        `
      });
      return sendHtml(res, html);
    }

    // Route: /comprobar -> plain text
    if (pathname === '/comprobar') {
      const palabraRaw =
        query?.palabra != null ? String(query.palabra).trim() : '';

      if (!palabraRaw) {
        return sendText(
          res,
          'Falta el parámetro "palabra". Ejemplo: /comprobar?palabra=radar',
          400
        );
      }

      const resultado = isPalindrome(palabraRaw);
      const mensaje = `La palabra ${palabraRaw} ${
        resultado ? 'es' : 'NO es'
      } un palíndromo`;

      // BONUS: persist the query
      try {
        await logQuery(palabraRaw, resultado);
      } catch (err) {
        // Do not fail the request because of logging; just note it
        console.error('[logQuery] Error:', err.message || err);
      }

      return sendText(res, mensaje);
    }

    // Fallback 404
    const html = page({
      title: '404',
      body: `<h1>404 - Ruta no encontrada</h1><p><a href="/">Volver</a></p>`
    });
    return sendHtml(res, html, 404);
  } catch (err) {
    console.error('[Server Error]', err);
    return sendText(res, 'Error interno del servidor', 500);
  }
});

server.listen(PORT, () => {
  console.log(`Servidor de palíndromos en http://localhost:${PORT}`);
});
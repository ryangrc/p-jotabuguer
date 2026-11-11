const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function safePath(urlPath) {
  const requested = decodeURIComponent(urlPath.split("?")[0]);
  const filePath = requested === "/" ? "/index.html" : requested;
  const resolved = path.normalize(path.join(root, filePath));
  return resolved.startsWith(root) ? resolved : path.join(root, "index.html");
}

const server = http.createServer((request, response) => {
  const file = safePath(request.url || "/");
  fs.readFile(file, (error, content) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          response.writeHead(404);
          response.end("Arquivo nao encontrado.");
          return;
        }
        response.writeHead(200, { "Content-Type": types[".html"] });
        response.end(fallback);
      });
      return;
    }

    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log(`P'Jota Buguer rodando em http://localhost:${port}`);
});

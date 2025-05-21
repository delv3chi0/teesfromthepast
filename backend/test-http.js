const http = require('http');
const PORT = 5002;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from basic HTTP server\n');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Basic HTTP server listening on port ${PORT}`);
});

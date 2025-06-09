const http = require('http');

const server = http.createServer((req, res) => {
  console.log("➡️ Received request");
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: "Hello from raw Node" }));
});

server.listen(5000, () => {
  console.log("✅ Raw Node server running on port 5000");
});

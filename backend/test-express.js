const express = require('express');
const app = express();
const PORT = 5001;

app.get('/test-get', (req, res) => {
  console.log('✅ /test-get hit in test-express!');
  res.send('Test GET hit in test-express');
});

app.post('/test-post', (req, res) => {
  console.log('✅ /test-post hit in test-express!');
  res.send('Test POST hit in test-express');
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Test Express app listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Express server error:', err);
});

server.on('close', () => {
  console.log('Express server closed.');
});

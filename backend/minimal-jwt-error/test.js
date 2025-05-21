require('dotenv').config();
console.log('✅ JWT_SECRET in minimal app:', process.env.JWT_SECRET);
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/hello', (req, res) => {
  res.send('Hello from the minimal app!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

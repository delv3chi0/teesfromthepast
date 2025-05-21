require('dotenv').config();
console.log('✅ JWT_SECRET in minimal app:', process.env.JWT_SECRET); // <-- ADD THIS LINE
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;

app.post('/test-jwt', (req, res) => {
  try {
    const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    console.error("JWT Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

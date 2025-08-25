/**
 * Request ID middleware using nanoid.
 * Requires dependency: nanoid
 */
const { nanoid } = require('nanoid');

function generateId() {
  return nanoid(10); // 10-char id
}

module.exports = function requestId(req, res, next) {
  const id = generateId();
  req.id = id;
  res.setHeader('X-Req-Id', id);
  next();
};

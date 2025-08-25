// Central constants (safe defaults)
const JSON_BODY_LIMIT_MB = parseInt(process.env.JSON_LIMIT_MB || '25', 10);
const MAX_PRINTFILE_DECODED_MB = parseInt(process.env.PRINTFILE_MAX_MB || '22', 10);
const REQUEST_ID_HEADER = 'X-Req-Id';

module.exports = {
  JSON_BODY_LIMIT_MB,
  MAX_PRINTFILE_DECODED_MB,
  REQUEST_ID_HEADER
};

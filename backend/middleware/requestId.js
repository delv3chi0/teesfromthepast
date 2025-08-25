import { nanoid } from "nanoid";
import { REQUEST_ID_HEADER } from "../config/constants.js";

export function requestId(req, res, next) {
  const id = nanoid(10);
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

export default requestId;

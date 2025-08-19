// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ACCESS_TOKEN_AUDIENCE = "tftp-api";
const ACCESS_TOKEN_ISSUER = "tftp-auth";

export const signAccessToken = (userId) =>
  jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET,
    {
      expiresIn: "4h",
      audience: ACCESS_TOKEN_AUDIENCE,
      issuer: ACCESS_TOKEN_ISSUER,
    }
  );

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token; // supported but not required
  }

  if (!token) return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      audience: ACCESS_TOKEN_AUDIENCE,
      issuer: ACCESS_TOKEN_ISSUER,
    });
    const userId = decoded?.sub;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(401).json({ message: "Not authorized, user not found" });

    req.user = user; // attach full user doc (without password)
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export { protect };

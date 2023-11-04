import jwt from "jsonwebtoken";
// import { NextResponse } from "next/server";

export default async function handler(req, res, next) {
  const token = req.headers["x-auth-token"];

  //Check if no token
  if (!token) {
    res.status(401).json({ errors: [{ msg: "No Token!" }] });
  }

  // Verify Token

  try {
    const decoded = jwt.verify(
      token,
      process.env.NODE_ENV !== "production"
        ? process.env.jwtSecret_DEV.toString()
        : process.env.jwtSecret_PROD.toString()
    );
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ errors: [{ msg: "Token is not valid" }] });
  }
}

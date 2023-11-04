import jwt from "jsonwebtoken";
// const config = require('config');

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

    res.headers.append("Access-Control-Allow-Credentials", "true");
    res.headers.append("Access-Control-Allow-Origin", "*"); // replace this your actual origin
    res.headers.append(
      "Access-Control-Allow-Methods",
      "GET,DELETE,PATCH,POST,PUT"
    );
    res.headers.append(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );
    next();
  } catch (error) {
    res.status(401).json({ errors: [{ msg: "Token is not valid" }] });
  }
}

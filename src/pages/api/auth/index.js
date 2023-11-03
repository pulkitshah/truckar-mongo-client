import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import dbConnect from "../../../lib/dbConnect";
import User from "../../../models/User";
import auth from "../../../middleware";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        try {
          const user = await User.findById(req.user).select("-password");
          res.json(user, {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          });
        } catch (error) {
          console.log(error.message);
          res.status(500).send("Server Error");
        }
      });
      break;

    case "POST":
      const { email, password } = req.body;
      try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
          return res
            .status(400)
            .json({ errors: [{ msg: "User does not exist." }] });
        }

        // Check Password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(400).json({ errors: [{ msg: "Wrong Password" }] });
        }

        // Return JSON Webtoken
        const payload = {
          user,
        };

        jwt.sign(
          payload,
          process.env.NODE_ENV !== "production"
            ? process.env.jwtSecret_DEV.toString()
            : process.env.jwtSecret_PROD.toString(),
          { expiresIn: 36000 },
          (err, token) => {
            if (err) throw err;
            res.json({ accessToken: token, user });
          }
        );
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
      }
      break;

    case "PATCH":
      const updates = Object.keys(req.body);

      try {
        const user = await User.findOne({
          _id: req.user.id,
        });

        updates.forEach((update) => (user[update] = req.body[update]));

        if (req.body.password) {
          // Encrypt Password
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(req.body.password, salt);
        }

        await user.save();

        res.send(user);
      } catch (error) {
        console.log(error);
        // res.status(400).send(error);
      }
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

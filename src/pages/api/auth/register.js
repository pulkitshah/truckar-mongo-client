import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dbConnect from "../../../lib/dbConnect";
import User from "../../../models/User";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      const { name, email, password, mobile } = req.body;
      try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
          return res
            .status(400)
            .json({ errors: [{ msg: "User already exists by that email" }] });
        }

        //   user = await User.findOne({ mobile });
        //   if (user) {
        //     return res.status(400).json({
        //       errors: [{ msg: 'User already exists by that mobile number' }],
        //     });
        //   }

        user = new User({
          name,
          email,
          mobile,
          password,
          onBoardingRequired: true,
        });

        user.createdBy = user._id;
        console.log(user.toJSON());
        // Encrypt Password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Return JSON Webtoken

        const payload = {
          user: {
            id: user.id,
          },
        };

        jwt.sign(
          payload,
          process.env.NODE_ENV !== "production"
            ? process.env.MONGODB_URI_DEV.toString()
            : // : process.env.mongoURI_STAG.toString(),
              process.env.MONGODB_URI_PROD.toString(),
          { expiresIn: 36000 },
          (err, token) => {
            if (err) throw err;
            res.json({ token });
          }
        );
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}

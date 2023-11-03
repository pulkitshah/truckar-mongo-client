import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import dbConnect from "../../../lib/dbConnect";
import User from "../../../models/User";
import Account from "../../../models/Account";
import auth from "../../../middleware";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      try {
        let accounts = [];

        const user = await User.findOne({
          _id: req.query.id,
        });

        await Promise.all(
          user.accounts.map(async (account) => {
            let acc = await Account.findOne({
              _id: account.account,
            });

            accounts.push(acc);
          })
        );

        res.json(accounts);
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
      }
      break;

    case "PATCH":
      auth(req, res, async () => {
        console.log("API Hit");
        const updates = Object.keys(req.body);
        try {
          const account = await Account.findOne({
            _id: req.query.id,
          });

          updates.forEach((update) => (account[update] = req.body[update]));

          await account.save();

          res.send(account);
        } catch (error) {
          console.log(error);
          // res.status(400).send(error);
        }
      });

      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}

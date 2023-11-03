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
    case "POST":
      try {
        // Get fields
        const accountFields = {};
        accountFields.user = req.user.id;

        if (req.body.name) accountFields.name = req.body.name;
        if (req.body.orderExpensesSettings)
          accountFields.orderExpensesSettings = req.body.orderExpensesSettings;
        if (req.body.lrSettings) accountFields.lrSettings = req.body.lrSettings;
        if (req.body.taxOptions) accountFields.taxOptions = req.body.taxOptions;
        if (req.body.lrFormat) accountFields.lrFormat = req.body.lrFormat;
        if (req.body.invoiceFormat)
          accountFields.invoiceFormat = req.body.invoiceFormat;

        try {
          // Create
          account = new Account(accountFields);
          await account.save();
          res.send(account);
        } catch (error) {
          console.log(error.message);
          res.status(500).send("Server Error");
        }
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

import dbConnect from "../../../../lib/dbConnect";
import Invoice from "../../../../models/Invoice";
import auth from "../../../../auth";
import { lookups } from "../index";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        try {
          let matches = { _id: new mongoose.Types.ObjectId(req.query.id) };

          let query = [
            // filter the results by our accountId
            {
              $match: Object.assign(matches),
            },
          ];

          query = [...query, ...lookups];

          const invoices = await Invoice.aggregate(query);

          if (!invoices) {
            res.status(400).json({
              errors: [{ msg: "There are no invoices by this user" }],
            });
          }

          // console.log(response[0]);
          res.json(invoices[0]);
        } catch (error) {
          console.log(error.message);
          res.status(500).send("Server Error");
        }
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

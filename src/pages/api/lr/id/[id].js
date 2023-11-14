import mongoose from "mongoose";
import dbConnect from "../../../../lib/dbConnect";
import Order from "../../../../models/Order";
import auth from "../../../../auth";
import { lookups } from "../index";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { deliveryId, orderId } = JSON.parse(req.query.id);
        try {
          let matches = { _id: new mongoose.Types.ObjectId(orderId) };

          let query = [
            // filter the results by our accountId
            {
              $match: Object.assign(matches),
            },
          ];

          query = [...query, ...lookups];

          const lrs = await Order.aggregate(query);
          res.json(lrs.find((lr) => lr.delivery._id === deliveryId));
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

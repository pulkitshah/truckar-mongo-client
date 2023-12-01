import mongoose from "mongoose";
import dbConnect from "../../../../lib/dbConnect";
import Order from "../../../../models/Order";
import Driver from "../../../../models/Driver";
import { lookups } from "../index";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "PATCH":
      const updates = Object.keys(req.body);
      try {
        const order = await Order.findOne({
          _id: req.body._id,
        });

        if (!order) {
          return res.status(404).send("No order to update");
        }

        updates.forEach((update) => (order[update] = req.body[update]));
        await order.save();

        if (req.body.status === "complete") {
          const driver = await Driver.findOne({
            currentOrder: req.body._id,
          });

          driver.currentOrder = null;
          await driver.save();
        }

        // console.log(order);

        const orders = await Order.aggregate([
          {
            $match: Object.assign({
              _id: new mongoose.Types.ObjectId(req.body._id),
            }),
          },
          ...lookups,
        ]);

        res.send(orders[0]);
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

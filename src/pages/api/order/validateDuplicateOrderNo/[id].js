import dbConnect from "../../../../lib/dbConnect";
import Order from "../../../../models/Order";
import auth from "../../../../auth";
import { getFiscalYearTimestamps } from "../../../../utils/get-fiscal-year";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { account, saleDate, orderNo } = JSON.parse(req.query.id);
        try {
          let timestamps = getFiscalYearTimestamps(saleDate);
          const query = {
            account: account,
            orderNo: orderNo,
            saleDate: {
              $gte: timestamps.current.start,
              $lte: timestamps.current.end,
            },
          };
          const order = await Order.findOne(query);
          console.log(order);

          res.json(order);
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

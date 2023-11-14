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
        const {
          account,
          startRow,
          endRow,
          filter = {},
          sort = { saleDate: -1, orderNo: -1 },
        } = JSON.parse(req.query.id);

        let matches = { account: new mongoose.Types.ObjectId(account) };

        let query = [
          // filter the results by our accountId
          {
            $match: Object.assign(matches),
          },
          {
            $match: {
              transporter: {
                $exists: true,
              },
            },
          },
        ];

        // filter according to filterModel object
        if (filter.orderNo) {
          const orderNoQuery = createFilterAggPipeline({
            orderNo: filter.orderNo,
          });
          query.push(orderNoQuery[0]);
        }

        if (filter.customer) {
          const customerQuery = createFilterAggPipeline({
            customer: filter.customer,
          });
          query.push(customerQuery[0]);
        }

        if (filter.vehicleNumber) {
          const vehicleNumberQuery = createFilterAggPipeline({
            vehicleNumber: filter.vehicleNumber,
          });
          query.push(vehicleNumberQuery[0]);
        }

        query = [...query, ...lookups];

        if (sort) {
          // maybe we want to sort by blog title or something
          query.push({ $sort: sort });
        }

        query.push(
          {
            $group: {
              _id: null,
              // get a count of every result that matches until now
              count: { $sum: 1 },
              // keep our results for the next operation
              results: { $push: "$$ROOT" },
            },
          },
          // and finally trim the results to within the range given by start/endRow
          {
            $project: {
              count: 1,
              rows: { $slice: ["$results", startRow, endRow] },
            },
          }
        );

        const orders = await Order.aggregate(query);
        res.json(orders);
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

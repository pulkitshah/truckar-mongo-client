import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import { lookups } from ".";

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

        // if (!(accountId instanceof mongoose.Types.ObjectId)) {
        //   throw new Error("accountId must be ObjectId");
        // } else if (typeof startRow !== "number") {
        //   throw new Error("startRow must be number");
        // } else if (typeof endRow !== "number") {
        //   throw new Error("endRow must be number");
        // }

        let matches = { account: new mongoose.Types.ObjectId(account) };

        let query = [
          // filter the results by our accountId
          {
            $match: Object.assign(matches),
          },
          { $unwind: "$deliveries" },
        ];

        if (filter.organisation) {
          query.push({
            $match: {
              "deliveries.lr.organisation": { $in: filter.organisation.values },
            },
          });
        }

        query = [...query, ...lookups];

        // filter according to filterModel object
        if (filter.lrNo) {
          const lrNoQuery = createFilterAggPipeline({ lrNo: filter.lrNo });
          query.push(lrNoQuery[0]);
        }

        // console.log(query);

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

        const lrs = await Order.aggregate(query);
        res.json(lrs);
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

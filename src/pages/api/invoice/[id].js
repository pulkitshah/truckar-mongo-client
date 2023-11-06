import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Invoice from "../../../models/Invoice";
import auth from "../../../auth";
import createFilterAggPipeline from "../../../utils/get-aggregation-pipeline";
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
          sort = { invoiceDate: -1, invoiceNo: -1 },
        } = JSON.parse(req.query.id);

        console.log({
          account,
          startRow,
          endRow,
          filter,
          sort,
        });

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
        ];

        // filter according to filterModel object
        if (filter.invoiceNo) {
          const invoiceNoQuery = createFilterAggPipeline({
            invoiceNo: filter.invoiceNo,
          });
          query.push(invoiceNoQuery[0]);
        }

        if (filter.organisation) {
          const organisationQuery = createFilterAggPipeline({
            organisation: filter.organisation,
          });
          query.push(organisationQuery[0]);
        }

        // if (filter.vehicleNumber) {
        //   const vehicleNumberQuery = createFilterAggPipeline({
        //     vehicleNumber: filter.vehicleNumber,
        //   });
        //   query.push(vehicleNumberQuery[0]);
        // }

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

        const invoices = await Invoice.aggregate(query);
        res.json(invoices);
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

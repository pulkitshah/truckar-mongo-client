import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Invoice from "../../../models/Invoice";
import auth from "../../../auth";
import createFilterAggPipeline from "../../../utils/get-aggregation-pipeline";
import { basicLookups } from ".";

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

        // if (!(accountId instanceof mongoose.Types.ObjectId)) {
        //   throw new Error("accountId must be ObjectId");
        // } else if (typeof startRow !== "number") {
        //   throw new Error("startRow must be number");
        // } else if (typeof endRow !== "number") {
        //   throw new Error("endRow must be number");
        // }

        let matches = { account: new mongoose.Types.ObjectId(account) };

        // Build the query with early filtering and sorting
        let query = [
          // filter the results by our accountId first
          {
            $match: Object.assign(matches),
          },
        ];

        // Add filters before any lookups
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

        // Add sorting immediately after filtering, before lookups
        if (sort) {
          query.push({ $sort: sort });
        }

        // Use facet to get both count and paginated results efficiently
        query.push({
          $facet: {
            // Get total count without additional processing
            totalCount: [
              { $count: "count" }
            ],
            // Get paginated results with minimal lookups
            paginatedResults: [
              { $skip: startRow },
              { $limit: endRow - startRow },
              ...basicLookups
            ]
          }
        });

        // Reshape the result
        query.push({
          $project: {
            count: { $arrayElemAt: ["$totalCount.count", 0] },
            rows: "$paginatedResults"
          }
        });

        const invoices = await Invoice.aggregate(query, { allowDiskUse: true });
        res.json(invoices);
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import { lookups } from ".";
import createFilterAggPipeline from "../../../utils/get-aggregation-pipeline";

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

        // Use facet for efficient pagination  
        query.push({
          $facet: {
            // Get total count without expensive lookups
            totalCount: [
              { $count: "count" }
            ],
            // Get paginated results with full lookups only for displayed items
            paginatedResults: [
              { $skip: startRow },
              { $limit: endRow - startRow },
              ...lookups
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

        const orders = await Order.aggregate(query, { allowDiskUse: true });
        res.json(orders);
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

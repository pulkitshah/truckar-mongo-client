import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import moment from "moment";
import { getFinancialGroupFields, getProfitExpression } from "../../../helper";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, startDate, endDate, groupBy = "day" } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      const start = startDate
        ? new Date(startDate)
        : moment().subtract(30, "days").toDate();
      const end = endDate ? new Date(endDate) : new Date();

      // Determine date grouping format
      let dateFormat;
      switch (groupBy) {
        case "day":
          dateFormat = "%Y-%m-%d";
          break;
        case "week":
          dateFormat = "%Y-%U";
          break;
        case "month":
          dateFormat = "%Y-%m";
          break;
        default:
          dateFormat = "%Y-%m-%d";
      }

      const revenueTrend = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: "$saleDate",
                timezone: "Asia/Kolkata",
              },
            },
            ...getFinancialGroupFields(),
          },
        },
        {
          $addFields: {
            profit: getProfitExpression(),
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $project: {
            date: "$_id",
            sales: { $round: ["$sales", 2] },
            profit: { $round: ["$profit", 2] },
            _id: 0,
          },
        },
      ]);

      return res.status(200).json(revenueTrend);
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

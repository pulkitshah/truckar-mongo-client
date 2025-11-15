import mongoose from "mongoose";
import moment from "moment";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import { getFinancialGroupFields, getProfitExpression } from "../../../helper";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, startDate, endDate, limit = 10 } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      const start = startDate
        ? new Date(startDate)
        : moment().subtract(30, "days").toDate();
      const end = endDate ? new Date(endDate) : new Date();

      const topCustomers = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: "parties",
            localField: "customer",
            foreignField: "_id",
            as: "customerData",
          },
        },
        {
          $unwind: "$customerData",
        },
        {
          $group: {
            _id: "$customer",
            customerName: { $first: "$customerData.name" },
            ...getFinancialGroupFields(),
            orderCount: { $sum: 1 },
          },
        },
        {
          $addFields: {
            profit: getProfitExpression(),
          },
        },
        {
          $sort: { profit: -1 },
        },
        {
          $limit: Number.parseInt(limit),
        },
        {
          $project: {
            customerId: "$_id",
            customerName: 1,
            profit: { $round: ["$profit", 2] },
            sales: { $round: ["$sales", 2] },
            orderCount: 1,
            _id: 0,
          },
        },
      ]);

      return res.status(200).json(topCustomers);
    } catch (error) {
      console.error("Error fetching top customers:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

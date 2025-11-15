import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import moment from "moment";
import {
  getTotalSalesExpression,
  getTotalPurchaseExpression,
  getExpensesExpression,
  getProfitExpression,
} from "../../../helper";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, date } = req.query;

      if (!account || !date) {
        return res
          .status(400)
          .json({ message: "Account and date are required" });
      }

      // Parse the date and determine the date range based on grouping
      let startDate, endDate;

      // The date comes in format YYYY-MM-DD from the revenue-trend API
      // We need to match all orders on that specific day
      startDate = moment(date, "YYYY-MM-DD").startOf("day").toDate();
      endDate = moment(date, "YYYY-MM-DD").endOf("day").toDate();

      const orders = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $addFields: {
            firstDelivery: { $arrayElemAt: ["$deliveries", 0] },
          },
        },
        {
          $lookup: {
            from: "addresses",
            localField: "firstDelivery.lr.consignor",
            foreignField: "_id",
            as: "consignorDetails",
          },
        },
        {
          $lookup: {
            from: "addresses",
            localField: "firstDelivery.lr.consignee",
            foreignField: "_id",
            as: "consigneeDetails",
          },
        },
        {
          $addFields: {
            consignorName: { $arrayElemAt: ["$consignorDetails.name", 0] },
            consigneeName: { $arrayElemAt: ["$consigneeDetails.name", 0] },
            totalQuantity: {
              $sum: {
                $map: {
                  input: "$deliveries",
                  as: "delivery",
                  in: { $ifNull: ["$$delivery.billQuantity", 0] },
                },
              },
            },
            sales: getTotalSalesExpression(),
            purchase: getTotalPurchaseExpression(),
            expenses: getExpensesExpression(),
          },
        },
        {
          $addFields: {
            profit: getProfitExpression(),
          },
        },
        {
          $project: {
            orderNo: 1,
            saleDate: 1,
            consignorName: 1,
            consigneeName: 1,
            totalQuantity: 1,
            saleRate: 1,
            purchaseRate: 1,
            sales: { $round: ["$sales", 2] },
            purchase: { $round: ["$purchase", 2] },
            expenses: { $round: ["$expenses", 2] },
            profit: { $round: ["$profit", 2] },
          },
        },
        {
          $sort: { saleDate: -1, orderNo: -1 },
        },
      ]);

      res.status(200).json({
        success: true,
        data: orders,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error("Error fetching revenue details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch revenue details",
        error: error.message,
      });
    }
  });
}

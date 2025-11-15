import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
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

      const { account, customerId, startDate, endDate } = req.query;

      if (!account || !customerId) {
        return res
          .status(400)
          .json({ message: "Account and customerId are required" });
      }

      const matchConditions = {
        account: new mongoose.Types.ObjectId(account),
        customer: new mongoose.Types.ObjectId(customerId),
      };

      // Add date filtering if provided
      if (startDate || endDate) {
        matchConditions.saleDate = {};
        if (startDate) matchConditions.saleDate.$gte = new Date(startDate);
        if (endDate) matchConditions.saleDate.$lte = new Date(endDate);
      }

      const orders = await Order.aggregate([
        {
          $match: matchConditions,
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
          $lookup: {
            from: "addresses",
            localField: "customer",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {
          $addFields: {
            consignorName: { $arrayElemAt: ["$consignorDetails.name", 0] },
            consigneeName: { $arrayElemAt: ["$consigneeDetails.name", 0] },
            customerName: { $arrayElemAt: ["$customerDetails.name", 0] },
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
            customerName: 1,
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
      });
    } catch (error) {
      console.error("Error fetching customer details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch customer details",
        error: error.message,
      });
    }
  });
}

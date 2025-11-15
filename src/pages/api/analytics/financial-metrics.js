import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import moment from "moment";
import { getFinancialGroupFields } from "../../../helper";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, startDate, endDate } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      const start = startDate
        ? new Date(startDate)
        : moment().subtract(30, "days").toDate();
      const end = endDate ? new Date(endDate) : new Date();

      // Calculate previous period for comparison
      const periodDays = moment(end).diff(moment(start), "days");
      const previousStart = moment(start).subtract(periodDays, "days").toDate();
      const previousEnd = start;

      // Current period metrics
      const currentPeriod = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            ...getFinancialGroupFields(),
            activeOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
              },
            },
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      // Previous period metrics for growth calculation
      const previousPeriod = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: previousStart, $lt: previousEnd },
          },
        },
        {
          $group: {
            _id: null,
            ...getFinancialGroupFields(),
            totalOrders: { $sum: 1 },
          },
        },
      ]);

      const current = currentPeriod[0] || {
        sales: 0,
        purchase: 0,
        expenses: 0,
        activeOrders: 0,
        totalOrders: 0,
      };

      const previous = previousPeriod[0] || {
        sales: 0,
        purchase: 0,
        expenses: 0,
        totalOrders: 0,
      };

      const totalProfit = current.sales - current.purchase - current.expenses;
      const previousProfit =
        previous.sales - previous.purchase - previous.expenses;

      const salesGrowth =
        previous.sales > 0
          ? ((current.sales - previous.sales) / previous.sales) * 100
          : 0;

      const profitGrowth =
        previousProfit > 0
          ? ((totalProfit - previousProfit) / previousProfit) * 100
          : 0;

      const ordersGrowth =
        previous.totalOrders > 0
          ? ((current.totalOrders - previous.totalOrders) /
              previous.totalOrders) *
            100
          : 0;

      const profitMargin =
        current.sales > 0 ? (totalProfit / current.sales) * 100 : 0;

      const result = {
        totalSales: Math.round(current.sales),
        totalProfit: Math.round(totalProfit),
        profitMargin: Number.parseFloat(profitMargin.toFixed(2)),
        activeOrders: current.activeOrders,
        salesGrowth: Number.parseFloat(salesGrowth.toFixed(2)),
        profitGrowth: Number.parseFloat(profitGrowth.toFixed(2)),
        ordersGrowth: Number.parseFloat(ordersGrowth.toFixed(2)),
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching financial metrics:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

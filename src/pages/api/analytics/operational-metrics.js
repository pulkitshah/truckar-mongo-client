import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";
import moment from "moment";

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

      // Count orders by status
      const orderStats = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        canceledOrders: 0,
      };

      orderStats.forEach((stat) => {
        stats.totalOrders += stat.count;
        if (stat._id === "pending") stats.pendingOrders = stat.count;
        if (stat._id === "complete") stats.completedOrders = stat.count;
        if (stat._id === "canceled") stats.canceledOrders = stat.count;
      });

      // Count deliveries
      const deliveryStats = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: start, $lte: end },
          },
        },
        {
          $project: {
            deliveryCount: { $size: { $ifNull: ["$deliveries", []] } },
          },
        },
        {
          $group: {
            _id: null,
            totalDeliveries: { $sum: "$deliveryCount" },
          },
        },
      ]);

      const totalDeliveries = deliveryStats[0]?.totalDeliveries || 0;

      const result = {
        ...stats,
        totalDeliveries,
        completionRate:
          stats.totalOrders > 0
            ? parseFloat(
                ((stats.completedOrders / stats.totalOrders) * 100).toFixed(2)
              )
            : 0,
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching operational metrics:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

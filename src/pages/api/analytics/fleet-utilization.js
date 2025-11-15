import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Vehicle from "../../../models/Vehicle";
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

      // Count total vehicles
      const totalVehicles = await Vehicle.countDocuments({
        account: new mongoose.Types.ObjectId(account),
      });

      // Count active vehicles (vehicles with orders in the period)
      const activeVehiclesResult = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: start, $lte: end },
            vehicle: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$vehicle",
          },
        },
        {
          $count: "count",
        },
      ]);

      const activeVehicles = activeVehiclesResult[0]?.count || 0;
      const utilizationPercentage =
        totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

      const result = {
        totalVehicles,
        activeVehicles,
        utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching fleet utilization:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

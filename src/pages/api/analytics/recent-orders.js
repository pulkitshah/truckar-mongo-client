import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, limit = 10 } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      const orders = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
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
          $unwind: {
            path: "$customerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { saleDate: -1 },
        },
        {
          $limit: parseInt(limit),
        },
        {
          $project: {
            _id: 1,
            orderNo: 1,
            saleDate: 1,
            customerName: "$customerData.name",
            vehicleNumber: 1,
            saleAmount: {
              $multiply: [
                { $ifNull: ["$saleRate", 0] },
                {
                  $sum: {
                    $map: {
                      input: "$deliveries",
                      as: "delivery",
                      in: { $ifNull: ["$$delivery.billQuantity", 0] },
                    },
                  },
                },
              ],
            },
            status: { $ifNull: ["$status", "pending"] },
          },
        },
      ]);

      return res.status(200).json(orders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

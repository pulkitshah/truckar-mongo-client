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

      const { account } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      // Count deliveries pending LR
      const pendingLRs = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
          },
        },
        {
          $unwind: "$deliveries",
        },
        {
          $match: {
            "deliveries.lr": { $exists: false },
          },
        },
        {
          $count: "count",
        },
      ]);

      // Count uninvoiced deliveries
      const uninvoicedResult = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
          },
        },
        {
          $unwind: "$deliveries",
        },
        {
          $match: {
            $or: [
              { "deliveries.invoices": { $exists: false } },
              { "deliveries.invoices": { $size: 0 } },
            ],
          },
        },
        {
          $count: "count",
        },
      ]);

      // Calculate outstanding invoices (simplified - would need Invoice model)
      const outstandingAmount = 0; // Placeholder

      // Calculate pending payments to transporters (simplified)
      const pendingPayments = 0; // Placeholder

      const result = {
        pendingLRs: pendingLRs[0]?.count || 0,
        uninvoicedDeliveries: uninvoicedResult[0]?.count || 0,
        outstandingAmount,
        pendingPayments,
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching pending actions:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

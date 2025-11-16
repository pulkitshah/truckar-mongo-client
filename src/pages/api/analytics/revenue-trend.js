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

      // Build aggregation pipeline based on groupBy
      let groupId;
      let projectDate;

      switch (groupBy) {
        case "day":
          groupId = {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$saleDate",
              timezone: "Asia/Kolkata",
            },
          };
          projectDate = "$_id";
          break;

        case "week":
          // Group by ISO week and return the Monday of that week
          groupId = {
            year: { $isoWeekYear: "$saleDate" },
            week: { $isoWeek: "$saleDate" },
          };
          // Calculate the Monday of the ISO week
          projectDate = {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: {
                  isoWeekYear: "$_id.year",
                  isoWeek: "$_id.week",
                  isoDayOfWeek: 1, // Monday
                },
              },
            },
          };
          break;

        case "month":
          groupId = {
            $dateToString: {
              format: "%Y-%m",
              date: "$saleDate",
              timezone: "Asia/Kolkata",
            },
          };
          projectDate = "$_id";
          break;

        case "quarter":
          // Group by year and quarter, return first day of quarter
          groupId = {
            year: { $year: "$saleDate" },
            quarter: { $ceil: { $divide: [{ $month: "$saleDate" }, 3] } },
          };
          // Calculate first day of quarter: (quarter-1)*3 + 1
          projectDate = {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: {
                    $add: [
                      { $multiply: [{ $subtract: ["$_id.quarter", 1] }, 3] },
                      1,
                    ],
                  },
                  day: 1,
                },
              },
            },
          };
          break;

        default:
          groupId = {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$saleDate",
              timezone: "Asia/Kolkata",
            },
          };
          projectDate = "$_id";
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
            _id: groupId,
            ...getFinancialGroupFields(),
          },
        },
        {
          $addFields: {
            profit: getProfitExpression(),
          },
        },
        {
          $sort: { _id: 1 },
        },
        {
          $project: {
            date: projectDate,
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

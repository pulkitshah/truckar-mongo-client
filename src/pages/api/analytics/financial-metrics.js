import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Account from "../../../models/Account";
import auth from "../../../auth";
import moment from "moment";
import {
  getFinancialGroupFields,
  getTotalSalesExpression,
  getTotalPurchaseExpression,
  getExpensesExpression,
} from "../../../helper";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, startDate, endDate, organisation } = req.query;

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

      // Get account settings for targets
      const accountDoc = await Account.findById(account);
      const targets = accountDoc?.analyticsSettings?.monthlyTargets || {
        sales: null,
        profit: null,
        orders: null,
        profitMargin: null,
      };

      // Build match query for current period
      const baseMatch = {
        account: new mongoose.Types.ObjectId(account),
        saleDate: { $gte: start, $lte: end },
      };

      // Add organisation filter if provided
      // Use $or to include orders with direct organisation field or via vehicle lookup
      let matchQuery = { ...baseMatch };
      if (organisation) {
        matchQuery = {
          ...baseMatch,
          $or: [
            { organisation: new mongoose.Types.ObjectId(organisation) },
            // For backward compatibility, include vehicle lookup path in aggregation below
          ],
        };
      }

      // Current period metrics with enhanced breakdown
      const currentPeriodPipeline = [
        {
          $match: matchQuery,
        },
      ];

      // Add vehicle lookup for organisation filtering (backward compatibility)
      if (organisation) {
        currentPeriodPipeline.push(
          {
            $lookup: {
              from: "vehicles",
              localField: "vehicle",
              foreignField: "_id",
              as: "vehicleData",
            },
          },
          {
            $unwind: {
              path: "$vehicleData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              $or: [
                { organisation: new mongoose.Types.ObjectId(organisation) },
                {
                  "vehicleData.organisation": new mongoose.Types.ObjectId(
                    organisation
                  ),
                },
              ],
            },
          }
        );
      }

      // Add grouping stage
      currentPeriodPipeline.push({
        $group: {
          _id: null,
          ...getFinancialGroupFields(),
          activeOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
          totalOrders: { $sum: 1 },
          // Sales breakdown
          totalFreightRevenue: { $sum: "$freight" },
          totalExtraCharges: { $sum: "$extraCharges" },
          totalDiscount: { $sum: "$discount" },
          // Cost breakdown
          totalPurchaseCost: { $sum: "$purchase" },
          totalExpenses: { $sum: "$expenses" },
        },
      });

      const currentPeriod = await Order.aggregate(currentPeriodPipeline);

      // Previous period metrics (simplified - no organisation filter needed for comparison)
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
        completedOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
        totalFreightRevenue: 0,
        totalExtraCharges: 0,
        totalDiscount: 0,
        totalPurchaseCost: 0,
        totalExpenses: 0,
      };

      const previous = previousPeriod[0] || {
        sales: 0,
        purchase: 0,
        expenses: 0,
        totalOrders: 0,
      };

      // Calculate core metrics
      const totalProfit = current.sales - current.purchase - current.expenses;
      const previousProfit =
        previous.sales - previous.purchase - previous.expenses;

      const profitMargin =
        current.sales > 0 ? (totalProfit / current.sales) * 100 : 0;

      const previousMargin =
        previous.sales > 0 ? (previousProfit / previous.sales) * 100 : 0;

      const averageOrderValue =
        current.totalOrders > 0 ? current.sales / current.totalOrders : 0;

      const previousAOV =
        previous.totalOrders > 0 ? previous.sales / previous.totalOrders : 0;

      const expenseRatio =
        current.sales > 0 ? (current.expenses / current.sales) * 100 : 0;

      const previousExpenseRatio =
        previous.sales > 0 ? (previous.expenses / previous.sales) * 100 : 0;

      // Calculate growth percentages
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

      const marginGrowth = profitMargin - previousMargin;

      const aovGrowth =
        previousAOV > 0
          ? ((averageOrderValue - previousAOV) / previousAOV) * 100
          : 0;

      const expenseRatioChange = expenseRatio - previousExpenseRatio;

      // Fetch 30-day trend data for sparklines
      const trendStart = moment(end).subtract(30, "days").toDate();
      const trendData = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $gte: trendStart, $lte: end },
            ...(organisation && {
              $or: [
                { organisation: new mongoose.Types.ObjectId(organisation) },
              ],
            }),
          },
        },
        ...(organisation
          ? [
              {
                $lookup: {
                  from: "vehicles",
                  localField: "vehicle",
                  foreignField: "_id",
                  as: "vehicleData",
                },
              },
              {
                $unwind: {
                  path: "$vehicleData",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $match: {
                  $or: [
                    { organisation: new mongoose.Types.ObjectId(organisation) },
                    {
                      "vehicleData.organisation": new mongoose.Types.ObjectId(
                        organisation
                      ),
                    },
                  ],
                },
              },
            ]
          : []),
        {
          $addFields: {
            calculatedSales: getTotalSalesExpression(),
            calculatedPurchase: getTotalPurchaseExpression(),
            calculatedExpenses: getExpensesExpression(),
          },
        },
        {
          $addFields: {
            calculatedProfit: {
              $subtract: [
                { $subtract: ["$calculatedSales", "$calculatedPurchase"] },
                "$calculatedExpenses",
              ],
            },
            calculatedMargin: {
              $cond: [
                { $gt: ["$calculatedSales", 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            {
                              $subtract: [
                                "$calculatedSales",
                                "$calculatedPurchase",
                              ],
                            },
                            "$calculatedExpenses",
                          ],
                        },
                        "$calculatedSales",
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
            calculatedExpenseRatio: {
              $cond: [
                { $gt: ["$calculatedSales", 0] },
                {
                  $multiply: [
                    { $divide: ["$calculatedExpenses", "$calculatedSales"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$saleDate" },
            },
            sales: { $sum: "$calculatedSales" },
            profit: { $sum: "$calculatedProfit" },
            orders: { $sum: 1 },
            margin: { $avg: "$calculatedMargin" },
            aov: { $avg: "$calculatedSales" },
            expenseRatio: { $avg: "$calculatedExpenseRatio" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Convert trend data to arrays
      const salesTrend = trendData.map((d) => Math.round(d.sales));
      const profitTrend = trendData.map((d) => Math.round(d.profit));
      const ordersTrend = trendData.map((d) => d.orders);
      const marginTrend = trendData.map((d) =>
        Number.parseFloat(d.margin.toFixed(2))
      );
      const aovTrend = trendData.map((d) => Math.round(d.aov));
      const expenseRatioTrend = trendData.map((d) =>
        Number.parseFloat(d.expenseRatio.toFixed(2))
      );

      // Build enhanced response
      const result = {
        // Core metrics
        totalSales: Math.round(current.sales),
        totalProfit: Math.round(totalProfit),
        totalOrders: current.totalOrders,
        profitMargin: Number.parseFloat(profitMargin.toFixed(2)),
        averageOrderValue: Math.round(averageOrderValue),
        expenseRatio: Number.parseFloat(expenseRatio.toFixed(2)),

        // Growth percentages
        salesGrowth: Number.parseFloat(salesGrowth.toFixed(2)),
        profitGrowth: Number.parseFloat(profitGrowth.toFixed(2)),
        ordersGrowth: Number.parseFloat(ordersGrowth.toFixed(2)),
        marginGrowth: Number.parseFloat(marginGrowth.toFixed(2)),
        aovGrowth: Number.parseFloat(aovGrowth.toFixed(2)),
        expenseRatioChange: Number.parseFloat(expenseRatioChange.toFixed(2)),

        // Breakdowns
        salesBreakdown: {
          freightRevenue: Math.round(current.totalFreightRevenue),
          extraCharges: Math.round(current.totalExtraCharges),
          discount: Math.round(current.totalDiscount),
        },
        costBreakdown: {
          purchaseCost: Math.round(current.totalPurchaseCost),
          operatingExpenses: Math.round(current.totalExpenses),
        },
        orderBreakdown: {
          active: current.activeOrders,
          completed: current.completedOrders,
          cancelled: current.cancelledOrders,
        },

        // Previous period for reference
        previousPeriod: {
          sales: Math.round(previous.sales),
          profit: Math.round(previousProfit),
          orders: previous.totalOrders,
          margin: Number.parseFloat(previousMargin.toFixed(2)),
          aov: Math.round(previousAOV),
          expenseRatio: Number.parseFloat(previousExpenseRatio.toFixed(2)),
        },

        // Trends (30-day sparkline data)
        trends: {
          sales: salesTrend,
          profit: profitTrend,
          orders: ordersTrend,
          margin: marginTrend,
          aov: aovTrend,
          expenseRatio: expenseRatioTrend,
        },

        // Targets from account settings
        targets: {
          sales: targets.sales,
          profit: targets.profit,
          orders: targets.orders,
          profitMargin: targets.profitMargin,
        },
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

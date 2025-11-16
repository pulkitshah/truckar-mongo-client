import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Invoice from "../../../models/Invoice";
import Account from "../../../models/Account";
import auth from "../../../auth";
import moment from "moment";
import {
  getExpensesExpression,
  getTotalSalesExpression,
  getTotalPurchaseExpression,
} from "../../../helper/orderCalculations";

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

      // Get account settings for thresholds
      const accountDoc = await Account.findById(account);
      const thresholds = accountDoc?.analyticsSettings?.thresholds || {
        maxExpenseRatio: 15,
        minProfitMargin: 15,
        minDocumentCompletion: 80,
        minFleetUtilization: 70,
      };
      const targets = accountDoc?.analyticsSettings?.monthlyTargets || {};

      // Build match query
      const baseMatch = {
        account: new mongoose.Types.ObjectId(account),
        saleDate: { $gte: start, $lte: end },
      };

      // Add organisation filter if provided
      let currentMatchStage;
      if (organisation) {
        const lookupStages = [
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
              ...baseMatch,
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
        ];
        currentMatchStage = lookupStages;
      } else {
        currentMatchStage = [{ $match: baseMatch }];
      }

      // Fetch current period data
      const currentPeriodPipeline = [
        ...currentMatchStage,
        {
          $addFields: {
            calculatedSales: getTotalSalesExpression(),
            calculatedPurchase: getTotalPurchaseExpression(),
            calculatedExpenses: getExpensesExpression(),
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {
              $sum: "$calculatedSales",
            },
            totalCost: {
              $sum: { $add: ["$calculatedPurchase", "$calculatedExpenses"] },
            },
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            activeOrders: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
          },
        },
      ];

      const [currentData] = await Order.aggregate(currentPeriodPipeline);

      // Fetch previous period data
      const previousBaseMatch = {
        account: new mongoose.Types.ObjectId(account),
        saleDate: { $gte: previousStart, $lte: previousEnd },
      };

      let previousMatchStage = [{ $match: previousBaseMatch }];
      if (organisation) {
        const lookupStages = [
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
              ...previousBaseMatch,
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
        ];
        previousMatchStage = lookupStages;
      }

      const previousPeriodPipeline = [
        ...previousMatchStage,
        {
          $addFields: {
            calculatedSales: getTotalSalesExpression(),
            calculatedPurchase: getTotalPurchaseExpression(),
            calculatedExpenses: getExpensesExpression(),
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {
              $sum: "$calculatedSales",
            },
            totalCost: {
              $sum: { $add: ["$calculatedPurchase", "$calculatedExpenses"] },
            },
            totalOrders: { $sum: 1 },
          },
        },
      ];

      const [previousData] = await Order.aggregate(previousPeriodPipeline);

      // Calculate metrics
      const current = {
        sales: currentData?.totalSales || 0,
        cost: currentData?.totalCost || 0,
        orders: currentData?.totalOrders || 0,
        completed: currentData?.completedOrders || 0,
        active: currentData?.activeOrders || 0,
        cancelled: currentData?.cancelledOrders || 0,
      };

      const previous = {
        sales: previousData?.totalSales || 0,
        cost: previousData?.totalCost || 0,
        orders: previousData?.totalOrders || 0,
      };

      current.profit = current.sales - current.cost;
      current.profitMargin =
        current.sales > 0 ? (current.profit / current.sales) * 100 : 0;
      current.expenseRatio =
        current.sales > 0 ? (current.cost / current.sales) * 100 : 0;
      current.aov = current.orders > 0 ? current.sales / current.orders : 0;

      previous.profit = previous.sales - previous.cost;
      previous.profitMargin =
        previous.sales > 0 ? (previous.profit / previous.sales) * 100 : 0;

      // Calculate growth rates
      const salesGrowth =
        previous.sales > 0
          ? ((current.sales - previous.sales) / previous.sales) * 100
          : 0;
      const ordersGrowth =
        previous.orders > 0
          ? ((current.orders - previous.orders) / previous.orders) * 100
          : 0;
      const marginChange = current.profitMargin - previous.profitMargin;

      // Fetch document completion data
      // Check for embedded LR data in deliveries and invoice references
      const ordersWithDocsStages = organisation ? currentMatchStage : [{ $match: baseMatch }];
      const ordersWithDocs = await Order.aggregate([
        ...ordersWithDocsStages,
        {
          $addFields: {
            // Check if any delivery has LR data
            hasLR: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$deliveries", []] },
                      as: "delivery",
                      cond: { $ifNull: ["$$delivery.lr.lrNo", false] },
                    },
                  },
                },
                0,
              ],
            },
            // Check if any delivery has invoice references
            hasInvoice: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$deliveries", []] },
                      as: "delivery",
                      cond: {
                        $gt: [
                          { $size: { $ifNull: ["$$delivery.invoices", []] } },
                          0,
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withLR: {
              $sum: {
                $cond: ["$hasLR", 1, 0],
              },
            },
            withInvoice: {
              $sum: {
                $cond: ["$hasInvoice", 1, 0],
              },
            },
          },
        },
      ]);

      const docCompletion = ordersWithDocs[0] || {
        total: 0,
        withLR: 0,
        withInvoice: 0,
      };
      const lrCompletionRate =
        docCompletion.total > 0
          ? (docCompletion.withLR / docCompletion.total) * 100
          : 0;
      const invoiceCompletionRate =
        docCompletion.total > 0
          ? (docCompletion.withInvoice / docCompletion.total) * 100
          : 0;

      // Fetch outstanding invoices
      const invoiceMatch = {
        account: new mongoose.Types.ObjectId(account),
        paymentStatus: { $in: ["unpaid", "partial"] },
      };

      const outstandingInvoices = await Invoice.aggregate([
        { $match: invoiceMatch },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
      ]);

      const outstanding = outstandingInvoices[0] || {
        count: 0,
        totalAmount: 0,
      };

      // Generate insights array
      const insights = [];

      // Sales growth insights
      if (salesGrowth > 10) {
        insights.push({
          type: "positive",
          message: `Sales increased by ${salesGrowth.toFixed(1)}% compared to previous period`,
          value: `+${salesGrowth.toFixed(1)}%`,
        });
      } else if (salesGrowth < -10) {
        insights.push({
          type: "negative",
          message: `Sales declined by ${Math.abs(salesGrowth).toFixed(1)}% compared to previous period`,
          action: "Consider reviewing pricing strategy or customer engagement",
          value: `${salesGrowth.toFixed(1)}%`,
        });
      }

      // Profit margin insights
      if (current.profitMargin < thresholds.minProfitMargin) {
        insights.push({
          type: "warning",
          message: `Profit margin (${current.profitMargin.toFixed(1)}%) is below target of ${thresholds.minProfitMargin}%`,
          action: "Review operational costs and pricing structure",
          value: `${current.profitMargin.toFixed(1)}%`,
        });
      } else if (marginChange > 2) {
        insights.push({
          type: "improvement",
          message: `Profit margin improved by ${marginChange.toFixed(1)} percentage points`,
          value: `${current.profitMargin.toFixed(1)}%`,
        });
      }

      // Expense ratio insights
      if (current.expenseRatio > thresholds.maxExpenseRatio) {
        insights.push({
          type: "warning",
          message: `Expense ratio (${current.expenseRatio.toFixed(1)}%) exceeds target of ${thresholds.maxExpenseRatio}%`,
          action: "Analyze operating expenses and identify cost-saving opportunities",
          value: `${current.expenseRatio.toFixed(1)}%`,
        });
      }

      // Order trends
      if (ordersGrowth > 15) {
        insights.push({
          type: "positive",
          message: `Order volume increased by ${ordersGrowth.toFixed(1)}% - strong demand trend`,
          value: `${current.orders} orders`,
        });
      } else if (ordersGrowth < -15) {
        insights.push({
          type: "negative",
          message: `Order volume decreased by ${Math.abs(ordersGrowth).toFixed(1)}%`,
          action: "Review customer relationships and market conditions",
          value: `${current.orders} orders`,
        });
      }

      // Document completion insights
      if (lrCompletionRate < thresholds.minDocumentCompletion) {
        insights.push({
          type: "warning",
          message: `Only ${lrCompletionRate.toFixed(0)}% of orders have LRs generated`,
          action: "Follow up on pending documentation to ensure compliance",
          value: `${lrCompletionRate.toFixed(0)}%`,
        });
      }

      if (invoiceCompletionRate < thresholds.minDocumentCompletion) {
        insights.push({
          type: "warning",
          message: `Only ${invoiceCompletionRate.toFixed(0)}% of orders are invoiced`,
          action: "Generate invoices promptly to improve cash flow",
          value: `${invoiceCompletionRate.toFixed(0)}%`,
        });
      }

      // Outstanding invoices insights
      if (outstanding.count > 10) {
        const outstandingLakhs = (outstanding.totalAmount / 100000).toFixed(2);
        insights.push({
          type: "warning",
          message: `${outstanding.count} invoices pending payment totaling ₹${outstandingLakhs}L`,
          action: "Review aging report and follow up with customers",
          value: `₹${outstandingLakhs}L`,
        });
      }

      // Cancellation rate insights
      const cancellationRate = (current.cancelled / current.orders) * 100;
      if (cancellationRate > 5 && current.cancelled > 2) {
        insights.push({
          type: "negative",
          message: `${current.cancelled} orders cancelled (${cancellationRate.toFixed(1)}% cancellation rate)`,
          action: "Investigate reasons for cancellations and improve processes",
          value: `${cancellationRate.toFixed(1)}%`,
        });
      }

      // Target achievement insights
      if (targets.sales && current.sales >= targets.sales) {
        const achievement = (current.sales / targets.sales) * 100;
        insights.push({
          type: "positive",
          message: `Sales target achieved at ${achievement.toFixed(0)}%`,
          value: `${achievement.toFixed(0)}%`,
        });
      } else if (targets.sales && current.sales < targets.sales * 0.7) {
        const achievement = (current.sales / targets.sales) * 100;
        insights.push({
          type: "warning",
          message: `Sales at ${achievement.toFixed(0)}% of target - significant gap remains`,
          action: "Accelerate business development efforts",
          value: `${achievement.toFixed(0)}%`,
        });
      }

      // Average order value insights
      if (current.aov > 50000) {
        const aovLakhs = (current.aov / 100000).toFixed(2);
        insights.push({
          type: "positive",
          message: `Average order value of ₹${aovLakhs}L indicates strong deal sizes`,
          value: `₹${aovLakhs}L`,
        });
      }

      // Active orders insight
      if (current.active > current.completed) {
        insights.push({
          type: "info",
          message: `${current.active} orders currently in progress`,
          action: "Monitor active orders for timely completion",
          value: `${current.active} active`,
        });
      }

      // If no significant insights, provide a general summary
      if (insights.length === 0) {
        insights.push({
          type: "info",
          message: "Operations are stable with no significant anomalies detected",
          value: "All good",
        });
      }

      // Sort insights by priority (negative > warning > positive > improvement > info)
      const priorityOrder = {
        negative: 1,
        warning: 2,
        positive: 3,
        improvement: 4,
        info: 5,
      };

      insights.sort((a, b) => {
        return priorityOrder[a.type] - priorityOrder[b.type];
      });

      // Limit to top 6 insights
      const topInsights = insights.slice(0, 6);

      return res.status(200).json(topInsights);
    } catch (error) {
      console.error("[Analytics API - Insights Error]:", error);
      return res.status(500).json({
        message: "Failed to generate insights",
        error: error.message,
      });
    }
  });
}

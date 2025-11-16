require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

// Import the helper functions
const {
  getTotalSalesExpression,
  getTotalPurchaseExpression,
  getExpensesExpression,
} = require("../src/helper/orderCalculations.js");

async function testCalculations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    // Test with one order
    const result = await Order.aggregate([
      {
        $match: {
          saleDate: {
            $gte: new Date("2025-10-16T18:30:00.000Z"),
            $lte: new Date("2025-11-16T18:29:59.999Z"),
          },
        },
      },
      {
        $addFields: {
          calculatedSales: getTotalSalesExpression(),
          calculatedPurchase: getTotalPurchaseExpression(),
          calculatedExpenses: getExpensesExpression(),
        },
      },
      {
        $project: {
          orderNo: 1,
          saleRate: 1,
          purchaseRate: 1,
          calculatedSales: 1,
          calculatedPurchase: 1,
          calculatedExpenses: 1,
          profit: {
            $subtract: [
              "$calculatedSales",
              { $add: ["$calculatedPurchase", "$calculatedExpenses"] },
            ],
          },
        },
      },
      { $limit: 5 },
    ]).toArray();

    console.log("Sample Calculations:");
    result.forEach((order) => {
      console.log("\nOrder:", order.orderNo);
      console.log("  Sale Rate:", order.saleRate);
      console.log("  Purchase Rate:", order.purchaseRate);
      console.log("  Calculated Sales:", order.calculatedSales);
      console.log("  Calculated Purchase:", order.calculatedPurchase);
      console.log("  Calculated Expenses:", order.calculatedExpenses);
      console.log("  Profit:", order.profit);
    });

    // Test aggregated totals
    console.log("\n--- Aggregated Totals for Last 30 Days ---");
    const totals = await Order.aggregate([
      {
        $match: {
          saleDate: {
            $gte: new Date("2025-10-16T18:30:00.000Z"),
            $lte: new Date("2025-11-16T18:29:59.999Z"),
          },
        },
      },
      {
        $addFields: {
          expenses: getExpensesExpression(),
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: getTotalSalesExpression() },
          totalPurchase: { $sum: getTotalPurchaseExpression() },
          totalExpenses: { $sum: "$expenses" },
          orderCount: { $sum: 1 },
        },
      },
    ]).toArray();

    if (totals[0]) {
      const t = totals[0];
      const totalProfit = t.totalSales - t.totalPurchase - t.totalExpenses;
      const profitMargin =
        t.totalSales > 0 ? (totalProfit / t.totalSales) * 100 : 0;
      const expenseRatio =
        t.totalSales > 0 ? (t.totalExpenses / t.totalSales) * 100 : 0;

      console.log("Total Sales:", t.totalSales);
      console.log("Total Purchase:", t.totalPurchase);
      console.log("Total Expenses:", t.totalExpenses);
      console.log("Total Profit:", totalProfit);
      console.log("Profit Margin:", profitMargin.toFixed(2) + "%");
      console.log("Expense Ratio:", expenseRatio.toFixed(2) + "%");
      console.log("Orders:", t.orderCount);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testCalculations();

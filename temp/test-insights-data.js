require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function testInsightsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const startDate = new Date("2025-10-16T18:30:00.000Z");
    const endDate = new Date("2025-11-16T18:29:59.999Z");

    const {
      getExpensesExpression,
      getTotalSalesExpression,
      getTotalPurchaseExpression,
    } = require("../src/helper/orderCalculations.js");

    // Get current period data
    const currentPeriod = await Order.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
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
          totalSales: {
            $sum: getTotalSalesExpression(),
          },
          totalCost: {
            $sum: { $add: [getTotalPurchaseExpression(), "$expenses"] },
          },
          totalOrders: { $sum: 1 },
        },
      },
    ]).toArray();

    // Get previous period data (30 days before)
    const previousStart = new Date("2025-09-16T18:30:00.000Z");
    const previousEnd = new Date("2025-10-16T18:30:00.000Z");

    const previousPeriod = await Order.aggregate([
      {
        $match: {
          saleDate: { $gte: previousStart, $lt: previousEnd },
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
          totalSales: {
            $sum: getTotalSalesExpression(),
          },
          totalCost: {
            $sum: { $add: [getTotalPurchaseExpression(), "$expenses"] },
          },
          totalOrders: { $sum: 1 },
        },
      },
    ]).toArray();

    const current = currentPeriod[0] || {
      totalSales: 0,
      totalCost: 0,
      totalOrders: 0,
    };
    const previous = previousPeriod[0] || {
      totalSales: 0,
      totalCost: 0,
      totalOrders: 0,
    };

    console.log("=== CURRENT PERIOD (Last 30 days) ===");
    console.log("Sales:", current.totalSales);
    console.log("Cost:", current.totalCost);
    console.log("Profit:", current.totalSales - current.totalCost);
    console.log("Orders:", current.totalOrders);

    console.log("\n=== PREVIOUS PERIOD (30 days before) ===");
    console.log("Sales:", previous.totalSales);
    console.log("Cost:", previous.totalCost);
    console.log("Profit:", previous.totalSales - previous.totalCost);
    console.log("Orders:", previous.totalOrders);

    // Calculate growth rates
    const salesGrowth =
      previous.totalSales > 0
        ? ((current.totalSales - previous.totalSales) / previous.totalSales) *
          100
        : 0;
    const profitGrowth =
      previous.totalSales - previous.totalCost > 0
        ? ((current.totalSales -
            current.totalCost -
            (previous.totalSales - previous.totalCost)) /
            (previous.totalSales - previous.totalCost)) *
          100
        : 0;
    const ordersGrowth =
      previous.totalOrders > 0
        ? ((current.totalOrders - previous.totalOrders) /
            previous.totalOrders) *
          100
        : 0;

    console.log("\n=== GROWTH RATES ===");
    console.log("Sales Growth:", salesGrowth.toFixed(2) + "%");
    console.log("Profit Growth:", profitGrowth.toFixed(2) + "%");
    console.log("Orders Growth:", ordersGrowth.toFixed(2) + "%");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testInsightsAPI();

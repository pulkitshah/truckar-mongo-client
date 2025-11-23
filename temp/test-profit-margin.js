require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

// Import the helper functions
const getExpensesExpression = () => {
  return {
    $reduce: {
      input: { $ifNull: ["$orderExpenses", []] },
      initialValue: 0,
      in: {
        $add: ["$$value", { $ifNull: ["$$this.orderExpenseAmount", 0] }],
      },
    },
  };
};

const getTotalSalesExpression = () => {
  return {
    $subtract: [
      {
        $add: [
          { $ifNull: ["$freightAmount", 0] },
          { $ifNull: ["$extraCharges", 0] },
        ],
      },
      { $ifNull: ["$discount", 0] },
    ],
  };
};

const getTotalPurchaseExpression = () => {
  return { $ifNull: ["$purchaseAmount", 0] };
};

async function testProfitMarginCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const startDate = new Date("2025-10-16T18:30:00.000Z");
    const endDate = new Date("2025-11-16T18:29:59.999Z");

    console.log("=================================================");
    console.log("PROFIT MARGIN CALCULATION TEST");
    console.log("=================================================\n");

    // Test the aggregation with proper calculations
    const currentData = await Order.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
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
    ]).toArray();

    const current = currentData[0] || {
      totalSales: 0,
      totalCost: 0,
      totalOrders: 0,
    };

    const profit = current.totalSales - current.totalCost;
    const profitMargin =
      current.totalSales > 0 ? (profit / current.totalSales) * 100 : 0;
    const expenseRatio =
      current.totalSales > 0
        ? (current.totalCost / current.totalSales) * 100
        : 0;

    console.log("Current Period Metrics:");
    console.log("  Total Orders:", current.totalOrders);
    console.log("  Total Sales:", current.totalSales.toFixed(2));
    console.log("  Total Cost:", current.totalCost.toFixed(2));
    console.log("  Profit:", profit.toFixed(2));
    console.log("  Profit Margin:", profitMargin.toFixed(2) + "%");
    console.log("  Expense Ratio:", expenseRatio.toFixed(2) + "%");

    console.log("\n=================================================");
    console.log("EXPECTED DASHBOARD INSIGHT");
    console.log("=================================================");

    if (profitMargin < 15) {
      console.log(
        `⚠️  Profit margin (${profitMargin.toFixed(1)}%) is below target of 15%`
      );
      console.log("   → Review operational costs and pricing structure");
    } else {
      console.log(
        `✅ Profit margin (${profitMargin.toFixed(1)}%) is above target of 15%`
      );
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testProfitMarginCalculation().catch(console.error);

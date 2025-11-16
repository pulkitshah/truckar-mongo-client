require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function checkDeliveries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);

    const Order = mongoose.connection.collection("orders");

    const sampleOrder = await Order.findOne({
      saleDate: {
        $gte: new Date("2025-10-16T18:30:00.000Z"),
        $lte: new Date("2025-11-16T18:29:59.999Z"),
      },
    });

    if (sampleOrder && sampleOrder.deliveries) {
      console.log("Deliveries Array:");
      console.log(JSON.stringify(sampleOrder.deliveries, null, 2));

      console.log("\n--- Financial Calculation ---");
      console.log("saleRate:", sampleOrder.saleRate);
      console.log("purchaseRate:", sampleOrder.purchaseRate);

      let totalExpenses = 0;
      if (sampleOrder.orderExpenses) {
        totalExpenses = sampleOrder.orderExpenses.reduce(
          (sum, exp) => sum + (exp.orderExpenseAmount || 0),
          0
        );
      }
      console.log("Total Expenses:", totalExpenses);
      console.log(
        "Profit:",
        sampleOrder.saleRate - sampleOrder.purchaseRate - totalExpenses
      );
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDeliveries();

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function checkOrderFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const startDate = new Date("2025-10-16T18:30:00.000Z");
    const endDate = new Date("2025-11-16T18:29:59.999Z");

    // Get one sample order
    const sampleOrder = await Order.findOne({
      saleDate: { $gte: startDate, $lte: endDate },
    });

    if (!sampleOrder) {
      console.log("No orders found in date range");
      await mongoose.disconnect();
      return;
    }

    console.log("Sample Order Fields:");
    console.log("  orderNo:", sampleOrder.orderNo);
    console.log("  saleDate:", sampleOrder.saleDate);
    console.log("\nFinancial Fields:");
    console.log("  freightAmount:", sampleOrder.freightAmount);
    console.log("  extraCharges:", sampleOrder.extraCharges);
    console.log("  discount:", sampleOrder.discount);
    console.log("  purchaseAmount:", sampleOrder.purchaseAmount);
    console.log("  saleRate:", sampleOrder.saleRate);
    console.log("  purchaseRate:", sampleOrder.purchaseRate);
    console.log(
      "\n  orderExpenses:",
      sampleOrder.orderExpenses
        ? "Array with " + sampleOrder.orderExpenses.length + " items"
        : "undefined"
    );

    if (sampleOrder.orderExpenses && sampleOrder.orderExpenses.length > 0) {
      console.log("\nFirst Expense:");
      console.log(JSON.stringify(sampleOrder.orderExpenses[0], null, 2));
    }

    console.log("\nDeliveries:");
    if (sampleOrder.deliveries && sampleOrder.deliveries.length > 0) {
      const delivery = sampleOrder.deliveries[0];
      console.log("  billQuantity:", delivery.billQuantity);
      console.log("  unloadingQuantity:", delivery.unloadingQuantity);
    }

    // Check what the schema is actually using - maybe it's saleRate * quantity?
    console.log("\n\nAll top-level keys in order:");
    console.log(Object.keys(sampleOrder).sort().join(", "));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkOrderFields().catch(console.error);

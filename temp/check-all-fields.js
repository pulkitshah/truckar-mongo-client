require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function checkAllFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const sampleOrder = await Order.findOne({
      saleDate: {
        $gte: new Date("2025-10-16T18:30:00.000Z"),
        $lte: new Date("2025-11-16T18:29:59.999Z"),
      },
    });

    if (sampleOrder) {
      console.log("ALL Order Fields (showing only non-null values):");
      for (const [key, value] of Object.entries(sampleOrder)) {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            console.log(`${key}: Array[${value.length}]`);
          } else if (typeof value === "object") {
            console.log(`${key}: Object`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }
      }

      // Show full object for key financial fields
      console.log("\n--- Looking for freight/charge fields ---");
      const freightFields = Object.keys(sampleOrder).filter(
        (k) =>
          k.toLowerCase().includes("freight") ||
          k.toLowerCase().includes("charge") ||
          k.toLowerCase().includes("amount") ||
          k.toLowerCase().includes("discount") ||
          k.toLowerCase().includes("sale") ||
          k.toLowerCase().includes("purchase")
      );
      console.log("Found fields:", freightFields);
      freightFields.forEach((field) => {
        console.log(`${field}:`, sampleOrder[field]);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAllFields();

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function verifyIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");
    const LR = mongoose.connection.collection("lrs");
    const Invoice = mongoose.connection.collection("invoices");

    // Check expense ratio issue
    console.log("=== CHECKING EXPENSE RATIO ===");
    const ordersWithExpenses = await Order.find({
      saleDate: {
        $gte: new Date("2025-10-16T18:30:00.000Z"),
        $lte: new Date("2025-11-16T18:29:59.999Z"),
      },
      orderExpenses: { $exists: true, $ne: [] },
    })
      .limit(3)
      .toArray();

    console.log("Orders with expenses:", ordersWithExpenses.length);
    if (ordersWithExpenses.length > 0) {
      console.log("\nSample order expenses:");
      ordersWithExpenses.forEach((order, i) => {
        console.log(`\nOrder ${i + 1} (${order.orderNo}):`);
        order.orderExpenses.forEach((exp) => {
          console.log(
            `  - ${exp.orderExpenseName}: ₹${exp.orderExpenseAmount || 0}`
          );
        });
        const total = order.orderExpenses.reduce(
          (sum, e) => sum + (e.orderExpenseAmount || 0),
          0
        );
        console.log(`  Total: ₹${total}`);
      });
    }

    // Check document completion issue
    console.log("\n\n=== CHECKING DOCUMENT COMPLETION ===");

    // Check LRs
    const totalLRs = await LR.countDocuments();
    console.log("Total LRs in database:", totalLRs);

    // Check if LRs are embedded in orders instead
    const ordersWithLRs = await Order.countDocuments({
      "deliveries.lr": { $exists: true },
    });
    console.log("Orders with embedded LR data:", ordersWithLRs);

    // Check invoices
    const totalInvoices = await Invoice.countDocuments();
    console.log("Total Invoices in database:", totalInvoices);

    const invoicesWithOrder = await Invoice.countDocuments({
      order: { $exists: true, $ne: null },
    });
    console.log("Invoices linked to orders:", invoicesWithOrder);

    // Check orders in last 30 days
    const ordersInPeriod = await Order.countDocuments({
      saleDate: {
        $gte: new Date("2025-10-16T18:30:00.000Z"),
        $lte: new Date("2025-11-16T18:29:59.999Z"),
      },
    });
    console.log("Orders in last 30 days:", ordersInPeriod);

    // Check how many have embedded LRs
    const ordersWithEmbeddedLR = await Order.countDocuments({
      saleDate: {
        $gte: new Date("2025-10-16T18:30:00.000Z"),
        $lte: new Date("2025-11-16T18:29:59.999Z"),
      },
      "deliveries.lr.lrNo": { $exists: true },
    });
    console.log("Orders with embedded LR in period:", ordersWithEmbeddedLR);

    // Check pending invoices calculation
    console.log("\n\n=== CHECKING PENDING INVOICES ===");
    const pendingInvoices = await Order.aggregate([
      {
        $match: {
          saleDate: {
            $gte: new Date("2025-10-16T18:30:00.000Z"),
            $lte: new Date("2025-11-16T18:29:59.999Z"),
          },
          "deliveries.invoices": { $exists: true, $ne: [] },
        },
      },
      {
        $project: {
          orderNo: 1,
          saleRate: 1,
          hasInvoices: {
            $gt: [
              {
                $size: {
                  $ifNull: [{ $arrayElemAt: ["$deliveries.invoices", 0] }, []],
                },
              },
              0,
            ],
          },
        },
      },
      { $limit: 5 },
    ]).toArray();

    console.log("Sample orders with invoice references:");
    pendingInvoices.forEach((o) => {
      console.log(
        `Order ${o.orderNo}: saleRate=₹${o.saleRate}, hasInvoices=${o.hasInvoices}`
      );
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyIssues();

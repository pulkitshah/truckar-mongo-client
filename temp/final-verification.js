require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function finalVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const startDate = new Date("2025-10-16T18:30:00.000Z");
    const endDate = new Date("2025-11-16T18:29:59.999Z");

    // Run the exact aggregation from the API
    const documentCompletion = await Order.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $addFields: {
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
          totalOrders: { $sum: 1 },
          ordersWithLR: {
            $sum: {
              $cond: ["$hasLR", 1, 0],
            },
          },
          ordersWithInvoice: {
            $sum: {
              $cond: ["$hasInvoice", 1, 0],
            },
          },
          ordersWithBoth: {
            $sum: {
              $cond: [
                {
                  $and: ["$hasLR", "$hasInvoice"],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).toArray();

    const docStats = documentCompletion[0] || {
      totalOrders: 0,
      ordersWithLR: 0,
      ordersWithInvoice: 0,
      ordersWithBoth: 0,
    };

    const lrCompletionRate =
      docStats.totalOrders > 0
        ? (docStats.ordersWithLR / docStats.totalOrders) * 100
        : 0;
    const invoiceCompletionRate =
      docStats.totalOrders > 0
        ? (docStats.ordersWithInvoice / docStats.totalOrders) * 100
        : 0;
    const fullCompletionRate =
      docStats.totalOrders > 0
        ? (docStats.ordersWithBoth / docStats.totalOrders) * 100
        : 0;

    const result = {
      documentCompletion: {
        lrCompletionRate: Number.parseFloat(lrCompletionRate.toFixed(2)),
        invoiceCompletionRate: Number.parseFloat(
          invoiceCompletionRate.toFixed(2)
        ),
        fullCompletionRate: Number.parseFloat(fullCompletionRate.toFixed(2)),
        ordersWithoutLR: docStats.totalOrders - docStats.ordersWithLR,
        ordersWithoutInvoice: docStats.totalOrders - docStats.ordersWithInvoice,
        totalOrders: docStats.totalOrders,
      },
    };

    console.log("=== FINAL API RESPONSE (documentCompletion) ===\n");
    console.log(JSON.stringify(result.documentCompletion, null, 2));

    console.log("\n=== DASHBOARD DISPLAY ===");
    console.log("📊 Document Completion");
    console.log(
      "   Value:",
      result.documentCompletion.fullCompletionRate + "%"
    );
    console.log(
      "   Subtitle:",
      result.documentCompletion.ordersWithoutLR +
        " pending LRs, " +
        result.documentCompletion.ordersWithoutInvoice +
        " pending invoices"
    );

    console.log("\n✅ BEFORE FIX: 0.0% (0 pending LRs, 82 pending invoices)");
    console.log(
      "✅ AFTER FIX:",
      result.documentCompletion.fullCompletionRate +
        "% (" +
        result.documentCompletion.ordersWithoutLR +
        " pending LRs, " +
        result.documentCompletion.ordersWithoutInvoice +
        " pending invoices)"
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

finalVerification();

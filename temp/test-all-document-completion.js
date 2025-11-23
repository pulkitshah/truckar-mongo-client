require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function testAllDocumentCompletionLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const startDate = new Date("2025-10-16T18:30:00.000Z");
    const endDate = new Date("2025-11-16T18:29:59.999Z");

    console.log("=================================================");
    console.log("COMPREHENSIVE DOCUMENT COMPLETION TEST");
    console.log("=================================================\n");

    // Test 1: Document Completion Statistics (used in operational-health)
    console.log("1. DOCUMENT COMPLETION STATISTICS");
    console.log("-------------------------------------------------");

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

    console.log("Total Orders:", docStats.totalOrders);
    console.log("Orders with LR:", docStats.ordersWithLR);
    console.log("Orders with Invoice:", docStats.ordersWithInvoice);
    console.log("Orders with Both:", docStats.ordersWithBoth);
    console.log("\nCompletion Rates:");
    console.log("  LR Completion:", lrCompletionRate.toFixed(2) + "%");
    console.log(
      "  Invoice Completion:",
      invoiceCompletionRate.toFixed(2) + "%"
    );
    console.log(
      "  Full Completion (Both):",
      fullCompletionRate.toFixed(2) + "%"
    );

    // Test 2: Pending LRs
    console.log("\n\n2. PENDING LRs (Orders without LR)");
    console.log("-------------------------------------------------");

    const pendingLRs = await Order.aggregate([
      {
        $match: {
          saleDate: { $lte: endDate },
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
        },
      },
      {
        $match: {
          hasLR: false,
        },
      },
      {
        $count: "count",
      },
    ]).toArray();

    const pendingLRCount = pendingLRs[0]?.count || 0;
    console.log("Total orders without LR:", pendingLRCount);

    // Test 3: Pending Invoices
    console.log("\n3. PENDING INVOICES (Orders without Invoice)");
    console.log("-------------------------------------------------");

    const pendingInvoices = await Order.aggregate([
      {
        $match: {
          saleDate: { $lte: endDate },
        },
      },
      {
        $addFields: {
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
        $match: {
          hasInvoice: false,
        },
      },
      {
        $count: "count",
      },
    ]).toArray();

    const pendingInvoiceCount = pendingInvoices[0]?.count || 0;
    console.log("Total orders without Invoice:", pendingInvoiceCount);

    // Summary
    console.log("\n\n=================================================");
    console.log("SUMMARY FOR DASHBOARD DISPLAY");
    console.log("=================================================");
    console.log("\nDOCUMENT COMPLETION CARD:");
    console.log(`  Value: ${fullCompletionRate.toFixed(1)}%`);
    console.log(
      `  Subtitle: ${
        docStats.totalOrders - docStats.ordersWithLR
      } pending LRs, ${
        docStats.totalOrders - docStats.ordersWithInvoice
      } pending invoices`
    );

    console.log("\nKEY INSIGHTS:");
    if (lrCompletionRate < 80) {
      console.log(
        `  ⚠️  Only ${lrCompletionRate.toFixed(
          0
        )}% of orders have LRs generated`
      );
    } else {
      console.log(
        `  ✅ ${lrCompletionRate.toFixed(
          0
        )}% of orders have LRs generated (above 80% threshold)`
      );
    }

    if (invoiceCompletionRate < 80) {
      console.log(
        `  ⚠️  Only ${invoiceCompletionRate.toFixed(0)}% of orders are invoiced`
      );
    } else {
      console.log(
        `  ✅ ${invoiceCompletionRate.toFixed(
          0
        )}% of orders are invoiced (above 80% threshold)`
      );
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testAllDocumentCompletionLogic().catch(console.error);

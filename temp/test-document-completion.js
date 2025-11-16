require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function testDocumentCompletion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log("Connected to MongoDB\n");

    const Order = mongoose.connection.collection("orders");

    const startDate = new Date("2025-10-16T18:30:00.000Z");
    const endDate = new Date("2025-11-16T18:29:59.999Z");

    console.log("=== Testing Document Completion Logic ===\n");

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

    const stats = documentCompletion[0] || {
      totalOrders: 0,
      ordersWithLR: 0,
      ordersWithInvoice: 0,
      ordersWithBoth: 0,
    };

    const lrCompletionRate =
      stats.totalOrders > 0
        ? (stats.ordersWithLR / stats.totalOrders) * 100
        : 0;
    const invoiceCompletionRate =
      stats.totalOrders > 0
        ? (stats.ordersWithInvoice / stats.totalOrders) * 100
        : 0;
    const fullCompletionRate =
      stats.totalOrders > 0
        ? (stats.ordersWithBoth / stats.totalOrders) * 100
        : 0;

    console.log("Total Orders:", stats.totalOrders);
    console.log("Orders with LR:", stats.ordersWithLR);
    console.log("Orders with Invoice:", stats.ordersWithInvoice);
    console.log("Orders with Both:", stats.ordersWithBoth);
    console.log("\nLR Completion Rate:", lrCompletionRate.toFixed(1) + "%");
    console.log(
      "Invoice Completion Rate:",
      invoiceCompletionRate.toFixed(1) + "%"
    );
    console.log(
      "Full Document Completion Rate:",
      fullCompletionRate.toFixed(1) + "%"
    );

    // Check pending LRs
    console.log("\n=== Testing Pending LRs ===\n");

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

    console.log("Orders without LR:", pendingLRs[0]?.count || 0);

    // Check pending Invoices
    console.log("\n=== Testing Pending Invoices ===\n");

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

    console.log("Orders without Invoice:", pendingInvoices[0]?.count || 0);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testDocumentCompletion();

import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Invoice from "../../../models/Invoice";
import Vehicle from "../../../models/Vehicle";
import Driver from "../../../models/Driver";
import Account from "../../../models/Account";
import auth from "../../../auth";
import moment from "moment";

export default async function handler(req, res) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  auth(req, res, async () => {
    try {
      await dbConnect();

      const { account, startDate, endDate, organisation } = req.query;

      if (!account) {
        return res.status(400).json({ message: "Account is required" });
      }

      const start = startDate
        ? new Date(startDate)
        : moment().subtract(30, "days").toDate();
      const end = endDate ? new Date(endDate) : new Date();

      // Get account settings for thresholds
      const accountDoc = await Account.findById(account);
      const thresholds = accountDoc?.analyticsSettings?.thresholds || {
        minDocumentCompletion: 80,
        minFleetUtilization: 70,
      };
      const alertSettings = accountDoc?.analyticsSettings?.alertSettings || {
        outstandingDaysThreshold: 30,
        pendingLRDaysThreshold: 7,
        pendingInvoiceDaysThreshold: 15,
      };

      // Build base match query
      const baseMatch = {
        account: new mongoose.Types.ObjectId(account),
        saleDate: { $gte: start, $lte: end },
      };

      // Add organisation filter if provided
      let matchQuery = { ...baseMatch };
      let orgFilterPipeline = [];

      if (organisation) {
        orgFilterPipeline = [
          {
            $lookup: {
              from: "vehicles",
              localField: "vehicle",
              foreignField: "_id",
              as: "vehicleData",
            },
          },
          {
            $unwind: {
              path: "$vehicleData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              $or: [
                { organisation: new mongoose.Types.ObjectId(organisation) },
                { "vehicleData.organisation": new mongoose.Types.ObjectId(organisation) },
              ],
            },
          },
        ];
      }

      // 1. Document Completion Rates
      // Check for embedded LR data in deliveries and invoice references
      const documentCompletion = await Order.aggregate([
        { $match: matchQuery },
        ...orgFilterPipeline,
        {
          $addFields: {
            // Check if any delivery has LR data
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
            // Check if any delivery has invoice references
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
      ]);

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

      // 2. Fleet Utilization
      let vehicleMatch = { account: new mongoose.Types.ObjectId(account) };
      if (organisation) {
        vehicleMatch.organisation = new mongoose.Types.ObjectId(organisation);
      }

      const [totalVehicles, activeVehicleCount] = await Promise.all([
        Vehicle.countDocuments(vehicleMatch),
        Order.aggregate([
          { $match: matchQuery },
          ...orgFilterPipeline,
          {
            $group: {
              _id: "$vehicle",
            },
          },
          {
            $count: "count",
          },
        ]),
      ]);

      const activeVehicles = activeVehicleCount[0]?.count || 0;
      const fleetUtilization =
        totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

      // 3. Driver Activity
      let driverMatch = { account: new mongoose.Types.ObjectId(account) };
      if (organisation) {
        driverMatch.organisation = new mongoose.Types.ObjectId(organisation);
      }

      const [totalDrivers, activeDriverCount] = await Promise.all([
        Driver.countDocuments(driverMatch),
        Order.aggregate([
          { $match: matchQuery },
          ...orgFilterPipeline,
          {
            $group: {
              _id: "$driver",
            },
          },
          {
            $count: "count",
          },
        ]),
      ]);

      const activeDrivers = activeDriverCount[0]?.count || 0;
      const driverUtilization =
        totalDrivers > 0 ? (activeDrivers / totalDrivers) * 100 : 0;

      // 4. Pending Actions - LRs
      const pendingLRs = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $lte: end },
          },
        },
        ...orgFilterPipeline,
        {
          $addFields: {
            // Check if any delivery has LR data
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
          $lookup: {
            from: "parties",
            localField: "customer",
            foreignField: "_id",
            as: "customerData",
          },
        },
        {
          $unwind: {
            path: "$customerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            orderId: "$_id",
            orderNumber: "$orderNumber",
            saleDate: 1,
            customer: "$customerData.name",
            customerId: "$customer",
            daysPending: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$saleDate"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        },
        {
          $match: {
            daysPending: { $gte: alertSettings.pendingLRDaysThreshold },
          },
        },
        {
          $sort: { daysPending: -1 },
        },
        {
          $limit: 20,
        },
      ]);

      // 5. Pending Actions - Invoices
      const pendingInvoices = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            saleDate: { $lte: end },
          },
        },
        ...orgFilterPipeline,
        {
          $addFields: {
            // Check if any delivery has invoice references
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
          $lookup: {
            from: "parties",
            localField: "customer",
            foreignField: "_id",
            as: "customerData",
          },
        },
        {
          $unwind: {
            path: "$customerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            orderId: "$_id",
            orderNumber: "$orderNumber",
            saleDate: 1,
            customer: "$customerData.name",
            customerId: "$customer",
            amount: "$sales",
            daysPending: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$saleDate"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        },
        {
          $match: {
            daysPending: { $gte: alertSettings.pendingInvoiceDaysThreshold },
          },
        },
        {
          $sort: { daysPending: -1 },
        },
        {
          $limit: 20,
        },
      ]);

      // 6. Outstanding Invoices with Aging
      const outstandingInvoices = await Invoice.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            paymentStatus: { $in: ["unpaid", "partial"] },
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "order",
            foreignField: "_id",
            as: "orderData",
          },
        },
        {
          $unwind: {
            path: "$orderData",
            preserveNullAndEmptyArrays: true,
          },
        },
        ...(organisation
          ? [
              {
                $lookup: {
                  from: "vehicles",
                  localField: "orderData.vehicle",
                  foreignField: "_id",
                  as: "vehicleData",
                },
              },
              {
                $unwind: {
                  path: "$vehicleData",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $match: {
                  $or: [
                    { "orderData.organisation": new mongoose.Types.ObjectId(organisation) },
                    { "vehicleData.organisation": new mongoose.Types.ObjectId(organisation) },
                  ],
                },
              },
            ]
          : []),
        {
          $lookup: {
            from: "parties",
            localField: "orderData.customer",
            foreignField: "_id",
            as: "customerData",
          },
        },
        {
          $unwind: {
            path: "$customerData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            invoiceId: "$_id",
            invoiceNumber: "$invoiceNumber",
            invoiceDate: 1,
            dueDate: 1,
            totalAmount: "$totalAmount",
            paidAmount: 1,
            outstandingAmount: {
              $subtract: ["$totalAmount", "$paidAmount"],
            },
            customer: "$customerData.name",
            customerId: "$orderData.customer",
            daysOutstanding: {
              $floor: {
                $divide: [
                  {
                    $subtract: [
                      new Date(),
                      { $ifNull: ["$dueDate", "$invoiceDate"] },
                    ],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
            agingBucket: {
              $switch: {
                branches: [
                  {
                    case: {
                      $lt: [
                        {
                          $floor: {
                            $divide: [
                              {
                                $subtract: [
                                  new Date(),
                                  { $ifNull: ["$dueDate", "$invoiceDate"] },
                                ],
                              },
                              1000 * 60 * 60 * 24,
                            ],
                          },
                        },
                        30,
                      ],
                    },
                    then: "0-30",
                  },
                  {
                    case: {
                      $lt: [
                        {
                          $floor: {
                            $divide: [
                              {
                                $subtract: [
                                  new Date(),
                                  { $ifNull: ["$dueDate", "$invoiceDate"] },
                                ],
                              },
                              1000 * 60 * 60 * 24,
                            ],
                          },
                        },
                        60,
                      ],
                    },
                    then: "30-60",
                  },
                  {
                    case: {
                      $lt: [
                        {
                          $floor: {
                            $divide: [
                              {
                                $subtract: [
                                  new Date(),
                                  { $ifNull: ["$dueDate", "$invoiceDate"] },
                                ],
                              },
                              1000 * 60 * 60 * 24,
                            ],
                          },
                        },
                        90,
                      ],
                    },
                    then: "60-90",
                  },
                ],
                default: "90+",
              },
            },
          },
        },
        {
          $match: {
            daysOutstanding: { $gte: alertSettings.outstandingDaysThreshold },
          },
        },
        {
          $sort: { daysOutstanding: -1 },
        },
      ]);

      // Calculate aging summary
      const agingSummary = {
        "0-30": 0,
        "30-60": 0,
        "60-90": 0,
        "90+": 0,
      };

      let totalOutstanding = 0;
      for (const inv of outstandingInvoices) {
        agingSummary[inv.agingBucket] += inv.outstandingAmount;
        totalOutstanding += inv.outstandingAmount;
      }

      // Group pending items by customer
      const pendingLRsByCustomer = pendingLRs.reduce((acc, item) => {
        const key = item.customerId?.toString() || "unknown";
        if (!acc[key]) {
          acc[key] = {
            customer: item.customer || "Unknown",
            customerId: item.customerId,
            count: 0,
            items: [],
          };
        }
        acc[key].count++;
        acc[key].items.push({
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          saleDate: item.saleDate,
          daysPending: item.daysPending,
        });
        return acc;
      }, {});

      const pendingInvoicesByCustomer = pendingInvoices.reduce((acc, item) => {
        const key = item.customerId?.toString() || "unknown";
        if (!acc[key]) {
          acc[key] = {
            customer: item.customer || "Unknown",
            customerId: item.customerId,
            count: 0,
            totalAmount: 0,
            items: [],
          };
        }
        acc[key].count++;
        acc[key].totalAmount += item.amount || 0;
        acc[key].items.push({
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          saleDate: item.saleDate,
          amount: item.amount,
          daysPending: item.daysPending,
        });
        return acc;
      }, {});

      // Build response
      const result = {
        documentCompletion: {
          lrCompletionRate: Number.parseFloat(lrCompletionRate.toFixed(2)),
          invoiceCompletionRate: Number.parseFloat(invoiceCompletionRate.toFixed(2)),
          fullCompletionRate: Number.parseFloat(fullCompletionRate.toFixed(2)),
          ordersWithoutLR: docStats.totalOrders - docStats.ordersWithLR,
          ordersWithoutInvoice: docStats.totalOrders - docStats.ordersWithInvoice,
          totalOrders: docStats.totalOrders,
          threshold: thresholds.minDocumentCompletion,
        },
        fleetUtilization: {
          utilizationRate: Number.parseFloat(fleetUtilization.toFixed(2)),
          activeVehicles,
          totalVehicles,
          idleVehicles: totalVehicles - activeVehicles,
          threshold: thresholds.minFleetUtilization,
        },
        driverActivity: {
          utilizationRate: Number.parseFloat(driverUtilization.toFixed(2)),
          activeDrivers,
          totalDrivers,
          idleDrivers: totalDrivers - activeDrivers,
        },
        pendingActions: {
          pendingLRs: {
            count: pendingLRs.length,
            byCustomer: Object.values(pendingLRsByCustomer),
            threshold: alertSettings.pendingLRDaysThreshold,
          },
          pendingInvoices: {
            count: pendingInvoices.length,
            totalAmount: Math.round(
              pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
            ),
            byCustomer: Object.values(pendingInvoicesByCustomer),
            threshold: alertSettings.pendingInvoiceDaysThreshold,
          },
        },
        outstandingInvoices: {
          count: outstandingInvoices.length,
          totalOutstanding: Math.round(totalOutstanding),
          agingSummary: {
            "0-30": Math.round(agingSummary["0-30"]),
            "30-60": Math.round(agingSummary["30-60"]),
            "60-90": Math.round(agingSummary["60-90"]),
            "90+": Math.round(agingSummary["90+"]),
          },
          invoices: outstandingInvoices.slice(0, 20), // Limit to top 20
          threshold: alertSettings.outstandingDaysThreshold,
        },
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching operational health:", error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
}

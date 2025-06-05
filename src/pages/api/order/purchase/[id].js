import mongoose from "mongoose";
import dbConnect from "../../../../lib/dbConnect";
import Order from "../../../../models/Order";
import auth from "../../../../auth";
import { lookups } from "../index";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const {
          account,
          startRow,
          endRow,
          filter = {},
          sort = { saleDate: -1, orderNo: -1 },
        } = JSON.parse(req.query.id);

        let matches = { account: new mongoose.Types.ObjectId(account) };

        let query = [
          // filter the results by our accountId
          {
            $match: Object.assign(matches),
          },
          {
            $match: {
              transporter: {
                $exists: true,
              },
            },
          },
          { $sort: { saleDate: -1, orderNo: -1 } },
        ];

        // filter according to filterModel object
        if (filter.orderNo) {
          const orderNoQuery = createFilterAggPipeline({
            orderNo: filter.orderNo,
          });
          query.push(orderNoQuery[0]);
        }

        if (filter.customer) {
          const customerQuery = createFilterAggPipeline({
            customer: filter.customer,
          });
          query.push(customerQuery[0]);
        }

        if (filter.vehicleNumber) {
          const vehicleNumberQuery = createFilterAggPipeline({
            vehicleNumber: filter.vehicleNumber,
          });
          query.push(vehicleNumberQuery[0]);
        }

        query.push(
          {
            $facet: {
              rows: [
                {
                  $skip: startRow,
                },
                {
                  $limit: endRow - startRow,
                },
                { $unwind: "$deliveries" },
                {
                  $lookup: {
                    from: "organisations",
                    let: {
                      id: {
                        $toObjectId: "$deliveries.lr.organisation",
                      },
                      deliveries: "$deliveries",
                    },

                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$id"] },
                        },
                      },
                    ],
                    as: "deliveries.lr.organisation",
                  },
                },
                {
                  $unwind: {
                    path: "$deliveries.lr.organisation",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $group: {
                    _id: "$_id",
                    orderNo: { $first: "$orderNo" },
                    saleDate: { $first: "$saleDate" },
                    customer: { $first: "$customer" },
                    vehicleNumber: { $first: "$vehicleNumber" },
                    vehicle: { $first: "$vehicle" },
                    driver: { $first: "$driver" },
                    driverName: { $first: "$driverName" },
                    driverMobile: { $first: "$driverMobile" },
                    driverArrivalTime: { $first: "$driverArrivalTime" },
                    orderExpenses: { $first: "$orderExpenses" },
                    saleType: { $first: "$saleType" },
                    saleRate: { $first: "$saleRate" },
                    minimumSaleGuarantee: { $first: "$minimumSaleGuarantee" },
                    saleAdvance: { $first: "$saleAdvance" },
                    purchaseType: { $first: "$purchaseType" },
                    purchaseRate: { $first: "$purchaseRate" },
                    minimumPurchaseGuarantee: {
                      $first: "$minimumPurchaseGuarantee",
                    },
                    purchaseAdvance: { $first: "$purchaseAdvance" },
                    purchaseRemarks: { $first: "$purchaseRemarks" },
                    transporter: { $first: "$transporter" },
                    createdDate: { $first: "$createdDate" },
                    account: { $first: "$account" },
                    status: { $first: "$status" },
                    deliveries: { $push: "$deliveries" },
                  },
                },
                { $sort: { saleDate: -1, orderNo: -1 } },

                {
                  $lookup: {
                    from: "parties",
                    let: {
                      id: "$customer",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$_id", "$$id"],
                          },
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          city: 1,
                          mobile: 1,
                          isTransporter: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "customer",
                  },
                },
                { $unwind: "$customer" },
                {
                  $lookup: {
                    from: "parties",
                    let: {
                      id: "$transporter",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$id"] },
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          city: 1,
                          mobile: 1,
                          isTransporter: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "transporter",
                  },
                },
                {
                  $unwind: {
                    path: "$transporter",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $lookup: {
                    from: "drivers",
                    let: {
                      id: "$driver",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$_id", "$$id"],
                          },
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          mobile: 1,
                          _id: 1,
                          lat: 1,
                          long: 1,
                          locationUpdatedDate: 1,
                          currentOrder: 1,
                        },
                      },
                    ],
                    as: "driver",
                  },
                },
                {
                  $unwind: {
                    path: "$driver",
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $lookup: {
                    from: "vehicles",
                    let: {
                      id: "$vehicle",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$_id", "$$id"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "organisations",
                          let: {
                            id: "$organisation",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$_id", "$$id"],
                                },
                              },
                            },
                          ],
                          as: "organisation",
                        },
                      },
                      {
                        $unwind: {
                          path: "$organisation",
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                    ],
                    as: "vehicle",
                  },
                },
                {
                  $unwind: {
                    path: "$vehicle",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ],
              count: [
                {
                  $group: {
                    _id: null,
                    Total: { $sum: 1 },
                  },
                },
              ],
            },
          },
          {
            $unwind: "$rows",
          },
          {
            $addFields: {
              "rows.count": { $arrayElemAt: ["$count.Total", 0] },
            },
          },
          {
            $replaceRoot: {
              newRoot: "$rows",
            },
          }
        );

        const orders = await Order.aggregate(query);
        res.json(orders);
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

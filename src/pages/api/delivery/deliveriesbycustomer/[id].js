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
          customer,
          startRow,
          endRow,
          filter = {},
          sort = { saleDate: -1, orderNo: -1 },
        } = JSON.parse(req.query.id);

        const parsedStartRow = Number(startRow);
        const safeStartRow = Math.max(
          Number.isFinite(parsedStartRow) ? parsedStartRow : 0,
          0
        );
        const parsedEndRow = Number(endRow);
        const safeEndRow =
          Number.isFinite(parsedEndRow) && parsedEndRow > safeStartRow
            ? parsedEndRow
            : safeStartRow + 100;
        const pageSize = Math.max(safeEndRow - safeStartRow, 0);

        let matches = {
          account: new mongoose.Types.ObjectId(account),
          customer: new mongoose.Types.ObjectId(customer),
        };

        const filteredDeliveriesExpression = {
          $filter: {
            input: "$deliveries",
            as: "delivery",
            cond: {
              $and: [
                {
                  $or: [
                    { $ifNull: ["$$delivery.lr.lrNo", false] },
                    { $ifNull: ["$$delivery.lr.lrNumber", false] },
                    { $ifNull: ["$$delivery.lr.lrno", false] },
                    { $ifNull: ["$$delivery.lr.number", false] },
                    { $ifNull: ["$$delivery.lr.no", false] },
                  ],
                },
                {
                  $eq: [
                    {
                      $cond: [
                        { $eq: [{ $type: "$$delivery.invoices" }, "array"] },
                        { $size: "$$delivery.invoices" },
                        0,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
          },
        };

        let query = [
          // filter the results by our accountId
          {
            $match: Object.assign(matches),
          },
          { $sort: { saleDate: -1, orderNo: -1 } },
        ];

        query.push(
          {
            $facet: {
              rows: [
                {
                  $addFields: {
                    deliveries: filteredDeliveriesExpression,
                  },
                },
                {
                  $unwind: "$deliveries",
                },
                {
                  $addFields: {
                    delivery: "$deliveries",
                  },
                },
                {
                  $unset: ["deliveries"],
                },
                {
                  $skip: safeStartRow,
                },
                {
                  $limit: pageSize,
                },
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
                          // isTransporter: 1,
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
                          // isTransporter: 1,
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
                    from: "organisations",
                    let: {
                      id: {
                        $toObjectId: "$delivery.lr.organisation",
                      },
                      deliveries: "$delivery",
                    },

                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$id"] },
                        },
                      },
                    ],
                    as: "delivery.lr.organisation",
                  },
                },
                {
                  $unwind: {
                    path: "$delivery.lr.organisation",
                    preserveNullAndEmptyArrays: true,
                  },
                },
              ],
              count: [
                {
                  $addFields: {
                    deliveries: filteredDeliveriesExpression,
                  },
                },
                {
                  $unwind: "$deliveries",
                },
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
              "rows.count": {
                $ifNull: [{ $arrayElemAt: ["$count.Total", 0] }, 0],
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: "$rows",
            },
          }
        );

        try {
          const deliveries = await Order.aggregate(query);

          res.json(deliveries);
        } catch (error) {
          console.log(error);
        }
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

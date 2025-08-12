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

        let matches = {
          account: new mongoose.Types.ObjectId(account),
          customer: new mongoose.Types.ObjectId(customer),
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
                  $skip: startRow,
                },
                {
                  $limit: endRow - startRow,
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
                  $addFields: {
                    delivery: "$deliveries",
                  },
                },
                { $unwind: "$delivery" },
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

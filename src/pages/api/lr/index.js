import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Organisation from "../../../models/Organisation";
import auth from "../../../auth";

export const lookups = [
  {
    $match: {
      "deliveries.lr": {
        $exists: true,
      },
    },
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
    $addFields: {
      delivery: "$deliveries",
    },
  },
  { $unwind: "$delivery" },
  {
    $lookup: {
      from: "addresses",
      let: {
        id: { $toObjectId: "$delivery.lr.consignor" },
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
      as: "delivery.lr.consignor",
    },
  },
  {
    $unwind: {
      path: "$delivery.lr.consignor",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "addresses",
      let: {
        id: { $toObjectId: "$delivery.lr.consignee" },
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
      as: "delivery.lr.consignee",
    },
  },
  {
    $unwind: {
      path: "$delivery.lr.consignee",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "organisations",
      let: {
        id: { $toObjectId: "$delivery.lr.organisation" },
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
      as: "delivery.lr.organisation",
    },
  },
  {
    $unwind: {
      path: "$delivery.lr.organisation",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "invoices",
      let: {
        id: "$delivery._id",
      },
      pipeline: [
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
        {
          $unwind: {
            path: "$deliveries",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $expr: {
              $eq: ["$deliveries.delivery", "$$id"],
            },
          },
        },
      ],
      as: "invoice",
    },
  },
];

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        // Get fields
        try {
          const order = await Order.findOne({
            _id: req.body.order,
          });

          // Get fields
          const updates = Object.keys(req.body);
          const lrFields = {};
          lrFields.createdBy = req.user.id;
          updates.forEach((update) => (lrFields[update] = req.body[update]));

          try {
            // Create
            order.deliveries = order.deliveries.map((delivery) => {
              if (delivery._id === req.body.delivery) {
                return {
                  ...delivery,
                  lr: lrFields,
                };
              } else {
                return delivery;
              }
            });
            await order.save();
            res.send(order);
          } catch (error) {
            console.log(error.message);
            res.status(500).send("Server Error");
          }
        } catch (error) {
          console.log(error.message);
          res.status(500).send("Server Error");
        }
      });

      break;

    case "PATCH":
      auth(req, res, async () => {
        try {
          const order = await Order.findOne({
            _id: req.body.order,
          });

          if (!order) {
            return res.status(404).send("No lr to update");
          }

          const updates = Object.keys(req.body);

          order.deliveries = order.deliveries.map((delivery) => {
            console.log(req.body.delivery);
            if (delivery._id === req.body.delivery) {
              let lr = delivery.lr || {};
              updates.forEach((update) => (lr[update] = req.body[update]));
              return {
                ...delivery,
                lr: lr,
              };
            } else {
              return delivery;
            }
          });
          console.log(order.deliveries[0].lr);

          // updates.forEach((update) => (lr[update] = req.body[update]));
          await order.save();

          const lrs = await Order.aggregate([
            {
              $match: Object.assign({
                _id: new mongoose.Types.ObjectId(req.body.order),
              }),
            },
            ...lookups,
          ]);

          res.send(lrs.find((lr) => lr.deliveries._id === req.body.delivery));
        } catch (error) {
          console.log(error.message);
          res.status(500).send("Server Error");
        }
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

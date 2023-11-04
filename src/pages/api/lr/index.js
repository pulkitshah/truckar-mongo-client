import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Organisation from "../../../models/Organisation";
import auth from "../../../auth";

export const lookups = [
  {
    $lookup: {
      from: "parties",
      let: {
        id: { $toObjectId: "$customer" },
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
      as: "customer",
    },
  },
  {
    $unwind: {
      path: "$customer",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $match: {
      "deliveries.lr": {
        $exists: true,
      },
    },
  },
  {
    $lookup: {
      from: "addresses",
      let: {
        id: { $toObjectId: "$deliveries.lr.consignor" },
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
      as: "deliveries.lr.consignor",
    },
  },
  {
    $unwind: {
      path: "$deliveries.lr.consignor",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "addresses",
      let: {
        id: { $toObjectId: "$deliveries.lr.consignee" },
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
      as: "deliveries.lr.consignee",
    },
  },
  {
    $unwind: {
      path: "$deliveries.lr.consignee",
      preserveNullAndEmptyArrays: true,
    },
  },

  {
    $lookup: {
      from: "organisations",
      let: {
        id: { $toObjectId: "$deliveries.lr.organisation" },
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
      as: "deliveries.lr.organisation",
    },
  },
  {
    $unwind: {
      path: "$deliveries.lr.organisation",
      preserveNullAndEmptyArrays: true,
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

          res.send(lrs[0]);
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

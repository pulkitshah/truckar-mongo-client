import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Organisation from "../../../models/Organisation";
import auth from "../../../auth";

export const lookups = [
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
      orderExpenses: { $first: "$orderExpenses" },
      saleType: { $first: "$saleType" },
      saleRate: { $first: "$saleRate" },
      minimumSaleGuarantee: { $first: "$minimumSaleGuarantee" },
      saleAdvance: { $first: "$saleAdvance" },
      purchaseType: { $first: "$purchaseType" },
      purchaseRate: { $first: "$purchaseRate" },
      minimumPurchaseGuarantee: { $first: "$minimumPurchaseGuarantee" },
      purchaseAdvance: { $first: "$purchaseAdvance" },
      transporter: { $first: "$transporter" },
      createdDate: { $first: "$createdDate" },
      account: { $first: "$account" },
      deliveries: { $push: "$deliveries" },
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
];

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        // Get fields
        const updates = Object.keys(req.body);
        const orderFields = {};
        orderFields.createdBy = req.user.id;
        updates.forEach((update) => (orderFields[update] = req.body[update]));

        try {
          // Create
          const order = new Order(orderFields);
          await order.save();
          res.send(order);
        } catch (error) {
          console.log(error.message);
          res.status(500).send("Server Error");
        }
      });

      break;

    case "PATCH":
      auth(req, res, async () => {
        const updates = Object.keys(req.body);
        try {
          const order = await Order.findOne({
            _id: req.body._id,
          })
            .populate("customer")
            .populate("transporter")
            .populate("driver")
            .populate("vehicle");

          if (!order) {
            return res.status(404).send("No order to update");
          }

          updates.forEach((update) => (order[update] = req.body[update]));
          await order.save();

          await order.populate("customer");
          await order.populate("transporter");
          await order.populate("driver");
          await order.populate("vehicle");

          console.log(order);

          const orders = await Order.aggregate([
            {
              $match: Object.assign({
                _id: new mongoose.Types.ObjectId(req.body._id),
              }),
            },
            ...lookups,
          ]);

          res.send(orders[0]);
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

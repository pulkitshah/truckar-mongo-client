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
  // {
  //   $lookup: {
  //     from: "vehicles",
  //     let: {
  //       id: "$vehicle",
  //     },
  //     pipeline: [
  //       {
  //         $match: {
  //           $expr: {
  //             $eq: ["$_id", "$$id"],
  //           },
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: "organisations",
  //           let: {
  //             id: "$organisation",
  //           },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $eq: ["$_id", "$$id"],
  //                 },
  //               },
  //             },
  //           ],
  //           as: "organisation",
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: "$organisation",
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //     ],
  //     as: "vehicle",
  //   },
  // },
  // {
  //   $unwind: {
  //     path: "$vehicle",
  //     preserveNullAndEmptyArrays: true,
  //   },
  // },
  // {
  //   $lookup: {
  //     from: "drivers",
  //     let: {
  //       id: "$driver",
  //     },
  //     pipeline: [
  //       {
  //         $match: {
  //           $expr: {
  //             $eq: ["$_id", "$$id"],
  //           },
  //         },
  //       },
  //       {
  //         $project: {
  //           name: 1,
  //           mobile: 1,
  //           _id: 1,
  //         },
  //       },
  //     ],
  //     as: "driver",
  //   },
  // },
  // {
  //   $unwind: {
  //     path: "$driver",
  //     preserveNullAndEmptyArrays: true,
  //   },
  // },
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
  // {
  //   $group: {
  //     _id: "$_id",
  //     orderNo: { $first: "$orderNo" },
  //     saleDate: { $first: "$saleDate" },
  //     customer: { $first: "$customer" },
  //     vehicleNumber: { $first: "$vehicleNumber" },
  //     vehicle: { $first: "$vehicle" },
  //     driver: { $first: "$driver" },
  //     orderExpenses: { $first: "$orderExpenses" },
  //     saleType: { $first: "$saleType" },
  //     saleRate: { $first: "$saleRate" },
  //     minimumSaleGuarantee: { $first: "$minimumSaleGuarantee" },
  //     saleAdvance: { $first: "$saleAdvance" },
  //     purchaseType: { $first: "$purchaseType" },
  //     purchaseRate: { $first: "$purchaseRate" },
  //     minimumPurchaseGuarantee: { $first: "$minimumPurchaseGuarantee" },
  //     purchaseAdvance: { $first: "$purchaseAdvance" },
  //     transporter: { $first: "$transporter" },
  //     createdDate: { $first: "$createdDate" },
  //     account: { $first: "$account" },
  //     deliveries: { $push: "$deliveries" },
  //   },
  // },
  { $sort: { saleDate: -1, orderNo: -1 } },
  {
    $addFields: {
      delivery: "$deliveries",
    },
  },
  { $unwind: "$delivery" },
];

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    default:
      res.status(400).json({ success: false });
      break;
  }
}

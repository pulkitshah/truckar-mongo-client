import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import Organisation from "../../../models/Organisation";
import auth from "../../../auth";

export const lookups = [
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
        deliveries: "$deliveries",
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
  {
    $lookup: {
      from: "addresses",
      let: {
        id: {
          $toObjectId: "$delivery.lr.consignor",
        },
      },

      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$id"] },
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
        id: {
          $toObjectId: "$delivery.lr.consignee",
        },
      },

      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$id"] },
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
  // {
  //   $lookup: {
  //     from: "invoices",
  //     let: {
  //       id: "$_id",
  //       delivery: { $toObjectId: "$deliveries._id" },
  //     },
  //     pipeline: [
  //       {
  //         $unwind: "$deliveries", // Unwind the nested array to access its elements individually
  //       },
  //       {
  //         $match: {
  //           $expr: {
  //             $eq: ["$deliveries._id", "$$id"],
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
  //     as: "invoices",
  //   },
  // },
  // { $unwind: "$invoices" },
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

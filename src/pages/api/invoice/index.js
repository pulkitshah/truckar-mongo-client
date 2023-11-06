import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Invoice from "../../../models/Invoice";
import auth from "../../../auth";

export const lookups = [
  {
    $lookup: {
      from: "addresses",
      let: {
        id: "$billingAddress",
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
      as: "billingAddress",
    },
  },
  {
    $unwind: {
      path: "$billingAddress",
      preserveNullAndEmptyArrays: true,
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
    $unwind: {
      path: "$deliveries",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "orders",
      let: {
        id: "$deliveries.order",
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
          $unwind: {
            path: "$deliveries",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "organisations",
            let: {
              id: {
                $toObjectId: "$deliveries.lr.organisation",
              },
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

        {
          $group: {
            _id: "$_id",
            orderNo: {
              $first: "$orderNo",
            },
            saleDate: {
              $first: "$saleDate",
            },
            createdDate: {
              $first: "$createdDate",
            },
            customer: {
              $first: "$customer",
            },
            vehicleNumber: {
              $first: "$vehicleNumber",
            },
            vehicle: {
              $first: "$vehicle",
            },
            driver: {
              $first: "$driver",
            },
            deliveries: { $push: "$deliveries" },
            orderExpenses: {
              $first: "$orderExpenses",
            },
            transporter: {
              $first: "$transporter",
            },
            saleType: {
              $first: "$saleType",
            },
            saleRate: {
              $first: "$saleRate",
            },
            minimumSaleGuarantee: {
              $first: "$minimumSaleGuarantee",
            },
            saleAdvance: {
              $first: "$saleAdvance",
            },
            purchaseType: {
              $first: "$purchaseType",
            },
            purchaseRate: {
              $first: "$purchaseRate",
            },
            minimumPurchaseGuarantee: {
              $first: "$minimumPurchaseGuarantee",
            },
            purchaseAdvance: {
              $first: "$purchaseAdvance",
            },
            account: {
              $first: "$account",
            },
          },
        },
      ],
      as: "deliveries.order",
    },
  },
  {
    $unwind: {
      path: "$deliveries.order",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $group: {
      _id: "$_id",
      invoiceFormat: {
        $first: "$invoiceFormat",
      },
      invoiceNo: {
        $first: "$invoiceNo",
      },
      invoiceDate: {
        $first: "$invoiceDate",
      },
      customer: {
        $first: "$customer",
      },
      organisation: {
        $first: "$organisation",
      },
      billingAddress: {
        $first: "$billingAddress",
      },
      deliveries: { $push: "$deliveries" },
      taxes: {
        $first: "$taxes",
      },
      account: {
        $first: "$account",
      },
    },
  },
];

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        try {
          // Get fields
          const updates = Object.keys(req.body);
          const invoiceFields = {};
          invoiceFields.createdBy = req.user.id;
          updates.forEach(
            (update) => (invoiceFields[update] = req.body[update])
          );

          console.log(invoiceFields);

          invoiceFields.deliveries = invoiceFields.deliveries.map(
            (delivery) => ({
              order: delivery._id,
              delivery: delivery.delivery,
              particular: delivery.particular,
              invoiceCharges: delivery.invoiceCharges,
            })
          );

          try {
            // Create
            const invoice = new Invoice(invoiceFields);
            await invoice.save();
            res.send(invoice);
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
        const updates = Object.keys(req.body);
        try {
          const invoice = await Invoice.findOne({
            _id: req.body._id,
          });

          if (!invoice) {
            return res.status(404).send("No invoice to update");
          }

          updates.forEach((update) => (invoice[update] = req.body[update]));

          invoice.deliveries = req.body.deliveries.map((delivery) => ({
            order: delivery._id,
            delivery: delivery.delivery,
            particular: delivery.particular,
            invoiceCharges: delivery.invoiceCharges,
          }));
          await invoice.save();

          res.send(invoice);

          const invoices = await Invoice.aggregate([
            {
              $match: Object.assign({
                _id: new mongoose.Types.ObjectId(req.body._id),
              }),
            },
            ...lookups,
          ]);

          res.send(invoice[0]);
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

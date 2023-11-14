import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Invoice from "../../../models/Invoice";
import auth from "../../../auth";
import Order from "../../../models/Order";

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

          // console.log(invoiceFields);

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

            invoiceFields.deliveries.map(async (delivery) => {
              const order = await Order.findOne({
                _id: delivery.order,
              });

              order.deliveries = order.deliveries.map((del) => {
                if (del._id === delivery.delivery._id) {
                  del.invoices = [
                    ...del.invoices,
                    `${req.body.organisation.initials}-${invoiceFields.invoiceNo}`,
                  ];
                  return del;
                } else {
                  return del;
                }
              });
              await order.save();
            });
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
          }).populate("organisation");

          if (!invoice) {
            return res.status(404).send("No invoice to update");
          }

          invoice.deliveries.map(async (invoiceDel) => {
            const doesDeliveryExist = req.body.deliveries.find(
              (reqDelivery) => {
                return (
                  reqDelivery._id === invoiceDel.order.toString() &&
                  reqDelivery.delivery._id === invoiceDel.delivery
                );
              }
            );

            if (!doesDeliveryExist) {
              const order = await Order.findOne({
                _id: invoiceDel.order,
              });

              order.deliveries = order.deliveries.map((orderDel) => {
                if (orderDel._id === invoiceDel.delivery) {
                  const index = orderDel.invoices.indexOf(
                    `${invoice.organisation.initials}-${invoice.invoiceNo}`
                  );

                  if (index !== -1) {
                    orderDel.invoices.splice(index, 1);
                  }
                  return orderDel;
                } else {
                  return orderDel;
                }
              });

              await order.save();
            }
          });

          req.body.deliveries.map(async (reqDelivery) => {
            const doesDeliveryNotExist = invoice.deliveries.find(
              (invoiceDel) => {
                return (
                  reqDelivery._id === invoiceDel.order.toString() &&
                  reqDelivery.delivery._id === invoiceDel.delivery
                );
              }
            );

            if (!doesDeliveryNotExist) {
              const order = await Order.findOne({
                _id: reqDelivery._id,
              });

              order.deliveries = order.deliveries.map((orderDel) => {
                if (orderDel._id === reqDelivery.delivery._id) {
                  orderDel.invoices = [
                    ...orderDel.invoices,
                    `${req.body.organisation.initials}-${req.body.invoiceNo}`,
                  ];
                  return orderDel;
                } else {
                  return orderDel;
                }
              });
              await order.save();
            }
          });

          updates.forEach((update) => (invoice[update] = req.body[update]));

          invoice.deliveries = req.body.deliveries.map((delivery) => ({
            order: delivery._id,
            delivery: delivery.delivery,
            particular: delivery.particular,
            invoiceCharges: delivery.invoiceCharges,
          }));
          await invoice.save();

          const invoices = await Invoice.aggregate([
            {
              $match: Object.assign({
                _id: new mongoose.Types.ObjectId(req.body._id),
              }),
            },
            ...lookups,
          ]);

          res.send(invoices[0]);
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

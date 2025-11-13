import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import Invoice from "../../../models/Invoice";
import auth from "../../../auth";
import Order from "../../../models/Order";

// Simplified lookups that only fetch essential data
export const basicLookups = [
  {
    $lookup: {
      from: "addresses",
      let: { id: "$billingAddress" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$id"] },
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
      let: { id: "$organisation" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$id"] },
          },
        },
        {
          $project: {
            name: 1,
            initials: 1,
            _id: 1,
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
      let: { id: "$customer" },
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
            _id: 1,
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
];

// Full lookups for detailed view (only used when fetching specific invoice)
export const lookups = [
  ...basicLookups,
  
  // Only add delivery/order data for single invoice fetches
  {
    $lookup: {
      from: "orders",
      let: { 
        deliveryOrders: {
          $map: {
            input: "$deliveries",
            as: "del",
            in: "$$del.order"
          }
        }
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: ["$_id", "$$deliveryOrders"]
            }
          }
        },
        {
          $project: {
            _id: 1,
            orderNo: 1,
            saleDate: 1,
            vehicleNumber: 1,
            deliveries: 1,
          }
        }
      ],
      as: "orderData",
    },
  },
  
  {
    $addFields: {
      deliveries: {
        $map: {
          input: "$deliveries",
          as: "delivery",
          in: {
            $mergeObjects: [
              "$$delivery",
              {
                order: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$orderData",
                        as: "order",
                        cond: { $eq: ["$$order._id", "$$delivery.order"] }
                      }
                    },
                    0
                  ]
                }
              }
            ]
          }
        }
      }
    }
  },
  
  {
    $project: {
      orderData: 0
    }
  }
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
          ], { allowDiskUse: true });

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

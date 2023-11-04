import dbConnect from "../../../lib/dbConnect";
import Order from "../../../models/Order";
import auth from "../../../auth";

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
          order = new Order(orderFields);
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
          });

          updates.forEach((update) => (order[update] = req.body[update]));

          await order.save();

          res.send(order);
        } catch (error) {
          console.log(error);
          // res.status(400).send(error);
        }
      });
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

import dbConnect from "../../../lib/dbConnect";
import Address from "../../../models/Address";
import auth from "../../../auth";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        try {
          // Get fields
          const updates = Object.keys(req.body);
          const addressFields = {};
          addressFields.createdBy = req.user.id;
          updates.forEach(
            (update) => (addressFields[update] = req.body[update])
          );

          try {
            // Create
            address = new Address(addressFields);
            await address.save();
            await address.populate("party");
            res.send(address);
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
          const address = await Address.findOne({
            _id: req.body._id,
          });

          updates.forEach((update) => (address[update] = req.body[update]));

          await address.save();
          await address.populate("party");

          res.send(address);
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

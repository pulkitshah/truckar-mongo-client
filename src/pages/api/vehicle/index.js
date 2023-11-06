import dbConnect from "../../../lib/dbConnect";
import Vehicle from "../../../models/Vehicle";
import auth from "../../../auth";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        // Get fields
        const updates = Object.keys(req.body);
        const vehicleFields = {};
        vehicleFields.createdBy = req.user.id;
        updates.forEach((update) => (vehicleFields[update] = req.body[update]));

        try {
          // Create
          const vehicle = new Vehicle(vehicleFields);
          await vehicle.save();
          res.send(vehicle);
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
          const vehicle = await Vehicle.findOne({
            _id: req.body._id,
          });

          updates.forEach((update) => (vehicle[update] = req.body[update]));

          await vehicle.save();

          res.send(vehicle);
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

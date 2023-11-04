import dbConnect from "../../../lib/dbConnect";
import Driver from "../../../models/Driver";
import auth from "../../../auth";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }

          // Get fields
          const updates = Object.keys(req.body);
          const driverFields = {};
          driverFields.createdBy = req.user.id;
          updates.forEach(
            (update) => (driverFields[update] = req.body[update])
          );

          try {
            // Create
            driver = new Driver(driverFields);
            await driver.save();
            res.send(driver);
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
          const driver = await Driver.findOne({
            _id: req.body._id,
          }).populate("vehicle");

          updates.forEach((update) => (driver[update] = req.body[update]));

          await driver.save();

          res.send(driver);
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

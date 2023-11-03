import dbConnect from "../../../../lib/dbConnect";
import Vehicle from "../../../../models/Vehicle";
import auth from "../../../../middleware";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { account, vehicleNumber } = JSON.parse(req.query.id);
        try {
          const query = {
            account: account,
          };
          if (vehicleNumber) {
            query.vehicleNumber = {
              $regex: `^${vehicleNumber}$`,
              $options: "i",
            };
          }

          const vehicle = await Vehicle.findOne(query);
          res.json(vehicle);
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

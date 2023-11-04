import dbConnect from "../../../lib/dbConnect";
import Vehicle from "../../../models/Vehicle";
import auth from "../../../auth";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { account, value } = JSON.parse(req.query.id);
        try {
          const query = {
            account: account,
          };
          if (value) {
            query.name = { $regex: value, $options: "i" };
            // query.name = new RegExp(`.*${value}*.`, "i");
          }
          const vehicles = await Vehicle.find(query).populate("organisation");
          res.json(vehicles);
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

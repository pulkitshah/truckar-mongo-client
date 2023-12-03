import dbConnect from "../../../../lib/dbConnect";
import Driver from "../../../../models/Driver";
import moment from "moment/moment";
import { emitDriverLocationUpdate } from "../../socket/emit";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      const { id, lat, long } = JSON.parse(req.query.id);
      try {
        const query = {
          _id: id,
        };

        const driver = await Driver.findOne(query);
        if (!driver) res.json(null);

        driver.lat = lat;
        driver.long = long;
        driver.locationUpdatedDate = moment();

        await driver.save();
        // console.log("welcome");
        emitDriverLocationUpdate(res, driver);
        res.json(driver);
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
      }

      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

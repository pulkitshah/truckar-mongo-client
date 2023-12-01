import dbConnect from "../../../../lib/dbConnect";
import Driver from "../../../../models/Driver";
import auth from "../../../../auth";
import moment from "moment";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      const { id, otp } = JSON.parse(req.query.id);
      console.log(otp);
      try {
        const query = {
          otp,
        };

        const driver = await Driver.findOne(query);
        if (!driver) res.json(null);

        console.log(driver);

        if (
          driver.otp.toString() === otp &&
          moment().valueOf() -
            moment(driver.otpCreatedDate, "YYYYMMDD").valueOf() <
            86400000
        ) {
          driver.otp = null;
          driver.otpCreatedDate = null;
          // await driver.save();
          res.json(driver);
        }

        res.json(null);
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

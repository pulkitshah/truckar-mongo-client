import dbConnect from "../../../../lib/dbConnect";
import Driver from "../../../../models/Driver";
import auth from "../../../../auth";
import moment from "moment/moment";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        console.log(req.query);
        const id = req.query.id;
        try {
          const query = {
            _id: id,
          };
          const driver = await Driver.findOne(query);

          driver.otp = Math.floor(100000 + Math.random() * 900000);
          driver.otpCreatedDate = moment();
          driver.save();
          res.json(driver);
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

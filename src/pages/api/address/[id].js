import dbConnect from "../../../lib/dbConnect";
import Address from "../../../models/Address";
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
          const addresses = await Address.find(query).populate("party");

          res.json(addresses);
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

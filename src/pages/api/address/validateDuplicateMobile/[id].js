import dbConnect from "../../../lib/dbConnect";
import Address from "../../../../models/Address";
import auth from "../../../middleware";

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
            query.mobile = value;
          }

          const address = await Address.findOne(query);
          res.json(address);
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

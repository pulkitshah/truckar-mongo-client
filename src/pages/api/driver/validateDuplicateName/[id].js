import dbConnect from "../../../../lib/dbConnect";
import Driver from "../../../../models/Driver";
import auth from "../../../../middleware";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { account, name } = JSON.parse(req.query.id);
        try {
          const query = {
            account,
          };
          if (name) {
            query.name = { $regex: `^${name}$`, $options: "i" };
          }
          const driver = await Driver.findOne(query);
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

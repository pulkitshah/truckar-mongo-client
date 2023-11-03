import dbConnect from "../../../../lib/dbConnect";
import Organisation from "../../../../models/Organisation";
import auth from "../../../../middleware";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { account, organisationNumber } = JSON.parse(req.query.id);
        try {
          const query = {
            account: account,
          };
          if (organisationNumber) {
            query.organisationNumber = {
              $regex: `^${organisationNumber}$`,
              $options: "i",
            };
          }
          const organisation = await Organisation.findOne(query);
          res.json(organisation);
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

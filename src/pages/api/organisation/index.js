import dbConnect from "../../../lib/dbConnect";
import Organisation from "../../../models/Organisation";
import auth from "../../../auth";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        try {
          // Get fields
          const updates = Object.keys(req.body);
          const organisationFields = {};
          organisationFields.createdBy = req.user.id;
          updates.forEach(
            (update) => (organisationFields[update] = req.body[update])
          );

          try {
            // Create
            organisation = new Organisation(organisationFields);
            await organisation.save();
            res.send(organisation);
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
          const organisation = await Organisation.findOne({
            _id: req.body._id,
          });

          updates.forEach(
            (update) => (organisation[update] = req.body[update])
          );

          await organisation.save();

          res.send(organisation);
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

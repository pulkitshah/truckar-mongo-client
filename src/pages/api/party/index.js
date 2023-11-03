import dbConnect from "../../../lib/dbConnect";
import Party from "../../../models/Party";
import auth from "../../../middleware";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "POST":
      auth(req, res, async () => {
        // Get fields
        const updates = Object.keys(req.body);
        const partyFields = {};
        partyFields.createdBy = req.user.id;
        updates.forEach((update) => (partyFields[update] = req.body[update]));

        try {
          // Create
          party = new Party(partyFields);
          await party.save();
          res.send(party);
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
          const party = await Party.findOne({
            _id: req.body._id,
          });

          updates.forEach((update) => (party[update] = req.body[update]));

          await party.save();

          res.send(party);
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

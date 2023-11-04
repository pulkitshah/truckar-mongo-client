import dbConnect from "../../../../lib/dbConnect";
import Order from "../../../../models/Order";
import auth from "../../../../auth";
import { getFiscalYearTimestamps } from "../../../../utils/get-fiscal-year";

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      auth(req, res, async () => {
        const { account, invoiceDate, invoiceNo, organisation } = JSON.parse(
          req.query.id
        );
        try {
          let timestamps = getFiscalYearTimestamps(invoiceDate);
          const query = {
            account: account,
            invoiceNo: invoiceNo,
            invoiceDate: {
              $gte: timestamps.current.start,
              $lte: timestamps.current.end,
            },
            organisation: organisation,
          };

          const invoice = await Invoice.findOne(query);
          console.log(invoice);

          res.json(invoice);
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

import mongoose from "mongoose";
import dbConnect from "../../../../lib/dbConnect";
import Invoice from "../../../../models/Invoice";
import auth from "../../../../auth";
import { getFiscalYearTimestamps } from "../../../../utils/get-fiscal-year";

const toObjectId = (value, label) => {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return new mongoose.Types.ObjectId(value);
};

export default async function handler(req, res) {
  const { method } = req;
  await dbConnect();

  if (method === "GET") {
    auth(req, res, async () => {
      try {
        const { account, organisation, invoiceDate } = JSON.parse(
          req.query.id || "{}"
        );

        const accountId = toObjectId(account, "account");
        const organisationId = toObjectId(organisation, "organisation");
        const baseDate = invoiceDate ? new Date(invoiceDate) : new Date();
        const { current } = getFiscalYearTimestamps(baseDate);

        const start = current.start.toDate();
        const end = current.end.toDate();

        const pipeline = [
          {
            $match: {
              account: accountId,
              organisation: organisationId,
              invoiceDate: {
                $gte: start,
                $lte: end,
              },
            },
          },
          {
            $group: {
              _id: null,
              maxInvoiceNo: {
                $max: {
                  $convert: {
                    input: "$invoiceNo",
                    to: "double",
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
          },
        ];

        const result = await Invoice.aggregate(pipeline, {
          allowDiskUse: true,
        });
        const maxInvoiceNo = result?.[0]?.maxInvoiceNo ?? null;

        const nextInvoiceNo =
          (Number.isFinite(maxInvoiceNo) ? Math.floor(maxInvoiceNo) : 0) + 1;

        res.status(200).json({ nextInvoiceNo });
      } catch (error) {
        console.error(error.message);
        res.status(400).json({ error: error.message });
      }
    });
    return;
  }

  res.status(400).json({ success: false });
}

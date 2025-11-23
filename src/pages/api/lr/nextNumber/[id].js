import mongoose from "mongoose";
import dbConnect from "../../../../lib/dbConnect";
import Order from "../../../../models/Order";
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
        const { account, organisation, lrDate } = JSON.parse(req.query.id);

        const accountId = toObjectId(account, "account");
        const organisationId = toObjectId(organisation, "organisation");

        const { current } = getFiscalYearTimestamps(lrDate || new Date());
        const start = current.start.toDate();
        const end = current.end.toDate();

        const pipeline = [
          {
            $match: {
              account: accountId,
              "deliveries.lr.organisation": organisationId,
              "deliveries.lr.lrDate": {
                $gte: start,
                $lte: end,
              },
            },
          },
          {
            $project: {
              deliveries: 1,
            },
          },
          { $unwind: "$deliveries" },
          {
            $match: {
              "deliveries.lr.organisation": organisationId,
              "deliveries.lr.lrDate": {
                $gte: start,
                $lte: end,
              },
            },
          },
          {
            $group: {
              _id: null,
              maxLrNo: {
                $max: {
                  $convert: {
                    input: "$deliveries.lr.lrNo",
                    to: "double",
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
          },
        ];

        const result = await Order.aggregate(pipeline, { allowDiskUse: true });
        const maxLrNo = result?.[0]?.maxLrNo ?? null;

        const nextLrNo =
          (Number.isFinite(maxLrNo) ? Math.floor(maxLrNo) : 0) + 1;

        res.status(200).json({ nextLrNo });
      } catch (error) {
        console.error(error.message);
        res.status(400).json({ error: error.message });
      }
    });
    return;
  }

  res.status(400).json({ success: false });
}

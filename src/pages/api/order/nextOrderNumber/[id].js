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
        const { account, saleDate } = JSON.parse(req.query.id || "{}");

        const accountId = toObjectId(account, "account");
        const baseDate = saleDate ? new Date(saleDate) : new Date();
        const { current } = getFiscalYearTimestamps(baseDate);

        const start = current.start.toDate();
        const end = current.end.toDate();

        const pipeline = [
          {
            $match: {
              account: accountId,
              saleDate: {
                $gte: start,
                $lte: end,
              },
            },
          },
          {
            $group: {
              _id: null,
              maxOrderNo: {
                $max: {
                  $convert: {
                    input: "$orderNo",
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
        const maxOrderNo = result?.[0]?.maxOrderNo ?? null;

        const nextOrderNo =
          (Number.isFinite(maxOrderNo) ? Math.floor(maxOrderNo) : 0) + 1;

        res.json({ nextOrderNo });
      } catch (error) {
        console.error(error.message);
        res
          .status(
            error.message?.includes("Invalid") ||
              error.message?.includes("required")
              ? 400
              : 500
          )
          .json({ error: error.message });
      }
    });
    return;
  }

  res.status(400).json({ success: false });
}

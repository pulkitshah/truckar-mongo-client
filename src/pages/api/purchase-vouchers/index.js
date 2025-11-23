import mongoose from "mongoose";
import dbConnect from "../../../lib/dbConnect";
import auth from "../../../auth";
import PurchaseVoucher from "../../../models/PurchaseVoucher";
import "../../../models/Organisation";

const toObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  try {
    return new mongoose.Types.ObjectId(value);
  } catch (error) {
    return null;
  }
};

const normalisePeriod = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

const normaliseDate = (value) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

export default async function handler(req, res) {
  await dbConnect();
  const { method } = req;

  switch (method) {
    case "GET":
      return auth(req, res, async () => {
        try {
          const { account } = req.query;

          if (!account) {
            return res.status(400).json({ message: "Account is required" });
          }

          const accountId = toObjectId(account);

          if (!accountId) {
            return res.status(400).json({ message: "Invalid account" });
          }

          const vouchers = await PurchaseVoucher.aggregate([
            {
              $match: {
                account: accountId,
              },
            },
            {
              $lookup: {
                from: "parties",
                localField: "transporter",
                foreignField: "_id",
                as: "transporter",
              },
            },
            {
              $unwind: "$transporter",
            },
            {
              $lookup: {
                from: "organisations",
                localField: "organisation",
                foreignField: "_id",
                as: "organisation",
              },
            },
            {
              $unwind: {
                path: "$organisation",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $sort: {
                period: -1,
                voucherDate: -1,
                createdAt: -1,
              },
            },
          ]);

          return res.status(200).json(vouchers);
        } catch (error) {
          console.error("[Purchase Voucher API][GET]", error);
          return res.status(500).json({ message: "Internal server error" });
        }
      });

    case "POST":
      return auth(req, res, async () => {
        try {
          const {
            account,
            transporter,
            organisation,
            amount,
            period,
            voucherDate,
            status = "pending",
            paymentDate,
            reference,
            notes,
          } = req.body;

          const accountId = toObjectId(account);
          const transporterId = toObjectId(transporter);
          const organisationId = toObjectId(organisation);
          const periodDate = normalisePeriod(period);

          if (!accountId) {
            return res.status(400).json({ message: "Account is required" });
          }

          if (!transporterId) {
            return res.status(400).json({ message: "Transporter is required" });
          }

          if (!organisationId) {
            return res
              .status(400)
              .json({ message: "Organisation is required" });
          }

          if (
            typeof amount !== "number" ||
            Number.isNaN(amount) ||
            amount < 0
          ) {
            return res
              .status(400)
              .json({ message: "Valid amount is required" });
          }

          if (!periodDate) {
            return res
              .status(400)
              .json({ message: "Valid period is required" });
          }

          const currentUserId = toObjectId(req.user?._id || req.user?.id);

          const voucher = await PurchaseVoucher.create({
            account: accountId,
            transporter: transporterId,
             organisation: organisationId,
            amount,
            period: periodDate,
            voucherDate: normaliseDate(voucherDate) || new Date(),
            status,
            paymentDate:
              status === "done"
                ? normaliseDate(paymentDate) || new Date()
                : null,
            reference,
            notes,
            createdBy: currentUserId,
            updatedBy: currentUserId,
          });

          await voucher.populate([
            { path: "transporter" },
            { path: "organisation" },
          ]);

          return res.status(201).json(voucher.toJSON());
        } catch (error) {
          console.error("[Purchase Voucher API][POST]", error);
          return res.status(500).json({
            message: error?.message || "Internal server error",
          });
        }
      });

    default:
      return res.status(405).json({ message: "Method not allowed" });
  }
}

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
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
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
          const { id } = req.query;
          const voucherId = toObjectId(id);

          if (!voucherId) {
            return res.status(400).json({ message: "Invalid voucher id" });
          }

          const voucher = await PurchaseVoucher.findById(voucherId)
            .populate("transporter")
            .populate("organisation")
            .lean();

          if (!voucher) {
            return res.status(404).json({ message: "Voucher not found" });
          }

          return res.status(200).json(voucher);
        } catch (error) {
          console.error("[Purchase Voucher API][GET:id]", error);
          return res.status(500).json({ message: "Internal server error" });
        }
      });

    case "PATCH":
      return auth(req, res, async () => {
        try {
          const { id } = req.query;
          const voucherId = toObjectId(id);

          if (!voucherId) {
            return res.status(400).json({ message: "Invalid voucher id" });
          }

          const {
            transporter,
            organisation,
            amount,
            period,
            voucherDate,
            status,
            paymentDate,
            reference,
            notes,
          } = req.body;

          const updateFields = {};

          if (transporter) {
            const transporterId = toObjectId(transporter);
            if (!transporterId) {
              return res.status(400).json({ message: "Invalid transporter" });
            }
            updateFields.transporter = transporterId;
          }

          if (organisation) {
            const organisationId = toObjectId(organisation);
            if (!organisationId) {
              return res.status(400).json({ message: "Invalid organisation" });
            }
            updateFields.organisation = organisationId;
          }

          if (typeof amount === "number") {
            if (Number.isNaN(amount) || amount < 0) {
              return res.status(400).json({ message: "Invalid amount" });
            }
            updateFields.amount = amount;
          }

          const periodDate = normalisePeriod(period);
          if (periodDate) {
            updateFields.period = periodDate;
          }

          const voucherDateValue = normaliseDate(voucherDate);
          if (voucherDateValue) {
            updateFields.voucherDate = voucherDateValue;
          }

          if (status && ["pending", "done"].includes(status)) {
            updateFields.status = status;
            updateFields.paymentDate =
              status === "done"
                ? normaliseDate(paymentDate) || new Date()
                : null;
          } else if (status) {
            return res.status(400).json({ message: "Invalid status" });
          } else if (paymentDate) {
            updateFields.paymentDate = normaliseDate(paymentDate);
          }

          if (reference !== undefined) {
            updateFields.reference = reference;
          }

          if (notes !== undefined) {
            updateFields.notes = notes;
          }

          const currentUserId = toObjectId(req.user?._id || req.user?.id);
          if (currentUserId) {
            updateFields.updatedBy = currentUserId;
          }

          updateFields.updatedAt = new Date();

          const voucher = await PurchaseVoucher.findByIdAndUpdate(
            voucherId,
            { $set: updateFields },
            { new: true }
          )
            .populate("transporter")
            .populate("organisation")
            .lean();

          if (!voucher) {
            return res.status(404).json({ message: "Voucher not found" });
          }

          return res.status(200).json(voucher);
        } catch (error) {
          console.error("[Purchase Voucher API][PATCH:id]", error);
          return res.status(500).json({ message: "Internal server error" });
        }
      });

    default:
      return res.status(405).json({ message: "Method not allowed" });
  }
}

import mongoose from "mongoose";

const purchaseVoucherSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: true,
    },
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "party",
      required: true,
    },
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organisation",
    },
    period: {
      type: Date,
      required: true,
    },
    voucherDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
    },
    paymentDate: {
      type: Date,
    },
    reference: {
      type: String,
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    timestamps: true,
  }
);

purchaseVoucherSchema.get(function () {
  return this._id.toHexString();
});

purchaseVoucherSchema.set("toJSON", {
  virtuals: true,
});

export default mongoose.models.purchasevoucher ||
  mongoose.model("purchasevoucher", purchaseVoucherSchema);

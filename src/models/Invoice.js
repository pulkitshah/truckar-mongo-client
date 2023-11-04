import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  invoiceFormat: { type: String },
  invoiceNo: {
    type: String,
  },
  invoiceType: {
    type: String,
  },
  invoiceDate: {
    type: Date,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "customer",
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "organisation",
  },
  billingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "address",
  },
  deliveries: [
    {
      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "order",
      },
      delivery: {
        type: String,
      },
      invoiceCharges: {
        type: Array,
      },
      particular: {
        type: String,
      },
    },
  ],
  taxes: {
    type: Array,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
  },
});

invoiceSchema.get(function () {
  return this._id.toHexString();
});

invoiceSchema.set("toJSON", {
  virtuals: true,
});

module.exports =
  mongoose.models.invoice || mongoose.model("invoice", invoiceSchema);

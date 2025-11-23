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
    ref: "party",
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
  subtotal: {
    type: Number,
  },
  taxes: {
    type: Array,
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid"],
    default: "unpaid",
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  paidDate: {
    type: Date,
    // null for unpaid invoices
  },
  dueDate: {
    type: Date,
    // Can be calculated as invoiceDate + payment terms
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

export default mongoose.models.invoice ||
  mongoose.model("invoice", invoiceSchema);

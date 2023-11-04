import mongoose from "mongoose";
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({
  orderNo: {
    type: Number,
  },
  saleDate: {
    type: Date,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "party",
  },
  vehicleNumber: {
    type: String,
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "vehicle",
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "driver",
  },
  deliveries: {
    type: Array,
  },
  orderExpenses: {
    type: Array,
  },
  transporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "party",
  },
  saleType: {
    type: Object,
  },
  saleRate: {
    type: Number,
  },
  minimumSaleGuarantee: {
    type: Number,
  },
  saleAdvance: {
    type: Number,
  },
  purchaseType: {
    type: String,
  },
  purchaseRate: {
    type: Number,
  },
  minimumPurchaseGuarantee: {
    type: Number,
  },
  purchaseAdvance: {
    type: Number,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "account",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
});

orderSchema.get(function () {
  return this._id.toHexString();
});

orderSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.models.order || mongoose.model("order", orderSchema);

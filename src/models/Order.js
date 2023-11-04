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
  deliveries: [
    {
      _id: {
        type: String,
      },
      billQuantity: {
        type: Number,
      },
      unloadingQuantity: {
        type: Number,
      },
      loading: {
        type: Object,
      },
      unloading: {
        type: Object,
      },
      weighbridgeName: {
        type: String,
      },

      remarks: {
        type: String,
      },
      status: {
        type: String,
      },

      lr: {
        lrFormat: { type: String },
        lrNo: {
          type: Number,
        },
        lrDate: {
          type: Date,
        },
        organisation: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "organisation",
        },
        consignor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "address",
        },
        consignee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "address",
        },
        descriptionOfGoods: {
          type: Object,
        },
        dimesnionsLength: { type: String },
        dimesnionsBreadth: { type: String },
        dimesnionsHeight: { type: String },
        fareBasis: { type: String },
        valueOfGoods: { type: String },
        chargedWeight: { type: String },
        insuranceCompany: { type: String },
        insuranceDate: { type: String },
        insurancePolicyNo: { type: String },
        insuranceAmount: { type: String },
        ewayBillNo: { type: String },
        ewayBillExpiryDate: { type: String },
        gstPayableBy: { type: String },
        lrCharges: {
          type: Object,
        },
      },
    },
  ],
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

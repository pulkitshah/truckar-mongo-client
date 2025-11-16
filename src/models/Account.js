import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  orderExpensesSettings: {
    type: Array,
  },
  lrSettings: {
    type: Array,
  },
  taxOptions: {
    type: Array,
  },
  lrFormat: {
    type: String,
  },
  invoiceFormat: {
    type: String,
  },
  analyticsSettings: {
    type: Object,
    default: {
      monthlyTargets: {
        sales: null,
        profit: null,
        orders: null,
        profitMargin: null,
      },
      thresholds: {
        maxExpenseRatio: 15,
        minProfitMargin: 15,
        minDocumentCompletion: 80,
        minFleetUtilization: 70,
      },
      alertSettings: {
        outstandingDaysThreshold: 30,
        pendingLRDaysThreshold: 7,
        pendingInvoiceDaysThreshold: 15,
      },
    },
  },
});

accountSchema.get(function () {
  return this._id.toHexString();
});

accountSchema.set("toJSON", {
  virtuals: true,
});

export default mongoose.models.account ||
  mongoose.model("account", accountSchema);

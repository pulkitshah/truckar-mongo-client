import mongoose from "mongoose";
import validator from "validator";

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
});

accountSchema.get(function () {
  return this._id.toHexString();
});

accountSchema.set("toJSON", {
  virtuals: true,
});

export default mongoose.models.account ||
  mongoose.model("account", accountSchema);

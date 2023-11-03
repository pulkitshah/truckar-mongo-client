import mongoose from "mongoose";
const Schema = mongoose.Schema;

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: "vehicle",
  },
  organisation: {
    type: Schema.Types.ObjectId,
    ref: "organisation",
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

driverSchema.get(function () {
  return this._id.toHexString();
});

driverSchema.set("toJSON", {
  virtuals: true,
});

module.exports =
  mongoose.models.driver || mongoose.model("driver", driverSchema);

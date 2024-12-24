import mongoose from "mongoose";
const Schema = mongoose.Schema;

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    trim: true,
    required: true,
  },
  make: {
    type: String,
    trim: true,
  },
  model: {
    type: String,
    trim: true,
  },
  yearOfPurchase: {
    type: String,
    trim: true,
  },
  condition: {
    type: String,
    trim: true,
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

vehicleSchema.get(function () {
  return this._id.toHexString();
});

vehicleSchema.set("toJSON", {
  virtuals: true,
});

export default mongoose.models.vehicle ||
  mongoose.model("vehicle", vehicleSchema);

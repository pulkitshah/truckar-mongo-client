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
  otp: {
    type: Number,
    trim: true,
  },
  otpCreatedDate: {
    type: Date,
  },
  locationUpdatedDate: {
    type: Date,
  },
  lat: {
    type: Number,
    trim: true,
  },
  long: {
    type: Number,
    trim: true,
  },
  currentOrder: {
    type: Schema.Types.ObjectId,
    ref: "order",
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

// export default
//   mongoose.models.driver || mongoose.model("driver", driverSchema);

export default mongoose.models.driver || mongoose.model("driver", driverSchema);

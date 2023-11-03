import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Create Schema
const partySchema = new Schema({
  name: {
    type: String,
    max: 100,
  },
  city: {
    type: Object,
  },
  mobile: {
    type: String,
  },
  waId: {
    type: String,
    required: false,
  },
  isTransporter: {
    type: Boolean,
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

partySchema.get(function () {
  return this._id.toHexString();
});

partySchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.models.party || mongoose.model("party", partySchema);

import mongoose from "mongoose"

const ActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ["walking", "running", "biking", "driving"],
    required: true,
  },
  distance: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  maintenanceCost: {
    type: Number,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt field on save
ActivitySchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

export const ActivityModel = mongoose.models.Activity || mongoose.model("Activity", ActivitySchema)

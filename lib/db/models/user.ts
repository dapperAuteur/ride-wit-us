import mongoose from "mongoose"

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "manager", "admin"],
    default: "user",
  },
  subscriptionStatus: {
    type: String,
    enum: ["free", "monthly", "annual", "none"],
    default: "free",
  },
  subscriptionExpiry: {
    type: Date,
  },
  stripeCustomerId: {
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
UserSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema)


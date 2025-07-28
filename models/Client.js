import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a client name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Please add a phone number"],
      trim: true,
      maxlength: [20, "Phone number cannot be more than 20 characters"],
    },
    company: {
      type: String,
      required: [true, "Please add a company name"],
      trim: true,
      maxlength: [100, "Company name cannot be more than 100 characters"],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, "Address cannot be more than 200 characters"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
clientSchema.index({ name: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ company: 1 });
clientSchema.index({ status: 1 });

// Virtual populate for projects
clientSchema.virtual("projects", {
  ref: "Project",
  localField: "_id",
  foreignField: "clientId",
  justOne: false,
});

// Virtual for project count
clientSchema.virtual("projectCount", {
  ref: "Project",
  localField: "_id",
  foreignField: "clientId",
  count: true,
});

// Middleware to remove associated projects when client is deleted
clientSchema.pre("remove", async function (next) {
  try {
    await this.model("Project").deleteMany({ clientId: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Client", clientSchema);

import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a project title"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a project description"],
      trim: true,
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    clientId: {
      type: mongoose.Schema.ObjectId,
      ref: "Client",
      required: [true, "Please specify a client"],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    startDate: {
      type: Date,
      required: [true, "Please add a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please add an end date"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    budget: {
      type: Number,
      required: [true, "Please add a budget"],
      min: [0, "Budget cannot be negative"],
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Please specify who created this project"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
projectSchema.index({ title: 1 });
projectSchema.index({ clientId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ endDate: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ createdAt: -1 });

// Compound indexes for common queries
projectSchema.index({ clientId: 1, status: 1 });
projectSchema.index({ status: 1, startDate: 1 });

// Virtual to populate client details
projectSchema.virtual("client", {
  ref: "Client",
  localField: "clientId",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate creator details
projectSchema.virtual("creator", {
  ref: "User",
  localField: "createdBy",
  foreignField: "_id",
  justOne: true,
});

// Virtual for project duration in days
projectSchema.virtual("durationDays").get(function () {
  const timeDiff = this.endDate.getTime() - this.startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for progress percentage (based on dates)
projectSchema.virtual("progressPercentage").get(function () {
  if (this.status === "completed") return 100;
  if (this.status === "pending") return 0;

  const now = new Date();
  const totalDuration = this.endDate.getTime() - this.startDate.getTime();
  const elapsed = now.getTime() - this.startDate.getTime();

  if (elapsed < 0) return 0;
  if (elapsed > totalDuration) return 100;

  return Math.round((elapsed / totalDuration) * 100);
});

// Middleware to validate client exists before saving
projectSchema.pre("save", async function (next) {
  if (this.isModified("clientId")) {
    const Client = mongoose.model("Client");
    const client = await Client.findById(this.clientId);

    if (!client) {
      return next(new Error("Client not found"));
    }

    if (client.status === "inactive") {
      return next(new Error("Cannot create project for inactive client"));
    }
  }
  next();
});

export default mongoose.model("Project", projectSchema);

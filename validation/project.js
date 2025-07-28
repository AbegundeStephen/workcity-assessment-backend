import Joi from "joi";
import mongoose from "mongoose";

// Custom validator for MongoDB ObjectId
const objectId = Joi.string()
  .custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error("any.invalid");
    }
    return value;
  })
  .messages({
    "any.invalid": "Invalid ID format",
  });

// Create project validation
const createProjectSchema = Joi.object({
  title: Joi.string().min(2).max(200).trim().required().messages({
    "string.base": "Title must be a string",
    "string.empty": "Title is required",
    "string.min": "Title must be at least 2 characters long",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),

  description: Joi.string().min(10).max(2000).trim().required().messages({
    "string.base": "Description must be a string",
    "string.empty": "Description is required",
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),

  clientId: objectId.required().messages({
    "any.required": "Client ID is required",
  }),

  status: Joi.string()
    .valid("pending", "in-progress", "completed")
    .default("pending")
    .messages({
      "any.only": "Status must be pending, in-progress, or completed",
    }),

  startDate: Joi.date().required().messages({
    "date.base": "Start date must be a valid date",
    "any.required": "Start date is required",
  }),

  endDate: Joi.date().greater(Joi.ref("startDate")).required().messages({
    "date.base": "End date must be a valid date",
    "date.greater": "End date must be after start date",
    "any.required": "End date is required",
  }),

  budget: Joi.number().min(0).required().messages({
    "number.base": "Budget must be a number",
    "number.min": "Budget cannot be negative",
    "any.required": "Budget is required",
  }),
});

// Update project validation (all fields optional except validation rules)
const updateProjectSchema = Joi.object({
  title: Joi.string().min(2).max(200).trim().messages({
    "string.base": "Title must be a string",
    "string.min": "Title must be at least 2 characters long",
    "string.max": "Title cannot exceed 200 characters",
  }),

  description: Joi.string().min(10).max(2000).trim().messages({
    "string.base": "Description must be a string",
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 2000 characters",
  }),

  clientId: objectId,

  status: Joi.string().valid("pending", "in-progress", "completed").messages({
    "any.only": "Status must be pending, in-progress, or completed",
  }),

  startDate: Joi.date().messages({
    "date.base": "Start date must be a valid date",
  }),

  endDate: Joi.date()
    .when("startDate", {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref("startDate")),
      otherwise: Joi.date(),
    })
    .messages({
      "date.base": "End date must be a valid date",
      "date.greater": "End date must be after start date",
    }),

  budget: Joi.number().min(0).messages({
    "number.base": "Budget must be a number",
    "number.min": "Budget cannot be negative",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Query validation for filtering
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  search: Joi.string().trim().allow(""),

  status: Joi.string().valid("pending", "in-progress", "completed"),

  clientId: objectId,

  sortBy: Joi.string()
    .valid(
      "title",
      "status",
      "startDate",
      "endDate",
      "budget",
      "createdAt",
      "updatedAt"
    )
    .default("createdAt"),

  sortOrder: Joi.string().valid("asc", "desc").default("desc"),

  startDateFrom: Joi.date(),
  startDateTo: Joi.date(),
  endDateFrom: Joi.date(),
  endDateTo: Joi.date(),

  budgetMin: Joi.number().min(0),
  budgetMax: Joi.number().min(0),
});

// Validation middleware
const validateCreateProject = (req, res, next) => {
  const { error } = createProjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      details: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateUpdateProject = (req, res, next) => {
  const { error } = updateProjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      details: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateProjectQuery = (req, res, next) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      status: "error",
      message: "Invalid query parameters",
      details: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  req.query = value;
  next();
};


export {
  createProjectSchema,
  updateProjectSchema,
  querySchema,
  validateCreateProject,
  validateUpdateProject,
  validateProjectQuery,
};
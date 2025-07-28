import Joi from "joi";

// Create client validation
const createClientSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name cannot exceed 100 characters",
    "any.required": "Name is required",
  }),

  email: Joi.string().email().lowercase().required().messages({
    "string.base": "Email must be a string",
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  phone: Joi.string().min(10).max(20).trim().required().messages({
    "string.base": "Phone must be a string",
    "string.empty": "Phone is required",
    "string.min": "Phone must be at least 10 characters long",
    "string.max": "Phone cannot exceed 20 characters",
    "any.required": "Phone is required",
  }),

  company: Joi.string().min(2).max(100).trim().required().messages({
    "string.base": "Company must be a string",
    "string.empty": "Company is required",
    "string.min": "Company must be at least 2 characters long",
    "string.max": "Company cannot exceed 100 characters",
    "any.required": "Company is required",
  }),

  address: Joi.string().max(200).trim().allow("").messages({
    "string.base": "Address must be a string",
    "string.max": "Address cannot exceed 200 characters",
  }),

  status: Joi.string().valid("active", "inactive").default("active").messages({
    "any.only": "Status must be either active or inactive",
  }),
});

// Update client validation (all fields optional)
const updateClientSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().messages({
    "string.base": "Name must be a string",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name cannot exceed 100 characters",
  }),

  email: Joi.string().email().lowercase().messages({
    "string.base": "Email must be a string",
    "string.email": "Please provide a valid email address",
  }),

  phone: Joi.string().min(10).max(20).trim().messages({
    "string.base": "Phone must be a string",
    "string.min": "Phone must be at least 10 characters long",
    "string.max": "Phone cannot exceed 20 characters",
  }),

  company: Joi.string().min(2).max(100).trim().messages({
    "string.base": "Company must be a string",
    "string.min": "Company must be at least 2 characters long",
    "string.max": "Company cannot exceed 100 characters",
  }),

  address: Joi.string().max(200).trim().allow("").messages({
    "string.base": "Address must be a string",
    "string.max": "Address cannot exceed 200 characters",
  }),

  status: Joi.string().valid("active", "inactive").messages({
    "any.only": "Status must be either active or inactive",
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

  status: Joi.string().valid("active", "inactive"),

  sortBy: Joi.string()
    .valid("name", "company", "createdAt", "updatedAt")
    .default("createdAt"),

  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

// Validation middleware
const validateCreateClient = (req, res, next) => {
  const { error } = createClientSchema.validate(req.body);
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

const validateUpdateClient = (req, res, next) => {
  const { error } = updateClientSchema.validate(req.body);
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

const validateClientQuery = (req, res, next) => {
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
  createClientSchema,
  updateClientSchema,
  querySchema,
  validateCreateClient,
  validateUpdateClient,
  validateClientQuery,
};
import express from "express";
import { protect, authorize } from "../middleware/auth";
const {
  validateCreateClient,
  validateUpdateClient,
  validateClientQuery,
} = require("../validation/client");
const Client = require("../models/Client");
const Project = require("../models/Project");

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
router.get("/", validateClientQuery, async (req, res) => {
  try {
    const { page, limit, search, status, sortBy, sortOrder } = req.query;

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const clients = await Client.find(query)
      .populate("projectCount")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Client.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      status: "success",
      data: {
        clients,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: total,
          hasNextPage,
          hasPrevPage,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching clients",
    });
  }
});

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate({
      path: "projects",
      select: "title status startDate endDate budget",
      options: { sort: { createdAt: -1 } },
    });

    if (!client) {
      return res.status(404).json({
        status: "error",
        message: "Client not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { client },
    });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching client",
    });
  }
});

// @desc    Create new client
// @route   POST /api/clients
// @access  Private (Admin only)
router.post("/", authorize("admin"), validateCreateClient, async (req, res) => {
  try {
    const { name, email, phone, company, address, status } = req.body;

    // Check if client with email already exists
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({
        status: "error",
        message: "Client with this email already exists",
      });
    }

    const client = await Client.create({
      name,
      email,
      phone,
      company,
      address,
      status,
    });

    res.status(201).json({
      status: "success",
      message: "Client created successfully",
      data: { client },
    });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating client",
    });
  }
});

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private (Admin only)
router.put(
  "/:id",
  authorize("admin"),
  validateUpdateClient,
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      // If email is being updated, check for duplicates
      if (updateData.email) {
        const existingClient = await Client.findOne({
          email: updateData.email,
          _id: { $ne: req.params.id },
        });

        if (existingClient) {
          return res.status(400).json({
            status: "error",
            message: "Another client with this email already exists",
          });
        }
      }

      const client = await Client.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!client) {
        return res.status(404).json({
          status: "error",
          message: "Client not found",
        });
      }

      res.status(200).json({
        status: "success",
        message: "Client updated successfully",
        data: { client },
      });
    } catch (error) {
      console.error("Update client error:", error);
      res.status(500).json({
        status: "error",
        message: "Error updating client",
      });
    }
  }
);

// @desc    Delete client (soft delete)
// @route   DELETE /api/clients/:id
// @access  Private (Admin only)
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        status: "error",
        message: "Client not found",
      });
    }

    // Check if client has active projects
    const activeProjects = await Project.countDocuments({
      clientId: req.params.id,
      status: { $in: ["pending", "in-progress"] },
    });

    if (activeProjects > 0) {
      return res.status(400).json({
        status: "error",
        message: `Cannot delete client with ${activeProjects} active project(s). Please complete or cancel projects first.`,
      });
    }

    // Soft delete by setting status to inactive
    client.status = "inactive";
    await client.save();

    res.status(200).json({
      status: "success",
      message: "Client deactivated successfully",
      data: { client },
    });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({
      status: "error",
      message: "Error deleting client",
    });
  }
});

// @desc    Get all projects for a specific client
// @route   GET /api/clients/:id/projects
// @access  Private
router.get("/:id/projects", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        status: "error",
        message: "Client not found",
      });
    }

    const projects = await Project.find({ clientId: req.params.id })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: {
        client: {
          id: client._id,
          name: client.name,
          company: client.company,
        },
        projects,
      },
    });
  } catch (error) {
    console.error("Get client projects error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching client projects",
    });
  }
});


export default router;
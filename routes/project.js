const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  validateCreateProject,
  validateUpdateProject,
  validateProjectQuery
} = require('../validation/project');
const Project = require('../models/Project');
const Client = require('../models/Client');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
router.get('/', validateProjectQuery, async (req, res) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      clientId,
      sortBy,
      sortOrder,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      budgetMin,
      budgetMax
    } = req.query;

    // Build query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Client filter
    if (clientId) {
      query.clientId = clientId;
    }

    // Date range filters
    if (startDateFrom || startDateTo) {
      query.startDate = {};
      if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) query.startDate.$lte = new Date(startDateTo);
    }

    if (endDateFrom || endDateTo) {
      query.endDate = {};
      if (endDateFrom) query.endDate.$gte = new Date(endDateFrom);
      if (endDateTo) query.endDate.$lte = new Date(endDateTo);
    }

    // Budget range filters
    if (budgetMin || budgetMax) {
      query.budget = {};
      if (budgetMin) query.budget.$gte = budgetMin;
      if (budgetMax) query.budget.$lte = budgetMax;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination and populate
    const projects = await Project.find(query)
      .populate('clientId', 'name company email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Project.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      status: 'success',
      data: {
        projects,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: total,
          hasNextPage,
          hasPrevPage,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching projects'
    });
  }
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('clientId', 'name company email phone address')
      .populate('createdBy', 'name email role');

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { project }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching project'
    });
  }
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
router.post('/', validateCreateProject, async (req, res) => {
  try {
    const { title, description, clientId, status, startDate, endDate, budget } = req.body;

    // Verify client exists and is active
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found'
      });
    }

    if (client.status === 'inactive') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot create project for inactive client'
      });
    }

    const project = await Project.create({
      title,
      description,
      clientId,
      status,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget,
      createdBy: req.user.id
    });

    // Populate the created project
    await project.populate([
      { path: 'clientId', select: '
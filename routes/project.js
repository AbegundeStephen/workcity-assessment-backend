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
      { path: 'clientId', select: 'name company email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating project'
    });
  }
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
router.put('/:id', validateUpdateProject, async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If clientId is being updated, verify the new client exists and is active
    if (updateData.clientId) {
      const client = await Client.findById(updateData.clientId);
      if (!client) {
        return res.status(404).json({
          status: 'error',
          message: 'Client not found'
        });
      }

      if (client.status === 'inactive') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot assign project to inactive client'
        });
      }
    }

    // Convert date strings to Date objects if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate([
      { path: 'clientId', select: 'name company email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating project'
    });
  }
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Only allow deletion by project creator or admin
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this project'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting project'
    });
  }
});

// @desc    Get projects by client
// @route   GET /api/projects/client/:clientId
// @access  Private
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found'
      });
    }

    const projects = await Project.find({ clientId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        client: {
          id: client._id,
          name: client.name,
          company: client.company
        },
        projects
      }
    });
  } catch (error) {
    console.error('Get projects by client error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching projects'
    });
  }
});

// @desc    Get project statistics
// @route   GET /api/projects/stats
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
          avgBudget: { $avg: '$budget' }
        }
      }
    ]);

    const totalProjects = await Project.countDocuments();
    const totalBudget = await Project.aggregate([
      { $group: { _id: null, total: { $sum: '$budget' } } }
    ]);

    const overallStats = {
      totalProjects,
      totalBudget: totalBudget[0]?.total || 0,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalBudget: stat.totalBudget,
          avgBudget: Math.round(stat.avgBudget)
        };
        return acc;
      }, {})
    };

    res.status(200).json({
      status: 'success',
      data: { stats: overallStats }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching project statistics'
    });
  }
});

export default router;
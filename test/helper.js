const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Client = require("../models/Client");
const Project = require("../models/Project");

// Generate JWT token for testing
const generateTestToken = (userId, role = "user") => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "test_secret", {
    expiresIn: "1h",
  });
};

// Create test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123",
    role: "user",
  };

  const user = await User.create({ ...defaultUser, ...userData });
  const token = generateTestToken(user._id, user.role);

  return { user, token };
};

// Create test admin user
const createTestAdmin = async (userData = {}) => {
  const defaultAdmin = {
    name: "Test Admin",
    email: "admin@example.com",
    password: "AdminPass123",
    role: "admin",
  };

  const admin = await User.create({ ...defaultAdmin, ...userData });
  const token = generateTestToken(admin._id, admin.role);

  return { admin, token };
};

// Create test client
const createTestClient = async (clientData = {}) => {
  const defaultClient = {
    name: "Test Client",
    email: "client@example.com",
    phone: "1234567890",
    company: "Test Company",
    address: "123 Test Street",
    status: "active",
  };

  const client = await Client.create({ ...defaultClient, ...clientData });
  return client;
};

// Create test project
const createTestProject = async (projectData = {}) => {
  let client, user;

  // Create client if not provided
  if (!projectData.clientId) {
    client = await createTestClient();
    projectData.clientId = client._id;
  }

  // Create user if not provided
  if (!projectData.createdBy) {
    const userData = await createTestUser();
    user = userData.user;
    projectData.createdBy = user._id;
  }

  const defaultProject = {
    title: "Test Project",
    description: "This is a test project description",
    status: "pending",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
    budget: 10000,
  };

  const project = await Project.create({ ...defaultProject, ...projectData });
  return { project, client, user };
};

// Validation error helper
const expectValidationError = (response, field, message) => {
  expect(response.status).toBe(400);
  expect(response.body.status).toBe("error");
  expect(response.body.message).toBe("Validation error");

  if (field && message) {
    const fieldError = response.body.details.find(
      (detail) => detail.field === field
    );
    expect(fieldError).toBeDefined();
    expect(fieldError.message).toContain(message);
  }
};

// Authentication error helper
const expectAuthError = (response, message = "Not authorized") => {
  expect(response.status).toBe(401);
  expect(response.body.status).toBe("error");
  expect(response.body.message).toContain(message);
};

// Authorization error helper
const expectAuthorizationError = (response) => {
  expect(response.status).toBe(403);
  expect(response.body.status).toBe("error");
  expect(response.body.message).toContain("not authorized");
};

// Success response helper
const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.status).toBe("success");
};

// Database cleanup helper
const cleanupDatabase = async () => {
  await User.deleteMany({});
  await Client.deleteMany({});
  await Project.deleteMany({});
};

module.exports = {
  generateTestToken,
  createTestUser,
  createTestAdmin,
  createTestClient,
  createTestProject,
  expectValidationError,
  expectAuthError,
  expectAuthorizationError,
  expectSuccessResponse,
  cleanupDatabase,
};

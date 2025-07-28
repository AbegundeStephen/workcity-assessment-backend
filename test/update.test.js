const request = require("supertest");
const app = require("../server");
const {
  createTestUser,
  createTestAdmin,
  createTestClient,
  createTestProject,
  expectValidationError,
  expectAuthError,
  expectAuthorizationError,
  expectSuccessResponse,
} = require("./helpers");

describe("PUT /api/projects/:id", () => {
  let userToken, adminToken, project, client, user;

  beforeEach(async () => {
    const { token: userT } = await createTestUser();
    const { token: adminT } = await createTestAdmin();
    userToken = userT;
    adminToken = adminT;

    // Create test project
    const projectData = await createTestProject();
    project = projectData.project;
    client = projectData.client;
    user = projectData.user;
  });

  describe("Authentication and Authorization", () => {
    test("should require authentication", async () => {
      const updateData = { title: "Updated Project Title" };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .send(updateData);

      expectAuthError(response);
    });

    test("should allow authenticated users to update projects", async () => {
      const updateData = { title: "Updated Project Title" };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
    });
  });

  describe("Validation", () => {
    test("should require at least one field for update", async () => {
      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({});

      expectValidationError(response);
      expect(response.body.message).toBe("Validation error");
      expect(response.body.details[0].message).toContain(
        "At least one field must be provided"
      );
    });

    test("should validate title field", async () => {
      const testCases = [
        { title: "A", message: "at least 2 characters" },
        { title: "A".repeat(201), message: "cannot exceed 200 characters" },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .put(`/api/projects/${project._id}`)
          .set("Authorization", `Bearer ${userToken}`)
          .send({ title: testCase.title });

        expectValidationError(response, "title", testCase.message);
      }
    });

    test("should validate description field", async () => {
      const testCases = [
        { description: "Short", message: "at least 10 characters" },
        {
          description: "A".repeat(2001),
          message: "cannot exceed 2000 characters",
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .put(`/api/projects/${project._id}`)
          .set("Authorization", `Bearer ${userToken}`)
          .send({ description: testCase.description });

        expectValidationError(response, "description", testCase.message);
      }
    });

    test("should validate status field", async () => {
      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "invalid-status" });

      expectValidationError(
        response,
        "status",
        "pending, in-progress, or completed"
      );
    });

    test("should validate budget field", async () => {
      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ budget: -100 });

      expectValidationError(response, "budget", "cannot be negative");
    });

    test("should validate date fields", async () => {
      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          startDate: "2024-12-31",
          endDate: "2024-01-01",
        });

      expectValidationError(response, "endDate", "must be after start date");
    });

    test("should validate clientId format", async () => {
      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ clientId: "invalid-id" });

      expectValidationError(response, "clientId", "Invalid ID format");
    });
  });

  describe("Business Logic", () => {
    test("should update project successfully with valid data", async () => {
      const updateData = {
        title: "Updated Project Title",
        description: "This is an updated project description",
        status: "in-progress",
        budget: 15000,
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.message).toBe("Project updated successfully");
      expect(response.body.data.project).toMatchObject({
        title: updateData.title,
        description: updateData.description,
        status: updateData.status,
        budget: updateData.budget,
      });
    });

    test("should update only provided fields", async () => {
      const originalTitle = project.title;
      const updateData = { status: "completed" };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.project.status).toBe("completed");
      expect(response.body.data.project.title).toBe(originalTitle);
    });

    test("should update client assignment", async () => {
      const newClient = await createTestClient({
        email: "newclient@test.com",
        name: "New Client",
      });

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ clientId: newClient._id });

      expectSuccessResponse(response);
      expect(response.body.data.project.clientId._id).toBe(
        newClient._id.toString()
      );
      expect(response.body.data.project.clientId.name).toBe("New Client");
    });

    test("should not allow assignment to inactive client", async () => {
      const inactiveClient = await createTestClient({
        email: "inactive@test.com",
        status: "inactive",
      });

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ clientId: inactiveClient._id });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe(
        "Cannot assign project to inactive client"
      );
    });

    test("should not allow assignment to non-existent client", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ clientId: nonExistentId });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Client not found");
    });

    test("should update dates correctly", async () => {
      const updateData = {
        startDate: "2024-06-01",
        endDate: "2024-12-31",
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(new Date(response.body.data.project.startDate)).toEqual(
        new Date("2024-06-01")
      );
      expect(new Date(response.body.data.project.endDate)).toEqual(
        new Date("2024-12-31")
      );
    });

    test("should populate client and creator information", async () => {
      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Updated Title" });

      expectSuccessResponse(response);
      expect(response.body.data.project.clientId).toHaveProperty("name");
      expect(response.body.data.project.clientId).toHaveProperty("company");
      expect(response.body.data.project.createdBy).toHaveProperty("name");
      expect(response.body.data.project.createdBy).toHaveProperty("email");
    });

    test("should trim whitespace from string fields", async () => {
      const updateData = {
        title: "  Updated Project Title  ",
        description: "  Updated description with whitespace  ",
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.project.title).toBe("Updated Project Title");
      expect(response.body.data.project.description).toBe(
        "Updated description with whitespace"
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle non-existent project ID", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .put(`/api/projects/${nonExistentId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Project not found");
    });

    test("should handle invalid project ID format", async () => {
      const response = await request(app)
        .put("/api/projects/invalid-id")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe("error");
    });

    test("should update multiple fields simultaneously", async () => {
      const updateData = {
        title: "Multi-field Update",
        description: "Updated description for multi-field test",
        status: "in-progress",
        budget: 25000,
        startDate: "2024-07-01",
        endDate: "2024-11-30",
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.project).toMatchObject({
        title: updateData.title,
        description: updateData.description,
        status: updateData.status,
        budget: updateData.budget,
      });
    });

    test("should preserve unchanged fields", async () => {
      const originalData = {
        title: project.title,
        description: project.description,
        budget: project.budget,
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "completed" });

      expectSuccessResponse(response);
      expect(response.body.data.project.title).toBe(originalData.title);
      expect(response.body.data.project.description).toBe(
        originalData.description
      );
      expect(response.body.data.project.budget).toBe(originalData.budget);
      expect(response.body.data.project.status).toBe("completed");
    });
  });

  describe("Error Handling", () => {
    test("should handle database errors gracefully", async () => {
      // Mock database error
      jest
        .spyOn(require("../models/Project"), "findByIdAndUpdate")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Error updating project");

      // Restore original method
      require("../models/Project").findByIdAndUpdate.mockRestore();
    });

    test("should handle validation errors from mongoose", async () => {
      // This test ensures that mongoose validation errors are properly handled
      const updateData = {
        budget: "invalid-number",
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expectValidationError(response, "budget");
    });
  });

  describe("Performance", () => {
    test("should update project within acceptable time", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Performance Test Update" });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expectSuccessResponse(response);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

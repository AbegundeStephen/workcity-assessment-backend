import request from "supertest";
import app from "../server";

import {
  createTestUser,
  createTestAdmin,
  createTestClient,
  expectValidationError,
  expectAuthError,
  expectAuthorizationError,
  expectSuccessResponse,
} from "./helpers";

describe("POST /api/clients", () => {
  let adminToken;
  let userToken;

  beforeEach(async () => {
    const { token: adminT } = await createTestAdmin();
    const { token: userT } = await createTestUser();
    adminToken = adminT;
    userToken = userT;
  });

  describe("Authentication and Authorization", () => {
    const clientData = {
      name: "Test Client",
      email: "client@test.com",
      phone: "1234567890",
      company: "Test Company",
    };

    test("should require authentication", async () => {
      const response = await request(app).post("/api/clients").send(clientData);
      expectAuthError(response);
    });

    test("should require admin role", async () => {
      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${userToken}`)
        .send(clientData);
      expectAuthorizationError(response);
    });
  });

  describe("Validation", () => {
    test("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expectValidationError(response);
      expect(response.body.details).toHaveLength(4); // name, email, phone, company
    });

    test("should validate name field", async () => {
      const testCases = [
        { name: "", message: "Name is required" },
        { name: "A", message: "at least 2 characters" },
        { name: "A".repeat(101), message: "cannot exceed 100 characters" },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/api/clients")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            name: testCase.name,
            email: "client@test.com",
            phone: "1234567890",
            company: "Test Company",
          });

        expectValidationError(response, "name", testCase.message);
      }
    });

    test("should validate company field", async () => {
      const testCases = [
        { company: "", message: "Company is required" },
        { company: "A", message: "at least 2 characters" },
        { company: "A".repeat(101), message: "cannot exceed 100 characters" },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/api/clients")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            name: "Test Client",
            email: "client@test.com",
            phone: "1234567890",
            company: testCase.company,
          });

        expectValidationError(response, "company", testCase.message);
      }
    });

    test("should validate email field", async () => {
      const testCases = [
        { email: "", message: "Email is required" },
        { email: "invalid-email", message: "valid email address" },
        { email: "test@", message: "valid email address" },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/api/clients")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            name: "Test Client",
            email: testCase.email,
            phone: "1234567890",
            company: "Test Company",
          });

        expectValidationError(response, "email", testCase.message);
      }
    });

    test("should validate phone field", async () => {
      const testCases = [
        { phone: "", message: "Phone is required" },
        { phone: "123", message: "at least 10 characters" },
        { phone: "1".repeat(21), message: "cannot exceed 20 characters" },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post("/api/clients")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            name: "Test Client",
            email: "client@test.com",
            phone: testCase.phone,
            company: "Test Company",
          });

        expectValidationError(response, "phone", testCase.message);
      }
    });

    test("should validate status field", async () => {
      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Client",
          email: "client@test.com",
          phone: "1234567890",
          company: "Test Company",
          status: "invalid-status",
        });

      expectValidationError(response, "status", "either active or inactive");
    });
  });

  describe("Business Logic", () => {
    test("should create client successfully with valid data", async () => {
      const clientData = {
        name: "Test Client",
        email: "client@test.com",
        phone: "1234567890",
        company: "Test Company",
        address: "123 Test Street",
        status: "active",
      };

      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(clientData);

      expectSuccessResponse(response, 201);
      expect(response.body.message).toBe("Client created successfully");
      expect(response.body.data.client).toMatchObject(clientData);
      expect(response.body.data.client._id).toBeDefined();
      expect(response.body.data.client.createdAt).toBeDefined();
    });

    test("should create client with default status", async () => {
      const clientData = {
        name: "Test Client",
        email: "client@test.com",
        phone: "1234567890",
        company: "Test Company",
      };

      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(clientData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.client.status).toBe("active");
    });

    test("should not create client with duplicate email", async () => {
      await createTestClient({ email: "duplicate@test.com" });

      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Another Client",
          email: "duplicate@test.com",
          phone: "0987654321",
          company: "Another Company",
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe(
        "Client with this email already exists"
      );
    });

    test("should trim whitespace from string fields", async () => {
      const clientData = {
        name: "  Test Client  ",
        email: "  CLIENT@TEST.COM  ",
        phone: "  1234567890  ",
        company: "  Test Company  ",
        address: "  123 Test Street  ",
      };

      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(clientData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.client.name).toBe("Test Client");
      expect(response.body.data.client.email).toBe("client@test.com");
      expect(response.body.data.client.phone).toBe("1234567890");
      expect(response.body.data.client.company).toBe("Test Company");
      expect(response.body.data.client.address).toBe("123 Test Street");
    });

    test("should convert email to lowercase", async () => {
      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Client",
          email: "CLIENT@TEST.COM",
          phone: "1234567890",
          company: "Test Company",
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.client.email).toBe("client@test.com");
    });
  });

  describe("Error Handling", () => {
    test("should handle server errors gracefully", async () => {
      const ClientModel = require("../models/Client");
      jest
        .spyOn(ClientModel, "create")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .post("/api/clients")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Client",
          email: "client@test.com",
          phone: "1234567890",
          company: "Test Company",
        });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Error creating client");

      ClientModel.create.mockRestore();
    });
  });
});

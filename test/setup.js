import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";


let mongoServer;

// Setup test database before all tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to test database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Suppress console logs during testing
if (process.env.NODE_ENV === "test") {
  console.log = jest.fn();
  console.error = jest.fn();
}

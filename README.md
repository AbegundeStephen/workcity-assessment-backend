# Workcity Backend Project Structure

## Overview

This is a complete Node.js Express API with MongoDB for a client-project management system, featuring JWT authentication, comprehensive validation, and full test coverage.

## Project Structure

```
workcity-backend/
├── config/
│   └── database.js              # MongoDB connection configuration
├── middleware/
│   ├── auth.js                  # JWT authentication & authorization
│   └── errorHandler.js          # Global error handling middleware
├── models/
│   ├── User.js                  # User schema with password hashing
│   ├── Client.js                # Client schema with validations
│   └── Project.js               # Project schema with references
├── routes/
│   ├── auth.js                  # Authentication endpoints
│   ├── clients.js               # Client CRUD operations
│   └── projects.js              # Project CRUD operations
├── validation/
│   ├── auth.js                  # Authentication validation schemas
│   ├── client.js                # Client validation schemas
│   └── project.js               # Project validation schemas
├── tests/
│   ├── setup.js                 # Test configuration and setup
│   ├── helpers.js               # Test helper functions
│   ├── client.test.js           # Client endpoint tests
│   └── project-update.test.js   # Project update tests
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
├── server.js                    # Main server file
└── README.md                    # Project documentation
```

## Key Features

### 🔐 Authentication & Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting for auth endpoints
- Input sanitization (XSS, NoSQL injection)
- Security headers with Helmet
- Role-based access control (admin/user)

### 📊 Database Models

- **User**: Authentication with roles
- **Client**: Customer information management
- **Project**: Project tracking with client relationships

### 🛡️ Validation & Error Handling

- Comprehensive input validation using Joi
- Custom validation middleware
- Global error handling
- Detailed error responses
- Field-level validation messages

### 🔄 CRUD Operations

- **Clients**: Full CRUD with pagination, search, filtering
- **Projects**: Full CRUD with advanced filtering options
- Proper HTTP status codes
- Data population and relationships

### 🧪 Testing

- Unit tests with Jest and Supertest
- MongoDB Memory Server for isolated testing
- Test helpers and utilities
- Authentication mocking
- Error scenario testing
- 80%+ test coverage

## API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Clients

- `GET /api/clients` - Get all clients (paginated, searchable)
- `GET /api/clients/:id` - Get single client with projects
- `POST /api/clients` - Create new client (admin only)
- `PUT /api/clients/:id` - Update client (admin only)
- `DELETE /api/clients/:id` - Soft delete client (admin only)
- `GET /api/clients/:id/projects` - Get client's projects

### Projects

- `GET /api/projects` - Get all projects (advanced filtering)
- `GET /api/projects/:id` - Get single project with details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/client/:clientId` - Get projects by client
- `GET /api/projects/stats/overview` - Get project statistics

## Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/workcity_db
MONGODB_TEST_URI=mongodb://localhost:27017/workcity_test_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Installation & Setup

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd workcity-backend
   npm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**

   ```bash
   # Make sure MongoDB is running
   mongod
   ```

4. **Run Development Server**

   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

## Usage Examples

### Authentication

```javascript
// Register new user
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "user"
}

// Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Client Management

```javascript
// Create client (admin only)
POST /api/clients
Authorization: Bearer <token>
{
  "name": "ABC Corporation",
  "email": "contact@abc.com",
  "phone": "1234567890",
  "company": "ABC Corp",
  "address": "123 Business St"
}

// Get clients with filtering
GET /api/clients?search=ABC&status=active&page=1&limit=10
```

### Project Management

```javascript
// Create project
POST /api/projects
Authorization: Bearer <token>
{
  "title": "Website Redesign",
  "description": "Complete redesign of company website",
  "clientId": "64a7b8c9d1e2f3a4b5c6d7e8",
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "budget": 25000
}

// Update project
PUT /api/projects/64a7b8c9d1e2f3a4b5c6d7e8
Authorization: Bearer <token>
{
  "status": "in-progress",
  "budget": 30000
}
```

## Testing

The project includes comprehensive tests covering:

- **Authentication**: Login, signup, token validation
- **Client Operations**: CRUD operations, validation, authorization
- **Project Operations**: CRUD operations, complex validations
- **Error Handling**: Various error scenarios
- **Edge Cases**: Invalid inputs, non-existent resources

Run tests with:

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
```

## Security Features

- JWT tokens with expiration
- Password hashing with bcrypt (salt rounds: 12)
- Rate limiting on auth endpoints
- Input sanitization against XSS and NoSQL injection
- CORS configuration
- Security headers with Helmet
- Validation on all inputs
- Role-based access control

## Performance Considerations

- Database indexes on frequently queried fields
- Pagination for list endpoints
- Efficient MongoDB queries with proper population
- Connection pooling
- Error logging and monitoring

## Development Guidelines

1. **Code Style**: Follow consistent formatting and naming conventions
2. **Error Handling**: Use try-catch blocks and proper error responses
3. **Validation**: Validate all inputs using Joi schemas
4. **Testing**: Write tests for all endpoints and edge cases
5. **Security**: Always sanitize inputs and validate permissions
6. **Documentation**: Keep API documentation updated

This backend system provides a robust foundation for a client-project management application with enterprise-level security, validation, and testing practices.

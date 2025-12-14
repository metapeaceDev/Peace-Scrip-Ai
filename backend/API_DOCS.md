# Backend API

Peace Script AI - Backend API Server with Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Development with Docker

```bash
cd backend
docker-compose up --build
```

The API will be available at `http://localhost:5000`

### Local Development

```bash
npm install
npm run dev
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "name": "User Name"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "...", "name": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Project Endpoints

All project endpoints require authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

#### Create Project

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Script",
  "type": "feature",
  "genre": "Drama",
  "data": {
    "characters": [],
    "scenes": []
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "project": {
      "_id": "...",
      "name": "My Script",
      "type": "feature",
      "genre": "Drama",
      "status": "draft",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get All Projects

```http
GET /api/projects
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "_id": "...",
        "name": "My Script",
        "type": "feature",
        "status": "draft",
        "createdAt": "..."
      }
    ],
    "total": 1
  }
}
```

#### Get Single Project

```http
GET /api/projects/:id
Authorization: Bearer <token>
```

#### Update Project

```http
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Script Name",
  "status": "completed",
  "data": { ... }
}
```

#### Delete Project

```http
DELETE /api/projects/:id
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🧪 Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## 🔒 Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/peacescript
MONGODB_URI_TEST=mongodb://localhost:27017/peacescript-test
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

## 📦 Dependencies

**Production:**

- express: Web framework
- mongoose: MongoDB ODM
- bcryptjs: Password hashing
- jsonwebtoken: JWT authentication
- helmet: Security headers
- cors: CORS handling
- dotenv: Environment variables
- express-rate-limit: Rate limiting

**Development:**

- nodemon: Auto-restart
- jest: Testing framework
- supertest: HTTP testing
- eslint: Code linting

## 🐳 Docker

Build image:

```bash
npm run docker:build
```

Run container:

```bash
npm run docker:run
```

Using docker-compose:

```bash
npm run docker:compose
```

## 📊 Test Coverage

Target coverage: 70%

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Helmet security headers
- CORS configuration
- Rate limiting
- Input validation
- Error handling middleware

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── server.js           # Express app setup
│   ├── controllers/        # Route controllers
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   └── config/             # Configuration files
├── tests/                  # Test files
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 📝 License

MIT

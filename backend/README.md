# Peace Script Backend API

🎬 **Backend API for Peace Script AI** - Professional Screenwriting Tool

RESTful API built with Node.js, Express, MongoDB, running on Docker.

---

## 📋 Features

- ✅ **User Authentication** - JWT-based auth with bcrypt password hashing
- ✅ **Project Management** - CRUD operations for screenplay projects
- ✅ **Collaboration** - Multi-user project sharing with role-based access
- ✅ **MongoDB Database** - Document-based storage with Mongoose ODM
- ✅ **Docker Support** - Containerized deployment with Docker Compose
- ✅ **Security** - Helmet, CORS, Rate Limiting
- ✅ **Validation** - Express Validator for input sanitization
- ✅ **Error Handling** - Centralized error handling middleware

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

### 2. Run with Docker Compose (Recommended)

```bash
# Start all services (MongoDB + Backend)
docker-compose up

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

The API will be available at: **http://localhost:5000**

### 3. Run Locally (Development)

```bash
# Install dependencies
npm install

# Start MongoDB separately or use connection string
# Then start dev server
npm run dev
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint             | Description       | Auth Required |
| ------ | -------------------- | ----------------- | ------------- |
| POST   | `/api/auth/register` | Register new user | No            |
| POST   | `/api/auth/login`    | Login user        | No            |
| GET    | `/api/auth/me`       | Get current user  | Yes           |

### Projects

| Method | Endpoint            | Description           | Auth Required |
| ------ | ------------------- | --------------------- | ------------- |
| GET    | `/api/projects`     | Get all user projects | Yes           |
| GET    | `/api/projects/:id` | Get single project    | Yes           |
| POST   | `/api/projects`     | Create new project    | Yes           |
| PUT    | `/api/projects/:id` | Update project        | Yes           |
| DELETE | `/api/projects/:id` | Delete project        | Yes           |

### Health Check

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/health` | Server health status |

---

## 📝 API Usage Examples

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Create Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My First Screenplay",
    "type": "feature",
    "genre": "Drama",
    "data": {}
  }'
```

---

## 🐳 Docker Commands

```bash
# Build image
docker-compose build

# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (⚠️ deletes database)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# Execute command in container
docker-compose exec backend npm run dev
```

---

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Auth logic
│   │   └── projectController.js # Project logic
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── errorHandler.js      # Error handling
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── Project.js           # Project schema
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   └── projects.js          # Project routes
│   └── server.js                # Express app
├── .env.example                 # Environment template
├── .gitignore
├── .dockerignore
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Docker Compose setup
├── mongo-init.js                # MongoDB initialization
├── package.json
└── README.md
```

---

## 🔐 Environment Variables

| Variable      | Description               | Default                   |
| ------------- | ------------------------- | ------------------------- |
| `NODE_ENV`    | Environment mode          | `development`             |
| `PORT`        | Server port               | `5000`                    |
| `MONGODB_URI` | MongoDB connection string | See .env.example          |
| `JWT_SECRET`  | Secret key for JWT        | **Change in production!** |
| `JWT_EXPIRE`  | Token expiration time     | `7d`                      |
| `CORS_ORIGIN` | Allowed frontend origin   | `http://localhost:5173`   |

---

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test with httpie (install: brew install httpie)
http http://localhost:5000/health

# Check MongoDB connection
docker-compose exec mongodb mongosh \
  -u admin -p peacescript123 \
  --authenticationDatabase admin
```

---

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start
```

---

## 📦 Dependencies

### Production

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
- **dotenv** - Environment variables
- **morgan** - HTTP logging

### Development

- **nodemon** - Auto-restart on file changes

---

## 🚨 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Clear Docker Volumes

```bash
# Remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up --build
```

---

## 📈 Production Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-random-secret-key-here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/peacescript
CORS_ORIGIN=https://yourapp.com
```

### Docker Build for Production

```bash
# Build production image
docker build -t peace-script-backend:latest .

# Run with production env
docker run -p 5000:5000 --env-file .env.production peace-script-backend:latest
```

---

## 🤝 Integration with Frontend

Update frontend API URL in `.env`:

```bash
# Frontend .env
VITE_API_URL=http://localhost:5000
```

Update `services/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎬 Peace Script Team

Built with ❤️ for storytellers worldwide

For frontend documentation, see: `../README.md`

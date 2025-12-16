# Backend Testing Setup Guide

## MongoDB Test Database Setup

Backend tests require a running MongoDB instance. Follow these steps to set up the test database.

### Prerequisites

- MongoDB installed on your system
- Node.js and npm installed

### Installation

#### macOS
```bash
brew install mongodb-community
brew services start mongodb-community
```

#### Ubuntu/Debian
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
```

#### Windows
Download and install from: https://www.mongodb.com/try/download/community

### Automated Setup

Run the setup script to configure the test database:

```bash
cd backend
chmod +x scripts/setup-test-db.sh
./scripts/setup-test-db.sh
```

This script will:
1. Check if MongoDB is installed and running
2. Create admin user with credentials
3. Create `peacescript-test` database
4. Verify authenticated connection

### Manual Setup

If the automated script doesn't work, set up manually:

1. **Start MongoDB**
   ```bash
   mongod --dbpath /path/to/data
   ```

2. **Create Admin User**
   ```bash
   mongosh
   ```
   ```javascript
   use admin
   db.createUser({
     user: "admin",
     pwd: "peacescript123",
     roles: [
       { role: "userAdminAnyDatabase", db: "admin" },
       { role: "readWriteAnyDatabase", db: "admin" }
     ]
   })
   ```

3. **Create Test Database**
   ```javascript
   use peacescript-test
   db.createCollection("users")
   db.createCollection("projects")
   ```

### Test Configuration

The test configuration is in `backend/.env.test`:

```env
NODE_ENV=test
PORT=5001
MONGODB_URI_TEST=mongodb://admin:peacescript123@localhost:27017/peacescript-test?authSource=admin
JWT_SECRET=test-secret-key-for-testing-only-change-in-production
```

### Running Backend Tests

Once MongoDB is set up:

```bash
# From project root
npm test

# Run only backend tests
cd backend
npm test
```

### Enabling Backend Tests

Backend tests are currently skipped by default. To enable them:

1. Ensure MongoDB is running
2. Run setup script
3. Remove `.skip` from test files:
   - `backend/tests/auth.test.js`
   - `backend/tests/projects.test.js`

Example:
```javascript
// Change from:
describe.skip('Auth API', () => {

// To:
describe('Auth API', () => {
```

### Troubleshooting

#### MongoDB Not Running
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB (macOS)
brew services start mongodb-community

# Start MongoDB (Linux)
sudo systemctl start mongod
```

#### Connection Refused
- Ensure MongoDB is listening on port 27017
- Check firewall settings
- Verify connection string in `.env.test`

#### Authentication Failed
- Verify user credentials match `.env.test`
- Ensure authSource is set to "admin"
- Try connecting with mongosh to test credentials:
  ```bash
  mongosh "mongodb://admin:peacescript123@localhost:27017/peacescript-test?authSource=admin"
  ```

#### Permission Denied
- Ensure MongoDB has write permissions to data directory
- Check file ownership and permissions

### Test Database Structure

The test database includes:
- **users** collection - User authentication data
- **projects** collection - Project data

Tests will automatically:
- Clean up data before each test
- Create test users
- Create test projects
- Delete test data after tests complete

### CI/CD Integration

For continuous integration:

```yaml
# .github/workflows/test.yml
services:
  mongodb:
    image: mongo:latest
    ports:
      - 27017:27017
    env:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: peacescript123
```

### Security Notes

- Test credentials are for **development only**
- Never use test credentials in production
- Change `JWT_SECRET` for production deployments
- Use environment variables for sensitive data

### Current Test Status

- ✅ Frontend tests: 239 tests passing
- ⏸️ Backend tests: Skipped (requires MongoDB setup)

To enable full test coverage, complete the MongoDB setup above.

#!/bin/bash

# MongoDB Test Setup Script
# This script helps setup MongoDB for testing

echo "🔧 Peace Script AI - MongoDB Test Setup"
echo "========================================"
echo ""

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB is not installed"
    echo ""
    echo "📦 Install MongoDB:"
    echo "  macOS:   brew install mongodb-community"
    echo "  Ubuntu:  sudo apt install mongodb"
    echo "  Windows: Download from https://www.mongodb.com/try/download/community"
    echo ""
    exit 1
fi

echo "✅ MongoDB is installed"

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is already running"
else
    echo "⚠️  MongoDB is not running"
    echo ""
    echo "🚀 Start MongoDB:"
    echo "  macOS:   brew services start mongodb-community"
    echo "  Linux:   sudo systemctl start mongod"
    echo "  Manual:  mongod --dbpath /path/to/data"
    echo ""
    
    # Try to start on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Attempting to start MongoDB..."
        brew services start mongodb-community 2>/dev/null
        sleep 2
        
        if pgrep -x "mongod" > /dev/null; then
            echo "✅ MongoDB started successfully"
        else
            echo "❌ Failed to start MongoDB automatically"
            exit 1
        fi
    else
        exit 1
    fi
fi

# Test MongoDB connection
echo ""
echo "🔌 Testing MongoDB connection..."

mongosh --quiet --eval "db.version()" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MongoDB connection successful"
    MONGO_VERSION=$(mongosh --quiet --eval "db.version()")
    echo "   Version: $MONGO_VERSION"
else
    echo "❌ Cannot connect to MongoDB"
    echo ""
    echo "Please ensure MongoDB is running on localhost:27017"
    exit 1
fi

# Create test database and user
echo ""
echo "👤 Setting up test database..."

mongosh --quiet <<EOF
use admin
db.createUser({
  user: "admin",
  pwd: "peacescript123",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})
EOF

if [ $? -eq 0 ]; then
    echo "✅ Test user created (or already exists)"
else
    echo "⚠️  User might already exist (this is OK)"
fi

# Create test database
mongosh --quiet <<EOF
use peacescript-test
db.createCollection("users")
db.createCollection("projects")
EOF

echo "✅ Test database 'peacescript-test' ready"

# Verify connection with auth
echo ""
echo "🔐 Testing authenticated connection..."

mongosh "mongodb://admin:peacescript123@localhost:27017/peacescript-test?authSource=admin" --quiet --eval "db.stats()" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Authenticated connection successful"
else
    echo "❌ Authentication failed"
    echo ""
    echo "Try running MongoDB without auth for development:"
    echo "  mongod --noauth --dbpath /path/to/data"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ MongoDB Test Setup Complete!"
echo ""
echo "📝 Test Configuration:"
echo "   Database: peacescript-test"
echo "   Username: admin"
echo "   Password: peacescript123"
echo "   URI: mongodb://admin:peacescript123@localhost:27017/peacescript-test?authSource=admin"
echo ""
echo "🧪 Run tests with: npm test"
echo "========================================"

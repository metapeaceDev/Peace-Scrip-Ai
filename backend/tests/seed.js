// Test database seed script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.test' });

const User = require('../src/models/User');
const Project = require('../src/models/Project');

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding test database...');
    
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/peacescript-test');
    
    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword
    });
    
    console.log('✅ Test user created:', testUser.email);
    
    // Create sample project
    const testProject = await Project.create({
      name: 'Sample Script',
      type: 'feature',
      genre: 'Drama',
      owner: testUser._id,
      data: {
        title: 'Sample Script',
        genre: 'Drama',
        logline: 'A test logline'
      }
    });
    
    console.log('✅ Test project created:', testProject.name);
    console.log('🎉 Database seeded successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

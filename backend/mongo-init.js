// MongoDB initialization script
db = db.getSiblingDB('peacescript');

// Create collections
db.createCollection('users');
db.createCollection('projects');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.projects.createIndex({ owner: 1, createdAt: -1 });
db.projects.createIndex({ 'collaborators.user': 1 });

print('✅ Peace Script Database initialized successfully');

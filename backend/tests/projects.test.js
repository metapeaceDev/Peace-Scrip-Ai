const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../src/server');

describe.skip('Projects API', () => {
  let authToken;
  let projectId;

  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/peacescript-test'
    );

    // Login to get token
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    authToken = res.body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    // Close server to free port
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Script',
          type: 'feature',
          genre: 'Drama',
          data: {},
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.name).toBe('Test Script');
      projectId = res.body.data.project._id;
    });

    it('should fail without auth token', async () => {
      const res = await request(app).post('/api/projects').send({
        name: 'Test Script',
        type: 'feature',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/projects', () => {
    it('should get all user projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Script',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.project.name).toBe('Updated Script');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

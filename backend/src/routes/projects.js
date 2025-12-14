const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// @route   GET /api/projects
router.get('/', getProjects);

// @route   POST /api/projects
router.post('/', createProject);

// @route   GET /api/projects/:id
router.get('/:id', getProject);

// @route   PUT /api/projects/:id
router.put('/:id', updateProject);

// @route   DELETE /api/projects/:id
router.delete('/:id', deleteProject);

module.exports = router;

const Project = require('../models/Project');

// @route   GET /api/projects
// @desc    Get all projects for user
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    })
    .populate('owner', 'name email')
    .populate('collaborators.user', 'name email')
    .sort({ lastModified: -1 });

    res.json({
      success: true,
      count: projects.length,
      data: { projects }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access
    const hasAccess = project.owner._id.toString() === req.user.id ||
      project.collaborators.some(c => c.user._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const { name, type, genre, data } = req.body;

    const project = await Project.create({
      name,
      type,
      genre,
      data,
      owner: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner or has edit access
    const isOwner = project.owner.toString() === req.user.id;
    const hasEditAccess = project.collaborators.some(
      c => c.user.toString() === req.user.id && c.role !== 'viewer'
    );

    if (!isOwner && !hasEditAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this project'
      });
    }

    // Update fields
    const { name, type, genre, data, status } = req.body;
    
    if (name) project.name = name;
    if (type) project.type = type;
    if (genre) project.genre = genre;
    if (data) project.data = data;
    if (status) project.status = status;
    
    project.lastModified = Date.now();
    project.version += 1;

    await project.save();

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only owner can delete
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can delete'
      });
    }

    await project.deleteOne();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

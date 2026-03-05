// controllers/sessionController.js
const Session = require('../models/sessionModel');

// Create a new session
const startNew = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).send('Name is required');
    }
    
    const uniqueId = require('crypto').randomBytes(4).toString('hex');
    
    const session = await Session.create({
      uniqueId,
      name,
      spaces: []
    });
    
    req.session.uniqueId = uniqueId;
    req.session.name = name;
    
    res.render('session-created', {
      uniqueId,
      name
    });
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).send('Error creating session. Please try again.');
  }
};

// Continue with existing session
const continueSession = async (req, res) => {
  try {
    const { uniqueId } = req.body;
    
    if (!uniqueId) {
      return res.status(400).send('Session ID is required');
    }
    
    const session = await Session.findOne({ uniqueId });
    
    if (!session) {
      return res.render('welcome', {
        error: 'Session not found. Please check your ID.'
      });
    }
    
    session.lastActive = Date.now();
    await session.save();
    
    req.session.uniqueId = uniqueId;
    req.session.name = session.name;
    
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Error continuing session:', error);
    res.status(500).send('Error accessing session. Please try again.');
  }
};

// Get profile 
const getProfile = async (req, res) => {
  try {
    const session = await Session.findOne({ uniqueId: req.session.uniqueId });

    if (!session) {
      return res.status(404).send('Session not found');
    }

    res.render('profile', {
      name: session.name,
      uniqueId: session.uniqueId,
      success: req.query.success === 'true'
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Error fetching profile');
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    const session = await Session.findOneAndUpdate(
      { uniqueId: req.session.uniqueId },
      { name },
      { new: true }
    );

    if (!session) {
      return res.status(404).send('Session not found');
    }

    req.session.name = name;

    res.redirect('/profile?success=true');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Failed to update profile');
  }
};

// End session
const endSession = (req, res) => {
  req.session = null;
  res.redirect('/');
};

// Create session helper
const createSession = async (name) => {
  const uniqueId = require('crypto').randomBytes(4).toString('hex');
  
  const session = await Session.create({
    uniqueId,
    name,
    spaces: []
  });
  
  return session;
};

// Find session helper
const findSession = async (uniqueId) => {
  const session = await Session.findOne({ uniqueId });
  
  if (session) {
    session.lastActive = Date.now();
    await session.save();
  }
  
  return session;
};

module.exports = { 
  getProfile, 
  updateProfile, 
  startNew, 
  continueSession, 
  endSession,
  createSession,
  findSession  
};
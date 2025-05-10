const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Clerk user ID for authentication
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  
  // User information
  email: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },

  // Projects associated with the user
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],

  // Optional: Additional user metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update the timestamps on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

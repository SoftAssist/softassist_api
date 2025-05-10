const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../middleware/errors');
const User = require('../../../../models/user');
const mongoose = require('mongoose');

router.post('/clerk-signin', async (req, res) => {
    try {
        const { clerkId, email, firstName, lastName } = req.body;

        // Validate required fields
        if (!clerkId || !email || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required user information'
            });
        }

        console.log('User model:', User);
        console.log('User model type:', typeof User);
        console.log('Is mongoose connected:', mongoose.connection.readyState);
        console.log('Available methods on User:', Object.keys(User));
        console.log('Searching for user with clerkId:', clerkId);
        let user = await User.findOne({ clerkId });
        
        if (!user) {
            console.log('No user found, creating new user');
            // Create new user if doesn't exist
            user = await User.create({
                clerkId,
                email,
                firstName,
                lastName
            });
            console.log('New user created:', user);
        }

        // Fetch user with populated projects
        const userWithProjects = await User.findById(user._id)
            .populate('projects')
            .select('-__v'); // Exclude version key

        return res.json({
            success: true,
            data: userWithProjects
        });
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

router.get('/', async (req, res) => {
    try {
        const users = await User.find({});
        return res.json(users);
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});


router.post('/add-project', async (req, res) => {
    try {
        console.log(req.body);
        const { userId, projectId } = req.body;

        // Validate required fields
        if (!userId || !projectId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required information: userId and projectId are required'
            });
        }

        // Validate that both IDs are valid MongoDB ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid userId or projectId format'
            });
        }

        // Find and update the user, adding the project to their projects array
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { projects: projectId } }, // $addToSet ensures no duplicate projects
            { 
                new: true, // Return the updated document
                runValidators: true // Run schema validators
            }
        ).populate('projects');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            data: updatedUser
        });
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

module.exports = router;
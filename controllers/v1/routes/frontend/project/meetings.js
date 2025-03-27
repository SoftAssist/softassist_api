'use strict';

const express = require('express');
const router = express.Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const multer = require('multer');
const Meeting = require('../../../../../models/meeting');


router.get('/', (req, res) => {
    try{
    return res.json({
        message: 'Hello World',
    })
    }
    catch(err) {
        return captureErrorAndRespond(err, res);
    }
});
// Configure multer for handling audio file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// Store new meeting recording
router.post('/', upload.single('audioFile'), async (req, res) => {
    try {
        const { projectId, meetingName, date } = req.body;
        
        const meeting = new Meeting({
            projectId,
            meetingName,
            date: new Date(date),
            audioFile: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            }
        });

        await meeting.save();
        return res.status(201).json({
            message: 'Meeting recording stored successfully',
            meetingId: meeting._id
        });
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

// Get all meetings for a project
router.get('/:projectId', async (req, res) => {
    try {
        const meetings = await Meeting.find({ 
            projectId: req.params.projectId 
        }).select('-audioFile'); // Exclude audio file data from listing
        
        return res.json(meetings);
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

// Get specific meeting audio
router.get('/:projectId/:meetingId', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.meetingId);
        
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        
        if (meeting.projectId !== req.params.projectId) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        res.set('Content-Type', meeting.audioFile.contentType);
        return res.send(meeting.audioFile.data);
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

router.get('/', (req, res) => {
    try{
    return res.json({
        message: 'Hello World',
    })
    }
    catch(err) {
        return captureErrorAndRespond(err, res);
    }
});

module.exports = router;
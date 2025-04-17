'use strict';

const express = require('express');
const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const multer = require('multer');
const Meeting = require('../../../../../models/meeting');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const axios = require('axios');
const config = require('config');
const CloudConvert = require('cloudconvert');

module.exports = (router) => {
    // Configure GridFS
    let gfs;
    const conn = mongoose.connection;
    conn.once('open', () => {
        gfs = Grid(conn.db, mongoose.mongo);
        gfs.collection('audioFiles');
    });

    // Configure multer for handling audio and video file uploads
    const storage = multer.memoryStorage();
    const upload = multer({ 
        storage: storage,
        limits: {
            fileSize: 20 * 1024 * 1024, // Set to 20MB to be safe
            fieldSize: 20 * 1024 * 1024 // Add field size limit
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') {
                cb(null, true);
            } else {
                cb(new Error('Only audio files and MP4 videos are allowed'));
            }
        }
    });

    // Define routes
    router.get('/', (req, res) => {
        try {
            return res.json({
                message: 'Hello World'
            });
        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });

    // Store new meeting recording
    router.post('/', upload.single('audioFile'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    message: 'No audio file provided'
                });
            }

            const { projectId, meetingName, date } = req.body;
            
            if (!projectId || !meetingName || !date) {
                return res.status(400).json({
                    message: 'Missing required fields: projectId, meetingName, and date are required'
                });
            }

            let meeting;
            const fileSize = req.file.size;

            // Verify file data is present
            if (!req.file.buffer) {
                throw new Error('File buffer is missing');
            }

            if (fileSize > 16 * 1024 * 1024) { // If file is larger than 16MB
                // Create a GridFS bucket
                const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
                    bucketName: 'audioFiles'
                });

                // Create a file stream and upload to GridFS
                const uploadStream = bucket.openUploadStream(`${projectId}_${Date.now()}`);
                const fileId = uploadStream.id;

                await new Promise((resolve, reject) => {
                    const bufferStream = require('stream').Readable.from(req.file.buffer);
                    bufferStream.pipe(uploadStream)
                        .on('error', reject)
                        .on('finish', resolve);
                });

                // Create meeting document with only the GridFS reference
                meeting = new Meeting({
                    projectId,
                    meetingName,
                    date: new Date(date),
                    audioFileId: fileId,
                    audioFile: {
                        contentType: req.file.mimetype
                    },
                    transcript: '',
                });
            } else {
                // For smaller files, store directly in the document
                meeting = new Meeting({
                    projectId,
                    meetingName,
                    date: new Date(date),
                    audioFile: {
                        data: req.file.buffer,
                        contentType: req.file.mimetype,
                    },
                    transcript: '',
                });
            }

            await meeting.save();
            return res.status(201).json({
                message: 'Meeting recording stored successfully',
                meetingId: meeting._id
            });
        } catch (err) {
            console.error('Upload error:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    message: `File upload error: ${err.message}`
                });
            }
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
    router.get('/:meetingId', async (req, res) => {
        try {
            const meeting = await Meeting.findById(req.params.meetingId);
            
            if (!meeting) {
                return res.status(404).json({ message: 'Meeting not found' });
            }
            
            if (meeting.projectId.toString() !== req.params.projectId) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }

            if (meeting.audioFileId) {
                // Stream from GridFS
                const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
                    bucketName: 'audioFiles'
                });
                const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(meeting.audioFileId));
                res.set('Content-Type', meeting.audioFile?.contentType || 'audio/mpeg');
                return downloadStream.pipe(res);
            } else {
                // Send directly from document
                res.set('Content-Type', meeting.audioFile.contentType);
                return res.send(meeting.audioFile.data);
            }
        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });

    // Get specific meeting audio and transcribe
    router.get('/:meetingId/transcribe', async (req, res) => {
        try {
            const meeting = await Meeting.findById(req.params.meetingId);
            
            if (!meeting) {
                return res.status(404).json({ message: 'Meeting not found' });
            }

            let audioBuffer;
            let audioContentType;

            // Handle GridFS or direct file storage
            if (meeting.audioFileId) {
                // Retrieve from GridFS
                const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
                    bucketName: 'audioFiles'
                });
                
                audioBuffer = await new Promise((resolve, reject) => {
                    const chunks = [];
                    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(meeting.audioFileId));
                    downloadStream.on('data', chunk => chunks.push(chunk));
                    downloadStream.on('error', reject);
                    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
                });
                audioContentType = meeting.audioFile?.contentType || 'audio/mpeg';
            } else {
                audioBuffer = meeting.audioFile.data;
                audioContentType = meeting.audioFile.contentType;
            }

            // If the file is MP4, convert it to audio using CloudConvert
            if (audioContentType === 'video/mp4') {
                const cloudConvert = new CloudConvert(config.CLOUDCONVERT_API_KEY);
                
                // Create job to convert MP4 to MP3
                const job = await cloudConvert.jobs.create({
                    tasks: {
                        'import-file': {
                            operation: 'import/raw',
                            file: audioBuffer,
                            filename: `${meeting.meetingName}.mp4`
                        },
                        'convert-file': {
                            operation: 'convert',
                            input: 'import-file',
                            output_format: 'mp3',
                            audio_codec: 'mp3',
                            engine: 'ffmpeg'
                        },
                        'export-file': {
                            operation: 'export/url',
                            input: 'convert-file'
                        }
                    }
                });

                // Wait for the job to complete
                const conversionResult = await cloudConvert.jobs.wait(job.id);
                
                // Get the converted file URL
                const exportTask = conversionResult.tasks.find(task => task.operation === 'export/url');
                const fileUrl = exportTask.result.files[0].url;

                // Download the converted file
                const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                audioBuffer = Buffer.from(response.data);
                audioContentType = 'audio/mpeg';
            }

            const formData = new FormData();
            if(audioContentType === 'video/mp4') {
                formData.append('file', new Blob([audioBuffer], { type: audioContentType }));
            } else {  
                formData.append('file', new Blob([audioBuffer], { type: audioContentType }));
            }
            formData.append('language', 'english');
            formData.append('response_format', 'json');

            const response = await axios.post('https://api.lemonfox.ai/v1/audio/transcriptions', 
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${config.WHISPER_API_KEY}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            meeting.transcript = response.data.text;
            await meeting.save();
            return res.json({ transcription: response.data.text });

        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });
};
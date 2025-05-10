'use strict';

const logger = require('../lib/logger').create();



exports.captureErrorAndRespond = function captureErrorAndRespond(err, res) {
    const error = err.message || err;
    const statusCode = err.statusCode || 500;
    const errorMessage = err.errorMessage || error;
    
    logger.writeLog(error);
    return res.status(statusCode).json({
        error: errorMessage,
        statusCode: statusCode,
    });
}
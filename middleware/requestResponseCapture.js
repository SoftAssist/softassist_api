'use strict';

const {v4: uuidv4} = require('uuid');
const logger = require('../lib/logger').create();

exports.capturePayloads = function capturePayloads(req, res, next) {
    const logs = {
        requestResponseId: uuidv4(),
        method: req.method || 'GET',
        host: req.host || req.hostName || 'localhost',
        port: req.port || '443',
        path: req.pathname || req.path || '/',
        headers: req.headers || {},
        body: req.body || {},
        traceId: req.traceId || '',
    };

    try {
        const oldSend = res.send;
        res.send = function (data) {
            logs.responseData = data;
            if(!logs.responseData || logs.responseData.length < 5000) {
                logger.writeLog(logs);
            }
            oldSend.apply(res, arguments);
        };
    }
    catch(e) {
        logger.writeLog(e);
    }
    next();
};


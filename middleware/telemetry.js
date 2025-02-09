'use strict';

const {v4: uuidv4} = require('uuid');
const moment = require('moment');
const {getNamespace} = require('cls-hooked');
const {captureErrorAndRespond} = require('./errors');
const logger = require('../lib/logger').create();

exports.appendTelemetry = async function appendTelemetry(req, res, next) {
    try{
        const context = getNamespace('requestContext');

        if(!context) {
            return next();
        }
        if(!context.active) {
            return next();
        }

        const telemetryContext = context.get('telemetryContext');
        req.telemetryContext = {...telemetryContext};
        context.set('telemetryContext', req.telemetryContext);
        return next();
    }
    catch(e)
    {
        return captureErrorAndRespond(e, res);
    }
};

exports.initializeTelemetry = async function initializeTelemetry(req, res, next) {
    try{
        const traceId = req.traceId || uuidv4();
        const telemetryContext = { traceId, requestStartTime: moment(), url: req.originalUrl || 'unknown-url'};

        const context = getNamespace('requestContext');
        if(!context) {
            return next();
        }
        if(!context.active) {
            return next();
        }
        req.telemetryContext = telemetryContext;
        context.set('telemetryContext', telemetryContext);
        return next();
    }
    catch(e) {
        return captureErrorAndRespond(e, res);
    }
};

exports.createTelemetryString = function createTelemetryString(content, telemetry) {
    return `Time: ${moment().toISOString()}, TraceId: ${telemetry.traceId}, URL: ${telemetry.url}, Content: ${content}`;
}

exports.updateTelemetry = function updateTelemetry(req, res, next) {
    res.once('finish', () => {
        const {telemetryContext} = req;
        telemetryContext.responseTime = moment.duration(
            moment().diff(telemetryContext.requestStartTime),
    ).asSeconds();

    logger.writeLog(telemetryContext);
});
next();
}


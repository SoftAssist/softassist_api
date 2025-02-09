'use strict';

const winston = require('winston');
const config = require('config');
const { getNamespace } = require('cls-hooked');
function create(meta = {}){
    const logger = winston.createLogger({
        level: config.logger.level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        defaultMeta: Object.assign(config.logger.metadata, meta),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                    winston.format.printf(({ level, message, timestamp, ...meta }) => {
                        return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                    })
                )
            })
        ],
    });

    logger.writeLog = function writeLog(message, additionalData = {}) {
        const context = getNamespace('requestContext');
        const telemetry = context && context.get('telemetryContext');
        const logData = {
            message,
            telemetry,
            ...additionalData,
        };
        this.debug(logData);
    };

    return logger;
}

module.exports = {
    create,
};
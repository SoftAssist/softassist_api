const http = require('http');
const https = require('https');
const logger = require('./logger').create();
const {v4: uuidv4 } = require('uuid');
const {getNamespace} = require('cls-hooked');

function findExistingTraceId() {
    let context;
    try{
        context = getNamespace('requestContext');

        if(context) {
            const telemetryContext = context.get('telemetryContext');
            if(telemetryContext && telemetryContext.traceId) {
                return telemetryContext.traceId;
            }

            const traceId = uuidv4();
            context.set('telemetryContext', {traceId, ...telemetryContext});
            return traceId;
        }
    
    }
    catch(e) {
        logger.writeLog(e);
    }
    return null;
}   

function logRequest(req) {
    const logs = {
        method: req.method || 'GET',
        host: req.host || req.hostname || 'localhost',
        port: req.port || '443',
        path: req.pathname || req.path || '/',
        headers: req.headers || {},
        body: req.body || {},
        traceId: findExistingTraceId()
    };
    logger.info('External API Request:', logs);
}

function override(module) {
    const original = module.request;

    function wrapper() {
        const outgoing = arguments[0];
        if (!outgoing.traceId) {
            outgoing.traceId = findExistingTraceId();
        }

        const req = original.apply(this, arguments);
        const { emit } = req;
        let body = '';

        req.emit = function(eventName, response) {
            if (eventName === 'response') {
                response.on('data', chunk => {
                    body += chunk;
                });

                response.on('end', () => {
                    const res = {
                        statusCode: response.statusCode,
                        headers: response.headers,
                        message: response.statusMessage,
                        body,
                        traceId: outgoing.traceId
                    };
                    if (body.length < 5000) {
                        logger.info('External API Response:', res);
                    }
                });
            }
            return emit.apply(this, arguments);
        };

        logRequest(outgoing);
        return req;
    }

    module.request = wrapper;
}

function hijack() {
    override(http);
    override(https);

}

module.exports = hijack;
const http = require('http');
const https = require('https');
const logger = require('../lib/logger').create();
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
}   ;

function override(module) {
    const original = module.request;

    function logging(req) {
        const logs = {
            method: req.method || 'GET',
            host: req.host || req.hostname || 'localhost',
            port: req.port || '443',
            path: req.pathname || req.path || '/',
            headers: req.headers || {},
            body: req.body || {},
            traceId: findExistingTraceId(),
            body: req.body || {},

        };


        logger.writeLog(logs);
        
        function wrapper(outgoing) {
            if(!outgoing.traceId) {
                outgoing.traceId = findExistingTraceId();
            }
            const req = original.apply(this, arguments);
            const { emit } = req;
            let body = '';

            req.emit = function (eventName, response) {
                switch (eventName) {

                    case 'response': {
                        response.on('end', () => {
                            const res = {
                                statusCode: response.statusCode,
                                headers: response.headers,
                                message: response.statusMessage,
                                body,
                                traceId: outgoing.traceId,

                            };
                            if(res.body.length < 5000) {
                                logger.writeLog(res);
                            }
                        });
                    }
                }
                return emit.apply(this, arguments);
            };
            logging(outgoing);
            return req;
        }
                module.request = wrapper;
    }
}
function hijack() {
    override(http);
    override(https);

};

module.exports = {
    hijack,
};
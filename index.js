const config = require('config');
const { createNamespace } = require('cls-hooked');
const context = createNamespace('requestContext');
const express = require('express');
const bodyParser = require('body-parser');

const log = require('./lib/logger').create();
const telemetry = require('./middleware/telemetry');
const requestResponseCapture = require('./middleware/requestResponseCapture');
const controllers = require('./controllers');
const hijack = require('./lib/hijack');
const cors = require('cors');

const app = express();

app.use((req, res, next) => {
    context.run(() => next());
});

if(config.logger.externalApiLogging) {
    hijack();
}

app.use(cors({
    origin: ['http://localhost:3000'],
}));
app.use(bodyParser.json());

if(config.logger.requestLogging) {
    app.use(requestResponseCapture.capturePayloads);
}

app.use(telemetry.initializeTelemetry);
app.use(telemetry.updateTelemetry);
app.use('/health', async (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: config.get('version'),
    });
});

app.use('/api/v1', controllers.v1);

const server = app;
server.listen(config.get('http.port'), () => {
    
    log.info('Current NODE_ENV:', process.env.NODE_ENV);
log.info('Current config:', config.util.getEnv('NODE_ENV'));
log.info(`Server is running on port ${config.get('http.port')}`);
});


process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = server;
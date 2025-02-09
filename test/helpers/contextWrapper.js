const { createNamespace, getNamespace } = require('cls-hooked');
const { v4: uuidv4 } = require('uuid');

// Create the namespace if it doesn't exist
const context = getNamespace('requestContext') || createNamespace('requestContext');

function withContext(fn) {
    return new Promise((resolve, reject) => {
        context.run(() => {
            // Initialize default telemetry context
            const telemetryContext = {
                traceId: uuidv4(),
            };
            context.set('telemetryContext', telemetryContext);
            
            Promise.resolve(fn())
                .then(resolve)
                .catch(reject);
        });
    });
}

module.exports = { withContext, context }; // Export context for debugging 
const { withContext } = require('./helpers/contextWrapper');

// Override the global it/test function to automatically wrap tests
const originalIt = global.it;
global.it = function(title, fn) {
    
    if (!fn) return originalIt(title);
    
    return originalIt(title, function() {
        
        if (fn.length) {  // If the test takes a done callback
            return new Promise((resolve, reject) => {
                withContext(() => {
                    const result = fn.call(this, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                    if (result && result.then) {
                        return result.then(resolve).catch(reject);
                    }
                });
            });
        }
        
        return withContext(() => fn.call(this));
    });
};

// Also wrap the it.only function
global.it.only = function(title, fn) {
    return originalIt.only(title, function() {
        return withContext(() => fn.call(this));
    });
}; 
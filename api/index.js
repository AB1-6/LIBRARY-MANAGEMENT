const app = require('../server');

// Export Express app as Vercel serverless function
module.exports = app;
module.exports.default = app;

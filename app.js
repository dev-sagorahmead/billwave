// cPanel & Production Entry Point
require('dotenv').config();
const app = require('./server/src/index');

module.exports = app;

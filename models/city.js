// Load required packages
var mongoose = require('mongoose');

// define city schema
var CitySchema = new mongoose.Schema({
    name: { type: String, lowercase: true }
});

// Export the Mongoose model
module.exports = mongoose.model('City', CitySchema);

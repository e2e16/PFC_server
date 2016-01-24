// Load required packages
var mongoose = require('mongoose');

// define category schema
var CategorySchema = new mongoose.Schema({
    name: { type: String, lowercase: true }
});

// Export the Mongoose model
module.exports = mongoose.model('Category', CategorySchema);

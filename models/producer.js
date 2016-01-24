// Load required packages
var mongoose = require('mongoose');

// define producer schema
var ProducerSchema = new mongoose.Schema({
    name: { type: String, lowercase: true },
    category: { type: String, lowercase: true },
    address: {
        street: { type: String, lowercase: true },
        city: { type: String, lowercase: true }
    },
    geo: {
        longitude: Number,
        latitude: Number
    },
    contact: {
        phone: { type: String, lowercase: true },
        email: { type: String, lowercase: true },
        web: { type: String, lowercase: true }
    },
    limit: {
        week: Number,
        month: Number
    }
});

// Export the Mongoose model
module.exports = mongoose.model('Producer', ProducerSchema);

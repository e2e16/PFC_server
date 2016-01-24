// Load required packages
var mongoose = require('mongoose');

// define message schema
var MessageSchema = new mongoose.Schema({
    aps: {
        alert: String,
    },
    content: {
        body: String,
        deadline: String,
    },
    producer: {  
        pid: { type: String, lowercase: true },
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
        }
    },
    cat: {
        version: String,
    },
    protocol: {
        version: String
    },
});

// Export the Mongoose model
module.exports = mongoose.model('Message', MessageSchema);

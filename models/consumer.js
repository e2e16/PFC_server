// Load required packages
var mongoose = require('mongoose');

// define consumer schema
var ConsumerSchema = new mongoose.Schema({
    token: String,
    notifications: {
        // off - 0
        // on, individual notifications - 1
        // on, aggregated notifications - 2
        notitype: Number,
        // off - 0
        // on - 1
        roaming: Number
    },
    location: {
        longitude: Number,
        latitude: Number
    },
    subscriptions: [String], // list of category_id 
    blocked: [String]       // list of producer_id
});

// Export the Mongoose model
module.exports = mongoose.model('Consumer', ConsumerSchema);


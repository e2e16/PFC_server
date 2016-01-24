var mongoose = require('mongoose');
// var apn = require('apn');
var Consumer = require('./models/consumer.js');
var Category = require('./models/category.js');
var Promise = require('bluebird');
var sender = require('./sender');

// // Connect to e2e MongoDB
// mongoose.connect('mongodb://localhost:27017/e2e');

var controller = exports;

function send2SubscribedCustomers(message) {
    var recipients = []
    var myCatID
    Category.
    findOne({'name': message.producer.category}).
    select({ _id: 1 }).
    exec(function(err, res) {
        if (err) {
            console.log('GET.CATEGORY: Error');
            console.log(err);
        }
        if (res) {
            // console.log('DEBUG: '+res)
            console.log('GET.CATEGORY: Success');
            myCatID = res._id
            var myProID = message.producer.pid
            console.log('DEBUG: myCatID '+myCatID)
            console.log('DEBUG: myProID '+myProID)
            console.log('SENDER: finding recipients')
            Consumer.
            find({
                subscriptions: { $eq: myCatID },
                blocked: { $ne: myProID }
            }).
            select({ token: 1 }).
            exec(function(err, res) {
                if (err) {
                    console.log('GET.CONSUMERS: Error');
                    console.log(err);
                }
                if (res) {
                    console.log('GET.CONSUMERS: Success');
                    // console.log(res);
                    for (var i = 0; i < res.length; i++) {
                        recipients.push(res[i].token);
                    // sender.sendOne(res[0].token, message)
                    }
                    console.log('SENDER: found '+recipients.length+' recipients')
                    console.log('SENDER: sending message to array of consumers');
                    sender.sendArray(recipients, message);
                }
            });
                }
    });
}

// Message POST Action
controller.messagePostAction = function(message) {
    console.log('CONTROLLER.POST.MESSAGE: activated');
    send2SubscribedCustomers(message);
}



var apn = require('apn');
var Message = require('./models/message.js');
// var Promise = require('bluebird');

var sender = exports;

var options = { };
var apnConnection = new apn.Connection(options);


// send one notification
sender.sendOne = function(token, message) {
        var myDevice = new apn.Device(token);
        var note = new apn.Notification();
        note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
        note.badge = 0;
        note.sound = 'ping.aiff';
        note.contentAvailable = true;
        note.setContentAvailable = 1;
        note.alert = message.alert;
        note.payload = message.payload;
        apnConnection.pushNotification(note, myDevice);
        apnConnection.shutdown();
}

// send notifications to an array of tokens
sender.sendArray = function(tokenArray, message) {
    console.log('SENDER: sending to array')
    console.log('DEBUG: the array '+tokenArray)
    console.log('DEBUG: the message '+message)
    // console.log('DEBUG: the message'+message)
    var myDevice;
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.badge = 0;
    note.sound = 'ping.aiff';
    note.contentAvailable = true;
    note.setContentAvailable = 1;
    // console.log('the Alert: '+message.aps.alert)
    note.alert = message.aps.alert;
    // console.log('the Content: '+message.content);
    note.payload = {'_id': message._id, 'content': message.content, 'producer': message.producer, 'cat': message.cat, 'protocol': message.protocol};
    for (var i = 0; i < tokenArray.length; i++) {
        myDevice = new apn.Device(tokenArray[i]);
        apnConnection.pushNotification(note, myDevice);
        console.log('SENDER: message sent to consumer')
        apnConnection.shutdown();
    }
}

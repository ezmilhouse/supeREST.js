var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var name = 'friend'
    , schemas = {};

schemas[name] = new Schema({

    name : {type: String, trim: true},

}, {
    strict : true
});

exports.schema = schemas;
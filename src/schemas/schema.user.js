var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var name = 'user'
    , schemas = {};

schemas[name] = new Schema({

    name    : {type: String, trim: true},

    // ---

    friends : []

}, {
    strict : true
});

exports.schema = schemas;
var bcrypt = require('bcrypt-nodejs');

var mongoose = require('mongoose');

module.exports = function (mongoose) {
  var participationSchema = mongoose.Schema({
    kesc: String, // Kesc
    t1: Number, // t1
    kout: String, // Kout
    t2: Number, // t2
    p : Number,
    n: Number,
    w: Number,
    timestamp: Date,
    txHash: String, // save the hash of transaction: kesc' => kout. available when status = 'processing'
    status: String, // pending, received, processing, rejected, success
  });

  var Participation = mongoose.model("Participation", participationSchema);
  return Participation;
}
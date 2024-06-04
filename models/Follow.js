const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const followSchema = new Schema({
  follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followed: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  follow_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Follow', followSchema);

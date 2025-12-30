const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/attendanceSys');
const sessionSchema = new mongoose.Schema({
    sessionDate: Date,          
    attendedby: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    topic: String,
    conductedBy: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    comment: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, text: String }],
    image: String
});
module.exports = mongoose.model("Session", sessionSchema);
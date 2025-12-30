const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/attendanceSys');

const userSchema = new mongoose.Schema({
  name: String,
  email: {type: String, unique: true},
  password: String,
    batch: String,
    age: Number,
    year: String,
    role: { type: String, default: 'User' },
    profilephoto:String,
    photo_links:[{type:String}],//photo uploaded by user  cloudinary urls
    photo_data:[{
      photolink:[{type:String}],
      Encodings:[{type:Number}]
      }],
      average_encoding:[{type:Number}],
    attendance:[{
      present_dates:[{type:Date}],
      absentdates:[{type:Date}],
      sessions_attended: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
      days_present:Number
    }
    ]  

});

module.exports = mongoose.model("user", userSchema);

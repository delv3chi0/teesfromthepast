const { Schema, model } = require('mongoose');

const SchedulePostSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  draftText:    { type: String, required: true },
  dateTimeUTC:  { type: Date,   required: true },
  timeZone:     { type: String, required: true },
  repeatRule:   { type: String },
  platform:     { type: String }
}, { timestamps: true });

module.exports = model('SchedulePost', SchedulePostSchema);

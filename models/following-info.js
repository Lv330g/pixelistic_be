const mongoose = require('mongoose');

const FollowingInfoSchema = new mongoose.Schema({
  followingId: String,
  favorite: {
    type: Boolean,
    default: false
  },
  newMessages: {
    type: Number,
    default: 0
  }
});

FollowingInfoSchema.statics.follow = async (req, res, next) => {
  const data = await new FollowingInfo({
    'followingId': req.body.following
  }).save();

  req.payload = {
    newMessages: data.newMessages,
    followingId: data.followingId,
    followingInfoId: data._id,
  };

  next();
};

FollowingInfoSchema.statics.unfollow = async (req, res, next) => {
  await FollowingInfo.findByIdAndRemove(req.body.followingInfoId);
  next();
};

FollowingInfoSchema.statics.handleFavorite = async (req, res, next) => {
  await FollowingInfo.findByIdAndUpdate(req.body.followingInfoId, {'favorite': req.body.checked});
  next();
};

const FollowingInfo = mongoose.model('FollowingInfo', FollowingInfoSchema);
module.exports = FollowingInfo;

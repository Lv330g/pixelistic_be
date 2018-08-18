const express = require('express');
const router = express.Router();
const expressJwt = require('express-jwt');
const authenticate = expressJwt({secret : 'server secret'});
const { User } = require('../models/user');
const FollowingInfo = require('../models/following-info');

const getAdditionalInfo = async (req, res, next) => {
  const data = await User.findById(
    {'_id': req.body.following}, 
    'status -_id'
  );

  req.payload.status = data.status;
  next();
}

router.post('/follow', authenticate, FollowingInfo.follow, User.follow, getAdditionalInfo, (req, res) => {
  res.status(200).json({payload: req.payload});
});

router.post('/unfollow', authenticate, FollowingInfo.unfollow, User.unfollow, (req, res) => {
  res.status(200).json({payload: req.body.following});
});

router.post('/handle-favorite', authenticate, FollowingInfo.handleFavorite, (req, res) => {
  res.status(200).json({payload: req.body});
});

module.exports = router;

const express = require('express');
const router = express.Router();
const expressJwt = require('express-jwt');
const authenticate = expressJwt({secret : 'server secret'});
const { User } = require('../models/user');
const profileUtil = require('../utils/profile');

router.get('/get-profile/:nickname', authenticate, User.getProfile, (req, res) => {
  res.status(200).json({payload: req.payload});
});

router.post('/:id', authenticate, profileUtil.saveAvatar, User.saveEditProfile, (req, res) => {
  res.status(200).json({payload: req.payload});
});

module.exports = router;

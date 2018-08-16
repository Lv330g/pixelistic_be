const express = require('express');
const router = express.Router();
const expressJwt = require('express-jwt');
const authenticate = expressJwt({secret : 'server secret'});
const { User } = require('../models/user');

router.get('/get-profile/:nickname', authenticate, User.getProfile, (req, res) => {
  console.log(req.payload);
  res.status(200).json({payload: req.payload});
});

module.exports = router;

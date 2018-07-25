const express = require('express');
const router = express.Router();
const User = require('../models/user')

router.post('/register', User.validate, async (req, res, next) => {
  try {
    req.session.user = await User.create(req.body);
    return res.status(200).json({ user: req.session.user });
  }catch (err) {
    err.status = 422;
    return next(err);
  }
});

router.post('/login', User.authenticate, (req, res) => {
  res.status(200).json({ user: req.session.user });
});

router.get('/logout', function (req, res, next) {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return next(err);
    });
  }
});

module.exports = router;

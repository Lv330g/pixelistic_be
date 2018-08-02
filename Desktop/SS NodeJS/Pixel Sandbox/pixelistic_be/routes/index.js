const express = require('express');
const User = require('../models/user');
const bcrypt = require('bcrypt');

const router = express.Router();
const nodemailer = require("nodemailer");

const expressJwt = require('express-jwt');  
const authenticate = expressJwt({secret : 'server secret'});
const jwt = require('jsonwebtoken');

let newUser, rand;

const prepareUser = ({_id, nickname, email, isAdmin}) => {
  return {_id, nickname, email, isAdmin};
}
/**
 * Function sends an email to confirm the user's email address
 *
 * @param {String} email
 */
function confirmEmail(email) {
  const smtpTransport = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'together0chat@gmail.com',
      pass: 'qweasdzxc0',
    }
  });
  bcrypt.hash(email, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    rand = hash;
    let link = `http://127.0.0.1:8080/verify?hash=${rand}`;
    let mailOptions = {
      to: email,
      subject: 'Please confirm your Email account',
      html: `Hello,<br> Please Click on the link to verify your email.<br><a href=${link}>Click here to verify</a>`,
    };
    smtpTransport.sendMail(mailOptions);
  })
}

router.get('/verify', async (req, res, next) => {
  if (req.query.hash === rand) {
    try {
      req.session.user = await User.create(newUser);
      rand = null;
      return res.status(200).json({
        user: prepareUser(req.session.user),
      });
    } catch (err) {
      err.status = 422;
    }
  }
  else{
    let error = new Error('Verification failed: hashes do not matched');
    error.status = 422;
    next(error);
  }
});




router.post('/register',User.validate, async (req, res, next) => {
  if (await User.isUserInDB(req.body.email, req.body.nickname)) {
    const err = new Error('User exists');
    err.status = 422;
    next(err);
  }
  confirmEmail(req.body.email);
  newUser = req.body;
  return res.status(200).json({text: `Email has been sent. Please check the inbox`});
});

router.post('/login', User.authenticate, (req, res) => {
  req.token = jwt.sign( req.session.user.toObject() , 'server secret', { expiresIn: '2h' });
  res.status(200).json({ user: prepareUser(req.session.user), accessToken: req.token});
});

router.get('/logout', (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return next(err);
    });
  }
});

router.post('/validate-token', authenticate, (req, res) => {
  res.status(200).json({ user: prepareUser(req.user) });
});


module.exports = router;

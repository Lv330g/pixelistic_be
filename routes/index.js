const express = require("express");
const User = require("../models/user");
const HashForEmail = require("../models/hashForEmail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const nodemailer = require("nodemailer");
const expressJwt = require("express-jwt");
const authenticate = expressJwt({ secret: "server secret" });


/**
 * Function sends an email to confirm the user's email address
 *
 * @param {Object} user
 */
const confirmEmail = user => {
  const smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "together0chat@gmail.com",
      pass: "qweasdzxc0"
    }
  });
  bcrypt.hash(user.email, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    let newUser = {
      nickname: user.nickname,
      email: user.email,
      password: user.password,
      hash
    };
    HashForEmail.create(newUser);

    //Delete the cache after 5 minutes of ignoring
    setTimeout(() => {
      HashForEmail.findOne({ hash: hash }, (err, hashForEmail) => {
        hashForEmail.remove();
      });
    }, 5 * 60 * 1000);

    let link = `http://127.0.0.1:8080/verify?hash=${newUser.hash}`;
    let mailOptions = {
      to: user.email,
      subject: "Please confirm your Email account",
      html: `Hello,<br> Please Click on the link to verify your email.<br><a href=${link}>Click here to verify</a>`
    };
    smtpTransport.sendMail(mailOptions);
  });
};

router.post("/register", User.validate, async (req, res, next) => {
  if (await User.isUserInDB(req.body.email, req.body.nickname)) {
    const err = new Error("User exists");
    err.status = 422;
    next(err);
  }
  confirmEmail(req.body);
  return res
    .status(200)
    .json({ text: `Email has been sent. Please check the inbox` });
});

const authUser = (req, res) => {
  req.token = jwt.sign(User.prepareUser(req.session.user), 'server secret', { expiresIn: '2h'});
  res.status(200).json({user: User.prepareUser(req.session.user), accessToken: req.token});
}

router.post('/login', User.authenticate, authUser);

router.post('/login/social', User.authenticateSocial, authUser);

router.get("/validate-token", authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

router.get("/logout", (req, res, next) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) return next(err);
      return res.status(200).json({});
    });
  }
  res.status(200).send();
});

router.get("/verify", (req, res, next) => {
  HashForEmail.findOne({ hash: `${req.query.hash}` }, (err, hashForEmail) => {
    try {
      let newUser = {
        nickname: hashForEmail.nickname,
        email: hashForEmail.email,
        password: hashForEmail.password
      };
      //Add user and delete hash
      User.create(newUser);
      hashForEmail.remove();
      res.redirect("/");
    } catch (err) {
      err.status = 422;
      next(err);
    }
    if (err) {
      let error = new Error("Verification failed");
      error.status = 422;
      next(error);
    }
  });
});

router.post("/search", async (req, res) => {
  let users = await User.find({}).select('nickname -_id');
  res.status(200).send(users);
});

router.get('/profile/:nickname', User.userProfile);

router.post('/profile/:id', User.saveEditProfile);

module.exports = router;

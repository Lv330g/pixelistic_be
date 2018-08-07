const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');

const UserSchema = new mongoose.Schema({
  nickname: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
   email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin:{
    type: Boolean,
    default: false
  }
});
UserSchema.plugin(uniqueValidator, { message: 'This {PATH} already used' });

UserSchema.statics.authenticate = async (req, res, next) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if(!user){
      let err = new Error('Email or password is incorrect');
      err.status = 422;
      return next(err);
    } 
    let match = await bcrypt.compare (req.body.password, user.password);
    if(match) {
      req.session.user = user; 
      return next();
    } else { 
      let err = new Error('Email or password is incorrect');
      err.status = 422;
      return next(err);
    }
  } catch (err) {
    err.status = 422;
    return next(err);
    }
}

UserSchema.statics.isUserInDB = async (email, nickname) => {
   let res = await User.find( { $or: [ { email: email }, { nickname: nickname } ] } );
   return res.length;
}

UserSchema.statics.validate = (req, res, next) => {
  req.checkBody('nickname', 'Name is required').notEmpty();
  req.checkBody('email', 'Name is required').notEmpty()
  req.checkBody('email', 'Email must be valid').isEmail();
  req.checkBody('passwordConf','Password is required').notEmpty()
  req.checkBody('passwordConf','Password must contain at least 6 characters').isLength({ min:  6});
  req.checkBody('password','Password is required').notEmpty();
  req.checkBody('password','Password must contain at least 6 characters').isLength({ min:  6});
  req.checkBody('password','Passwords do not matched').equals(req.body.passwordConf);

  let errors = req.validationErrors();
  if (errors) {
    let err =  new Error (errors[0].msg);
    err.status = 422;
    return next(err);
  }
  return next();
}

UserSchema.pre('save',  function (next) {
  let user = this;
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    user.password = hash;
    user.passwordConf = hash;
    next();
  })
});

const User = mongoose.model('User', UserSchema);
module.exports = User;

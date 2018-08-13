const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');

const prepareUser = ({_id, nickname, email, isAdmin, avatar, userName, website, userBio}) => {
  return {_id, nickname, email, isAdmin, avatar, userName, website, userBio};
}

const UserSchema = new mongoose.Schema({
  nickname: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
  },
  isAdmin:{
    type: Boolean,
    default: false
  },
  googleID:{
    type: String,
  },
  facebookID:{
    type: String,
  },
  friends:{
    type: Array
  },
  status:{
    type: String
  },
  newMessages:{
    type: Number
  },
  userName:{
    type: String
  },
  website:{
    type: String
  }, 
  userBio:{
    type: String
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

UserSchema.statics.authenticateSocial = async (req, res, next) => {
  let currentUser;
  try {
    const user = req.body.user;

    if(user.googleId) {
      currentUser = await User.findOne({
        googleID: user.googleId
      });
    } else {
      currentUser = await User.findOne({
        facebookID: user.id
      });
    }
      
    if (currentUser) {
      req.session.user = currentUser; 
      return next();
    }

    currentUser = await User.findOne({
      email: user.email
    });
    
    if (currentUser) {
      if(user.googleId) {
        await User.update({email: user.email}, {
          googleID: user.googleId,
          avatar: user.imageUrl
        });
      } else {
        await User.update({email: user.email}, {
          facebookID: user.id,
          avatar: user.picture.data.url
        });
      }
      
      req.session.user = currentUser; 
      return next();
    }

    let newUser;
    if(user.googleId) {

      newUser = await new User({
        nickname: user.name,
        googleID: user.googleId,
        email: user.email,
        avatar: user.imageUrl
      }).save();
    } else {
      newUser = await new User({
        nickname: user.name,
        facebookID: user.id,
        email: user.email,
        avatar: user.picture.data.url
      }).save();
    }

    req.session.user = newUser; 
    return next();
  } catch (err) {
    err.status = 422;
    return next(err);
  };
};

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

UserSchema.statics.userProfile = async (req, res, next) => {
  let nickname = req.params.nickname;
  let profile = await User.find( {nickname: nickname} );
  if (profile.length > 0)
  {
    res.status(200).json({userprofile: prepareUser(profile[0])});
  } else {
    let error = new Error("User not found");
      error.status = 404;
      next(error);
  }
};

UserSchema.statics.saveEditProfile = async (req, res, next) => {
  let nickname = req.params.nickname;
  if (await User.isUserInDB('', nickname))
  {
    User.find({ nickname: nickname}, function (err, docs) {
      docs[0].set({ 
        userName: req.body.userName,
        website: req.body.website,
        userBio: req.body.userBio
      });
      docs[0].save(function (err, userProfile) {
        if (err) return next(err);
        res.status(200).send({userprofile: prepareUser(userProfile)});
      });
    });
  } else {
    res.status(404).send();
  }
};

UserSchema.pre('save',  function (next) {
  let user = this;
  if (user.password){
    if (!user.isModified('password')) return next();
    bcrypt.hash(user.password, 10, (err, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      user.passwordConf = hash;
      next();
    });
  } else {
    next();
  }
});

const User = mongoose.model('User', UserSchema);
User.prepareUser = prepareUser;
module.exports = User;

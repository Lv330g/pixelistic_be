const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');

const profileUtil = require('../utils/profile');

const UserSchema = new mongoose.Schema({
  nickname: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: 'https://cdn4.iconfinder.com/data/icons/evil-icons-user-interface/64/avatar-512.png'
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  resetPasswordToken:{
    type: String,
    default: false
  },
  resetPasswordExpires:{
    type: String,
    default: false
  },  
  isAdmin:{
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'offline'
  },
  fullName: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  socketId: {
    type: String,
    default: 'offline'
  },
  followingsInfo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FollowingInfo' }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.ObjectId, ref: 'Post' }],
  password: String,
  googleID: String,
  facebookID: String
});

UserSchema.plugin(uniqueValidator, { message: 'This {PATH} already used' });

const getUser = async (query) => {
  return await User.findOne(query)
  .populate({ 
    path: 'posts',
    populate: { path : 'author', select: 'nickname avatar'}
  })
  .populate('followingsInfo', 'favorite newMessages followingId')
  .populate('followings', 'status nickname avatar userBio website userName -_id')
  .populate ( {path: 'followings', populate: {
    path:'posts',
    populate: { path : 'author', select: 'nickname avatar'}
  }})
  .populate('followers', 'status socketId');
}

//'status nickname avatar posts userBio website userName -_id'

UserSchema.statics.authenticate = async (req, res, next) => {
  try {
    let user = await getUser({ email: req.body.email });

    if (!user) {
      let err = new Error('Email or password is incorrect');
      err.status = 422;
      return next(err);
    }
    let match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
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

    if (user.googleId) {
      currentUser = await getUser({ googleID: user.googleId });
    } else {
      currentUser = await getUser({ facebookID: user.id });
    }

    if (currentUser) {
      req.session.user = currentUser;
      return next();
    }

    currentUser = await getUser({ email: user.email });

    if (currentUser) {
      if (user.googleId) {
        await User.update({ email: user.email }, {
          googleID: user.googleId,
        });
      } else {
        await User.update({ email: user.email }, {
          facebookID: user.id,
        });
      }

      req.session.user = currentUser;
      return next();
    }

    let newUser;
    if (user.googleId) {
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
  let res = await User.find({ $or: [{ email: email }, { nickname: nickname }] });
  return res.length;
}
UserSchema.statics.isEmailDB = async (req, res, next) => {
  let result = await User.findOne({ email: req.body.email });
  if (result) {
    bcrypt.hash(toString(result.email), 10, (err, hash) => {
      if (err) {
        return next(err);
      }else{
        token = hash;
        resetPasswordToken = token;
        resetPasswordExpires = Date.now() + 3600000; // 1 hour
        result.update( {resetPasswordToken:resetPasswordToken}).exec();
        result.update( {resetPasswordExpires:resetPasswordExpires}).exec();

        return next();
      }
    })
  } else {
    const err = new Error('There is no user with this email');
    err.status = 422;
    return next(err);
  }
}

UserSchema.statics.isResetTikenOk = (req, res, next) => {
  User.findOne({ resetPasswordToken: req.query.reset, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (user === null) {
    const err = new Error('Token incorect or expire');
    err.status = 422;
    return next(err);
    } else {
      return next();
    } 
  });
}

UserSchema.statics.isPaswordChanged = (req, res, next) => {
  let token = req.body.resetToken.substring(7, req.body.resetToken.length)
  if(req.body.password === req.body.passwordConf){
    User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, result) {
      if (result === null) {
      const err = new Error('Token incorrect or expore!');
      err.status = 422;
      return next(err);
      } else {
          bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) {
              return next(err);
            } else {
              result.update( {password:hash}).exec();
              return next();
            }
          })
      } 
    });
  } else {
    const err = new Error('Passwords does not match');
      err.status = 422;
      return next(err);
  }
}

UserSchema.statics.validate = (req, res, next) => {
  req.checkBody('nickname', 'Name is required').notEmpty();
  req.checkBody('email', 'Name is required').notEmpty()
  req.checkBody('email', 'Email must be valid').isEmail();
  req.checkBody('passwordConf', 'Password is required').notEmpty()
  req.checkBody('passwordConf', 'Password must contain at least 6 characters').isLength({ min: 6 });
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password', 'Password must contain at least 6 characters').isLength({ min: 6 });
  req.checkBody('password', 'Passwords do not matched').equals(req.body.passwordConf);

  let errors = req.validationErrors();
  if (errors) {
    let err = new Error(errors[0].msg);
    err.status = 422;
    return next(err);
  }
  return next();
}

UserSchema.pre('save', function (next) {
  let user = this;
  if (user.password) {
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

// followings
UserSchema.statics.follow = async (req, res, next) => {
  try {
    await User.findOneAndUpdate(
      {'_id': req.body.current},
      {$push: {'followingsInfo': req.payload.followingInfoId, 'followings': req.body.following}},
    );
    await User.findOneAndUpdate(
      {'_id': req.body.following},
      {$push: {'followers': req.body.current}},
    );
    next();
  } catch (err) {
    next(err);
  }
};

UserSchema.statics.unfollow = async (req, res, next) => {
  try {
    await User.findOneAndUpdate(
      {'_id': req.body.current},
      {$pull: {'followingsInfo': req.body.followingInfoId, 'followings': req.body.followingId}}
    );
    await User.findOneAndUpdate(
      {'_id': req.body.followingId},
      {$pull: {'followers': req.body.current}}
    );
    next();
  } catch (err) {
    next(err);
  }
};

//profile
UserSchema.statics.getProfile = async (req, res, next) => {
  try {
    req.payload = await User.findOne(
      {nickname: req.params.nickname},
      'avatar posts nickname followings followers userBio userName website'
    ).populate({ 
      path: 'posts',
      populate: { path : 'author', select: 'nickname avatar'}
    });
    next();
  } catch (err) {
    next(err);
  }
};

UserSchema.statics.saveEditProfile = async (req, res, next) => {
  try {
    let userId = req.params.id;
    let avatar = null;
    profileUtil.saveAvatar(req.body.avatar, userId, (pathToAvatar) => { avatar = pathToAvatar })
    let updatedProfile = {
      fullName: req.body.fullName,
      nickname: req.body.nickname,
      website: req.body.website,
      bio: req.body.bio
    }
    if (avatar) {
      updatedProfile.avatar = avatar
    }

    let userProfile = await User.findOneAndUpdate(
      { _id: userId },
      { $set: updatedProfile },
      { new: true }
    );
    req.payload = userProfile;
    next();
  } catch (err) {
    if (err.name === 'MongoError' && err.code === 11000) {
      let error = new Error('The nickname already exist');
      error.status = 409;
      next(error);
    } else {
      next(err);
    }
  };
};

//dashboard
UserSchema.statics.getUsersForAdmin = async (req, res, next) => {
  try {
    req.payload = await User.find({});
    console.log(req.payload);
    next();
  } catch (err) {
    err.status = 404;
    next(err);
  }
};

UserSchema.statics.updateStatus = async (req, res, next) => {
  const newUser = await User.findByIdAndUpdate(req.body.id, { $set:{'isActive': req.body.status }},{ new: true});
  req.status = newUser.isActive;
  next();
};

const User = mongoose.model('User', UserSchema);
module.exports = { User, getUser };

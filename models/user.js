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
  avatar: {
    type: String,
    default: 'https://cdn4.iconfinder.com/data/icons/evil-icons-user-interface/64/avatar-512.png'
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  isAdmin:{
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'offline'
  },
  followingsInfo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FollowingInfo' }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type : mongoose.Schema.ObjectId, ref: 'Post' }],
  password: String,
  googleID: String,
  facebookID: String,
  userName: String,
  website: String,
  userBio: String, 
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
  }});
}

//'status nickname avatar posts userBio website userName -_id'

UserSchema.statics.authenticate = async (req, res, next) => {
  try {
    let user = await getUser({email: req.body.email});

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
      currentUser = await getUser({googleID: user.googleId});
    } else {
      currentUser = await getUser({facebookID: user.id});
    }
      
    if (currentUser) {
      req.session.user = currentUser; 
      return next();
    }

    currentUser = await getUser({email: user.email});
    
    if (currentUser) {
      if(user.googleId) {
        await User.update({email: user.email}, {
          googleID: user.googleId,
        });
      } else {
        await User.update({email: user.email}, {
          facebookID: user.id,
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

// followings
UserSchema.statics.follow = async (req, res, next) => {
  await User.findOneAndUpdate(
    {'_id': req.body.current},
    {$push: {'followingsInfo': req.payload.followingInfoId, 'followings': req.body.following}},
  );
  await User.findOneAndUpdate(
    {'_id': req.body.following},
    {$push: {'followers': req.body.current}},
  );
  next();
};

UserSchema.statics.unfollow = async (req, res, next) => {
  await User.findOneAndUpdate(
    {'_id': req.body.current},
    {$pull: {'followingsInfo': req.body.followingInfoId, 'followings': req.body.followingId}}
  );
  await User.findOneAndUpdate(
    {'_id': req.body.followingId},
    {$pull: {'followers': req.body.current}}
  );
  next();
};

//profile
UserSchema.statics.getProfile = async (req, res, next) => {
  req.payload = await User.findOne(
    {nickname: req.params.nickname},
    'avatar posts nickname followings followers userBio userName website'
  ).populate({ 
    path: 'posts',
    populate: { path : 'author', select: 'nickname avatar'}
  });
  next();
};

const User = mongoose.model('User', UserSchema);
module.exports = { User, getUser };

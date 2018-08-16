const express = require('express');
const router = express.Router();
const expressJwt = require('express-jwt');
const fs = require('fs');
const authenticate = expressJwt({secret : 'server secret'});
const Post = require('../models/post');
const { User } = require('../models/user');

const saveImage = (req, res, next) => {
  const { post } = req.body;
  if(post.image){
    const data = post.image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = new Buffer(data, 'base64');
    const ext = post.image.split(';')[0].split('/')[1];
    const saveDir = `public/images/${post.author}`;
    const completePath = `${saveDir}/${Date.now()}.${ext}`;
    req.body.post.image = completePath;

    if(!fs.existsSync(saveDir)){
      fs.mkdirSync(saveDir); 
    }

    try{
      fs.writeFileSync(completePath, buffer);
      next();
    } catch(err) {
      fs.unlinkSync(completePath);
      next(err);
    }
  }
}

const addPostToUser = async (req, res, next) => {
  const userId = req.addedPost.author._id;
  const postId = req.addedPost._id;
  try{
    await User.findByIdAndUpdate(userId, { $push: { posts: postId } },{ new: true });
    next();
  } catch(err){
    err.status = 422;
    next(err)  
  }
  
}

router.post('/add-post', authenticate, saveImage, Post.addPost, addPostToUser, (req, res, next) => {
  res.status(200).json({ post: req.addedPost });
})

router.patch('/like-post', Post.addLike, (req, res, next) => {
  res.status(200).json({ newLikes: { likes: req.likes, _id: req.postId } });
});

router.patch('/unlike-post', Post.removeLike, (req, res, next) => {
  res.status(200).json({ newLikes: { likes: req.likes, _id: req.postId } });
});

router.patch('/comment-post', Post.addComment, (req, res, next) => {
  res.status(200).json({ newComments: { comments: req.comments, _id: req.postId } });
});


module.exports = router;

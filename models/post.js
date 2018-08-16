const mongoose = require('mongoose');


const PostSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  author:{
    type: mongoose.Schema.ObjectId , ref: 'User',
    required: true
  },
  likes: [{ type:  mongoose.Schema.ObjectId, ref: 'User' }],
  comments: [{
    text: {
      type: String,
      require: true
    },
    author: {
      type: mongoose.Schema.ObjectId , ref: 'User',
      required: true
    }
  }],
  geolocation: String,
  description: String
});

PostSchema.statics.addPost = async (req, res, next) => {
  try{
    const addedPost = await Post.create(req.body.post);
    req.addedPost = await Post.populate(addedPost, { path: 'author', select: 'nickname avatar' });
    next();
  } catch(err) {
    next(err);
  }
}

const Post = mongoose.model('Post', PostSchema);
module.exports = Post;

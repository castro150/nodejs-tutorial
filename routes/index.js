var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var passport = require('passport');
var jwt = require('express-jwt');

var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

var auth = jwt({ secret: 'SECRET', userProperty: 'payload' });
// TODO é recomendável deixar o secret em uma variável de ambiente
// (igual ao de Users.js), fora da base do código, porque é o segredo
// usado para gerar os tokens. "userProperty" define qual propriedade
// em "req" vai ser colocado os payload do token.

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts) {
    if (err) { return next(err); }

    res.json(posts);
  });
});

router.post('/posts', auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username;

  post.save(function(err, post) {
    if (err) { return next(err); }

    res.json(post);
  });
});

// TODO refatorar para tirar o .param() deprecated
// e a forma como retorna o post está ruim
router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function(err, post) {
    if (err) { next(err); }
    if (!post) { return next(new Error('can\'t find post')); }

    req.post = post;
    return next();
  });
});

router.get('/posts/:post', function(req, res, next) {
  req.post.populate('comments', function(err, post) {
    if (err) { return next(err); }

    res.json(post);
  });
});

router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post) {
    if (err) { return next(err); }

    res.json(post);
  });
});

router.post('/posts/:post/comments', auth, function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username;

  comment.save(function(err, comment) {
    if (err) { return next(err); }

    req.post.comments.push(comment);
    req.post.save(function(err, post) {
      if (err) { return next(err); }

      res.json(comment);
    });
  });
});

// TODO mesmo comentário que o de cima
router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function(err, comment) {
    if (err) { return next(err); }
    if (!comment) { return next(new Error('can\'t find comment')); }

    req.comment = comment;
    return next();
  });
});

router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if (err) { return next(err); }

    res.json(req.comment);
  });
});

// TODO refatorar para fazer uma função para a busca, com um
// callback para o que vem depois do !post
// router.get('/posts/:post', function(req, res, next) {
//   var query = Post.findById(req.params.post);
//
//   query.exec(function(err, post) {
//     if (err) { next(err); }
//     if (!post) { return next(new Error('can\'t find post')); }
//
//     res.json(post);
//   });
// });
//
// router.put('/posts/:post/upvote', function(req, res, next) {
//   var query = Post.findById(req.params.post);
//
//   query.exec(function(err, post) {
//     if (err) { next(err); }
//     if (!post) { return next(new Error('can\'t find post')); }
//
//     post.upvote(function(err, post) {
//       if (err) { next(err); }
//
//       res.json(post);
//     });
//   });
// });

router.post('/register', function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'Please fill out all fields.' });
  }

  var user = new User();

  user.username = req.body.username;

  user.setPassword(req.body.password);

  user.save(function(err) {
    if (err) { return next(err); }

    return res.json({ token: user.generateJWT() });
  });
});

router.post('/login', function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'Please fill out all fields.' });
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }

    if (user) {
      return res.json({ token: user.generateJWT() });
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});

module.exports = router;

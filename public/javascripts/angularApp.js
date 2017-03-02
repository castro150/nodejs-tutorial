var app = angular.module('flapperNews', ['ui.router']);

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
      resolve: {
        postPromise: ['posts', function(posts) {
          return posts.getAll();
        }]
      }
    }).state('posts', {
      url: '/posts/{id}',
      templateUrl: '/posts.html',
      controller: 'PostsCtrl',
      resolve: {
        post: ['$stateParams', 'posts', function($stateParams, posts) {
          return posts.get($stateParams.id);
        }]
      }
    });

    $urlRouterProvider.otherwise('home');
  }
]);

app.controller('MainCtrl', [
  '$scope',
  'posts',
  function($scope, posts) {
    $scope.test = 'Hellow World!';
    $scope.model = {};
    $scope.posts = posts.posts;

    $scope.addPost = addPost;
    function addPost() {
      if(!$scope.model.title || $scope.model.title === '') { return; }
      posts.create({
        title: $scope.model.title,
        link: $scope.model.link
      });
      $scope.model.title = '';
      $scope.model.link = '';
    }

    $scope.incrementUpvotes = incrementUpvotes;
    function incrementUpvotes(post) {
      posts.upvote(post);
    }
  }
]);

app.controller('PostsCtrl', [
  '$scope',
  'posts',
  'post',
  function($scope, posts, post) {
    $scope.post = post;
    $scope.model = {};

    $scope.addComment = addComment;
    function addComment() {
      if(!$scope.model.body || $scope.model.body === '') { return; }
      posts.addComment(post._id, {
        body: $scope.model.body,
        author: 'user'
      }).success(function(comment) {
        $scope.post.comments.push(comment);
      });
      $scope.model.body = '';
    }

    $scope.incrementUpvotes = incrementUpvotes;
    function incrementUpvotes(comment) {
      posts.upvoteComment(post, comment);
    }
  }
]);

app.factory('posts', ['$http', function($http) {
    var o = {
      posts: []
    };

    o.get = get;
    function get(id) {
      return $http.get('/posts/' + id).then(function(res) {
        return res.data;
      });
    }

    o.getAll = getAll;
    function getAll() {
      return $http.get('/posts').success(function(data) {
        angular.copy(data, o.posts);
      });
    }

    o.create = create;
    function create(post) {
      return $http.post('/posts', post).success(function(data) {
        o.posts.push(data);
      });
    }

    o.upvote = upvote;
    function upvote(post) {
      return $http.put('/posts/' + post._id + '/upvote').success(function(data) {
        post.upvotes += 1;
      });
    }

    o.addComment = addComment;
    function addComment(id, comment) {
      return $http.post('/posts/' + id + '/comments', comment);
    }

    o.upvoteComment = upvoteComment;
    function upvoteComment(post, comment) {
      return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote').success(function(data) {
        comment.upvotes = data.upvotes;
      });
    }

    return o;
  }
]);

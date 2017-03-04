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
    }).state('login', {
      url: '/login',
      templateUrl: '/login.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth) {
        if (auth.isLoggedIn()) {
          $state.go('home');
        }
      }]
    }).state('register', {
      url: '/register',
      templateUrl: '/register.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth) {
        if (auth.isLoggedIn()) {
          $state.go('home');
        }
      }]
    });

    $urlRouterProvider.otherwise('home');
  }
]);

app.controller('MainCtrl', [
  '$scope',
  'posts',
  'auth',
  function($scope, posts, auth) {
    $scope.test = 'Hellow World!';
    $scope.model = {};
    $scope.posts = posts.posts;

    $scope.isLoggedIn = auth.isLoggedIn;
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
  'auth',
  function($scope, posts, post, auth) {
    $scope.post = post;
    $scope.model = {};

    $scope.isLoggedIn = auth.isLoggedIn;
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

app.controller('AuthCtrl', [
  '$scope',
  '$state',
  'auth',
  function($scope, $state, auth) {
    $scope.user = {};

    $scope.register = function() {
      auth.register($scope.user).error(function(error) {
        $scope.error = error;
      }).then(function() {
        $state.go('home');
      });
    }

    $scope.logIn = function() {
      auth.logIn($scope.user).error(function(error) {
        $scope.error = error;
      }).then(function() {
        $state.go('home');
      });
    }
  }
]);

app.controller('NavCtrl', [
  '$scope',
  'auth',
  function($scope, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
  }
]);

app.factory('posts', ['$http', 'auth', function($http, auth) {
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
      return $http.post('/posts', post, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }
      }).success(function(data) {
        o.posts.push(data);
      });
    }

    o.upvote = upvote;
    function upvote(post) {
      return $http.put('/posts/' + post._id + '/upvote', null, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }
      }).success(function(data) {
        post.upvotes += 1;
      });
    }

    o.addComment = addComment;
    function addComment(id, comment) {
      return $http.post('/posts/' + id + '/comments', comment, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }
      });
    }

    o.upvoteComment = upvoteComment;
    function upvoteComment(post, comment) {
      return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
        headers: { Authorization: 'Bearer ' + auth.getToken() }
      }).success(function(data) {
        comment.upvotes = data.upvotes;
      });
    }

    return o;
  }
]);

app.factory('auth', ['$http', '$window', function($http, $window) {
  var auth = {};

  auth.saveToken = function(token) {
    $window.localStorage['flapper-news-token'] = token;
  }

  auth.getToken = function() {
    return $window.localStorage['flapper-news-token'];
  }

  auth.isLoggedIn = function() {
    var token = auth.getToken();

    if (token) {
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  }

  auth.currentUser = function() {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));

      return payload.username;
    }
  }

  auth.register = function(user) {
    return $http.post('/register', user).success(function(data) {
      auth.saveToken(data.token);
    });
  }

  auth.logIn = function(user) {
    return $http.post('/login', user).success(function(data) {
      auth.saveToken(data.token);
    });
  }

  auth.logOut = function() {
    $window.localStorage.removeItem('flapper-news-token');
  }

  return auth;
}]);

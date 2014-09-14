module.exports = function(app, passport){
	var mongoose = require('mongoose');
	var User = require('../models/user.js');

	var getSocialAccount = function(user){
	  var userID, userName, userPicture,
	    facebookAuth = false,
	    githubAuth = false;

	  if(user.facebookID && user.githubID){
	    if(new Date(user.facebookDate) > new Date(user.githubDate)){
	      facebookAuth = true;
	    }
	    else{
	      githubAuth = true;
	    }
	  }
	  else if(user.facebookID){
	    facebookAuth = true;
	  }
	  else if(user.githubID){
	    githubAuth = true;
	  }

	  if(facebookAuth){
	    userID = user.facebookID;
	    userName = user.facebookName;
	    userPicture = user.facebookPicture;
	  }
	  if(githubAuth){
	    userID = user.githubID;
	    userName = user.githubName;
	    userPicture = user.githubPicture;
	  }

	  return {realID: user._id, id: userID, name: userName, picture: userPicture};
	}

	var validateUsername = function(name){
	  if(name == ""){
	    return {error: "Must select username!"}
	  }
	  else if(/[^a-zA-Z0-9]/.test(name)){
	    return {error: "Must only contain alphanumeric characters in username"}
	  }
	  else{
	    return;
	  }
	}


	app.get('/auth/facebook',
	  passport.authenticate('facebook'),
	  function(req, res){
	  });
	app.get('/auth/facebook/callback', 
	  passport.authenticate('facebook', { failureRedirect: '/' }),
	  function(req, res) {
	    req.madpad_user.user = req.user;
	    if(req.user.username) res.redirect('/' + req.user.username);
	    else res.redirect('/account');
	  });

	app.get('/auth/github',
	  passport.authenticate('github'),
	  function(req, res){
	  });
	app.get('/auth/github/callback', 
	  passport.authenticate('github', { failureRedirect: '/' }),
	  function(req, res) {
	    req.madpad_user.user = req.user;
	    if(req.user.username) res.redirect('/' + req.user.username);
	    else res.redirect('/account');
	  });

	app.get('/logout', function(req, res){
	  req.madpad_user.reset();
	  req.logout();
	  res.redirect('/');
	});

	app.get('/account', function(req, res){
	  if(req.madpad_user.user.username){
	    console.log("we are already logged in");
	    res.redirect("/"+req.madpad_user.user.username + "/home");
	  }
	  else{
	    var userData = getSocialAccount(req.madpad_user.user);
	    res.render('account', {user: userData});
	  }
	});

	app.post('/account', function(req, res){
	  if(req.madpad_user.user.username){
	    res.redirect("/" + req.madpad_user.user.username + "/home");
	  }
	  else {
	    var userData = getSocialAccount(req.madpad_user.user);

	    var username = req.body.username;
	    var userError = validateUsername(username);

	    if(userError && userError.error){
	      res.render('account', {user: userData, error: userError.error, previousValue: username});
	    }
	    else{
	    
	      User.findOne({ username: username }, function(err, user){
	        if(err){
	          res.render('account', {user: userData, error: "Database error", previousValue: username});
	        }
	        else{

	          if(user){
	            console.log("User already exists error");
	            res.render('account', {user: userData, error: "User already exists", previousValue: username});
	          }

	          else{
	            User.findByIdAndUpdate(userData.realID, { username: username }, function(err){
	              if(err){
	                console.log("User post submit error: " + err);
	                res.render('account', {user: userData, error: "Error saving to DB", previousValue: username});
	              }
	              else{
	                res.redirect("/" + username + "/home");
	              }
	            });
	          }

	        }

	      });

	    }

	  }
	  
	});

}
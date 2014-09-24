module.exports = function(app){
	
	var mongoose = require('mongoose');
	var User = require('../models/user.js');
	var Pad = require('../models/pad.js');

	var padCookie = require('../padCookie.js');

	var redis = require('redis');
	var sharejs = require('share');
	var options = require('../privacy.js');

	var getPadObject = function(write, read, type, chat){
	  return {
	    isTextPad: true,
	    writeAccess: write,
	    readAccess: read,
	    type: type,
	    chat: chat
	  }
	}

	var getUserInfoFromCookie = function(req){
	  var userID = '';
	  var username = '';

	  if(req.madpad_user && req.madpad_user && req.madpad_user.user && req.madpad_user.user._id){
	    userID = req.madpad_user.user._id;
	    username = req.madpad_user.user.username;
	  }

	  return {id: userID, username: username};
	}

	// get user pads from db and render view
	var getUserPads = function(userID, padName, padType, callback){

	  User.findById(userID, function(err, user){
	    if(err){
	      // TODO - add error logging here
	      console.log('Error: ' + err);
	    }
	    else{
	      if(!user){
	        callback();
	      }
	      else{
	        var pads = user.pads || [];
	        pads = padCookie.sortAndAdd(pads, padName, padType);
	        setUserPads(userID, pads)
	        pads = padCookie.format(pads);
	        callback(pads);
	        
	      }
	      
	    }
	  })
	};

	// store user pads in db
	var setUserPads = function(userID, pads){
	  User.findByIdAndUpdate(userID, {$set: {pads: pads}}, function(err, user){
	    if(err){
	      // TO DO - ERROR CHECKING
	      console.log(err);
	    }
	  })
	};

	// code pad
	app.get('/code/:id', function(req, res){
	  // attach sharejs server
	  sharejs.server.attach(app, options);

	  // get user info
	  var userInfo = getUserInfoFromCookie(req);
	  var userID = userInfo.id;
	  var username = userInfo.username;

	  // set up pad info
	  var padID = req.params.id;
	  var padObject = getPadObject(true, true, 'text', true);
	  padObject.isTextPad = false;

	  var renderView = function(cookiePads){
	    Pad.findOne({'name': 'code_' + padID}, function(err, pad){
	      if(err){
	        // TODO - add error logging here
	        console.log('Error: ' + err);
	        res.render('500')
	      }
	      else {
	        if(!pad){ // pad not in DB
	          var newPad = new Pad({
	            name: 'code_' + padID,
	            owner: 'OWNER',
	            writeAccess: true,
	            readAccess: true,
	            codeType: 'text',
	            chatOn: true
	          })
	          newPad.save(function(err){
	            if(err){
	              // TODO - add error logging here
	              console.log('Error: ' + err);
	              res.render('500');
	            }
	            else{
	              res.render('pad', { id: padID, user: req.madpad_user.user, userRoom: '', pad: padObject, myPads: cookiePads });
	            }
	          })
	        }
	        else{ // pad already in DB
	          padObject.type = pad.codeType;
	          res.render('pad', { id: padID, user: req.madpad_user.user, userRoom: '', pad: padObject, myPads: cookiePads });        
	        }
	      }
	    });
	  };

	  // my pads information
	  var myPads = {};
	  var newPadName = 'code/' + padID;
	  if(userID){ // we are logged in
	    getUserPads(userID, newPadName, 'public', renderView);
	  }
	  else{ // we are not logged in
	    req.my_pads.pads = padCookie.sortAndAdd(req.my_pads.pads, newPadName, 'public');
	    myPads = padCookie.format(req.my_pads.pads);
	    renderView(myPads);
	  }
	  
	});

	// text pad
	app.get('/:id', function(req, res){
	  // attach sharejs server
	  sharejs.server.attach(app, options);

	  // get user info
	  var userInfo = getUserInfoFromCookie(req);
	  var userID = userInfo.id;
	  var username = userInfo.username;

	  // set up pad info
	  var padID = req.params.id;
	  var padObject = getPadObject(true, true, 'textpad', true);

	  var renderView = function(cookiePads){
	    res.render('pad', { id: padID, user: req.madpad_user.user, userRoom: '', pad: padObject, myPads: cookiePads });    
	  }

	  // my pads information
	  var myPads = {};
	  var newPadName = padID;
	  if(userID){ // we are logged in
	    getUserPads(userID, newPadName, 'public', renderView);
	  }
	  else{ // we are not logged in
	    req.my_pads.pads = padCookie.sortAndAdd(req.my_pads.pads, newPadName, 'public');
	    myPads = padCookie.format(req.my_pads.pads);
	    renderView(myPads);
	  }

	});


	// post to create a new pad
	app.post('/:username/:id', function(req, res, next){
	  if(req.params.username == 'channel') return next();
	  
	  // get user info
	  var userInfo = getUserInfoFromCookie(req);
	  var userID = userInfo.id;
	  var username = userInfo.username;

	  // get usersRoom
	  var userRoom = req.params.username;

	  // default set to textpad
	  var padID = req.params.id;
	  var padType = 'textpad'
	  if(req.body.pad.type == 'code'){
	    padType = 'text'
	  }

	  // change to lowercase
	  username = username.toLowerCase();
	  padID = padID.toLowerCase();

	  // always return json
	  res.contentType('json');

	  if(req.body.pad && typeof req.body.pad.ajax !== 'undefined' && req.body.pad.ajax !== 'true'){
	    res.send({});
	  }

	  if(username != userRoom){
	    res.send({ error: 'true', errorType: 'incorrect user'}); 
	  }

	  Pad.findOne({'name': username + '_' + padID}, function(err, pad){
	    if(err){
	      // TODO - add error logging here
	      console.log('Error: ' + err);
	      // render error page
	    }
	    else {
	      if(!pad){ // pad not in DB
	        var newPad = new Pad({
	          name: username + '_' + padID,
	          owner: userID,
	          writeAccess: false,
	          readAccess: false,
	          codeType: padType,
	          chatOn: false
	        })
	        newPad.save(function(err){
	          if(err){
	            // TODO - add error logging here
	            console.log('Error: ' + err);
	            // render error page
	          }
	          else{
	            res.send({success: 'true'});
	          }
	        });
	      }
	      else{ // pad already in DB
	        res.send({ error: 'true', errorType: 'existence'}); 
	      }
	    }
	  });  

	});

	// user name pads
	app.get('/:username/:id', function(req, res, next){
	  // edge case for channel url for sharejs
	  if(req.params.username == 'channel') return next();

	  // get user info
	  var userInfo = getUserInfoFromCookie(req);
	  var userID = userInfo.id;
	  var username = userInfo.username;

	  // get usersRoom
	  var userRoom = req.params.username;

	  // set up pad info
	  var padID = req.params.id;
	  var padObject = getPadObject(true, true, 'textpad', true);
	  var padName = userRoom + '_' + padID;


	  Pad.findOne({'name': padName}, function(err, pad){
	    if(err){
	      console.log(err);
	    } 
	    else{
	      if(!pad){
	        // we are logged in as the user in the url
	        if(username == userRoom){
	          res.render('createpad');
	        }
	        // we are a not the correct user
	        else{
	          res.render('403');
	        }
	      }
	      else{
	        // we arent the correct user and we are not allowed readAccess
	        if(!pad.readAccess && pad.owner != userID){
	          res.render('403');
	        }
	        else{ // we have readAccess
	          
	          // more set up on pad info          
	          padObject.writeAccess = pad.writeAccess;
	          padObject.readAccess = pad.readAccess;
	          padObject.chat = pad.chatOn;
	          if(typeof pad.codeType !== 'undefined' && pad.codeType != 'textpad'){
	            padObject.isTextPad = false;
	            padObject.type = pad.codeType;
	          }

	          var renderView = function(cookiePads){
	            // attach sharejs server
	            sharejs.server.attach(app, options);
	            res.render('pad', { id: padID, user: req.madpad_user.user, usersRoom: userRoom, pad: padObject, myPads: cookiePads });  
	          }

	          // my pads information
	          var myPads = {};
	          var padType = 'shared'
	          var newPadName = userRoom + '/' + padID;
	          if(userID){ // we are logged in
	            if(username == userRoom) padType = 'private'
	            getUserPads(userID, newPadName, padType, renderView);
	          }
	          else{ // we are not logged in
	            req.my_pads.pads = padCookie.sortAndAdd(req.my_pads.pads, newPadName, padType);
	            myPads = padCookie.format(req.my_pads.pads);
	            renderView(myPads);
	          }

	        }        
	      }
	    }
	  })

	});

}

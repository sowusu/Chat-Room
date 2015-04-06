// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");
	path = require('path'),
	mime = require('mime'); 
	url = require('url');
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
 	var filename = path.join(__dirname, "mod6_files", url.parse(req.url).pathname);

	(fs.exists || path.exists)(filename, function(exists){
		if (exists){
                        fs.readFile(filename, function(err, data){
                                if (err){
                                        //File exists but is not readable
                                        resp.writeHead(500, {
                                                "Content-Type": "text/plain"
                                        });
                                        resp.write("Internal server error: could not read file");
                                        resp.end();
                                        return;
                                }

                                //File exists and is readable
                                var mimetype = mime.lookup(filename);
                                resp.writeHead(200, {
                                        "Content-Type": mimetype
                                });
                                resp.write(data);
                                resp.end();
                                return;
                        });
                }
                else{
                        //File does not exist
                        resp.writeHead(404, {
                                "Content-Type": "text/plain"
                        });
                        resp.write("Requested file not found: " + filename);
                        resp.end();
                        return;
                }	



	});
});
app.listen(3456);




var loggedUsers = ["Guest"];
var friends = [[]];
var ignored = [[]];
var guestNumber = 0;
var rooms = ["General"];
var roomPasswords = [""];
var roomSockets = [[]];
var roomUsers = [[]];
var bannedUsers = [[]];
var roomCreators = ["Guest"];

function getId(name, the_array){
	
	for (var i = 0; i < the_array.length; i++){
		if (the_array[i] === name){
			return i;
		}
	}
	return -1;
}

 
// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

//	connectedUsers.push(socket);
 
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		var fromUser = data['nickname']; 
		console.log("message: "+data["message"]); // log it to the Node.JS output
		for(var i = 0; i < rooms.length; i++){
			if(rooms[i] == data['toRoom']){
				console.log("to users: "+roomUsers); // log it to the Node.JS output
				for(var j = 0; j < roomUsers[i].length; j++){
					var ignoring = false;
					for(var k = 0; k < ignored.length; k++){
						console.log("user: " + loggedUsers[k] + " ignores " + ignored[k]);
						if(roomUsers[i][j] == loggedUsers[k]){
							for(var l = 0; l < ignored[k].length; l++){
								if(fromUser==ignored[k][l]){
									ignoring = true;
								}
							}
						}
					}
					if(!ignoring){
						roomSockets[i][j].emit("message_to_client",{message:data["message"], from:fromUser }) // broadcast the message to other users
					}
				}
			}
		}
	});


	socket.on('private_message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		var fromUser = data['nickname']; 
		console.log("PMmessage: "+data["message"]); // log it to the Node.JS output
		console.log("to user: "+data['toUser']); // log it to the Node.JS output
		for(var i = 0; i < rooms.length; i++){
			if(rooms[i] == data['toRoom']){
				for(var j = 0; j < roomUsers[i].length; j++){
					var ignoring = false;
					for(var k = 0; k < ignored.length; k++){
						if(roomUsers[i][j] == loggedUsers[k]){
							for(var l = 0; l < ignored[k].length; l++){
								if(fromUser==ignored[k][l]){
									ignoring = true;
								}
							}
						}
					}
					if(roomUsers[i][j] == data['toUser'] && !ignoring){
						roomSockets[i][j].emit("message_to_client",{message:data["message"], from:fromUser }) // broadcast the message to other users
					}
				}
			}
		}
	});

	socket.on('friend_message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		var fromUser = data['nickname']; 
		console.log("PMmessage: "+data["message"]); // log it to the Node.JS output
		console.log("to user: "+data['toUser']); // log it to the Node.JS output
		for(var i = 0; i < rooms.length; i++){
			for(var j = 0; j < roomUsers[i].length; j++){
				var ignoring = false;
				for(var k = 0; k < ignored.length; k++){
					if(roomUsers[i][j] == loggedUsers[k]){
						for(var l = 0; l < ignored[k].length; l++){
							if(fromUser==ignored[k][l]){
								ignoring = true;
							}
						}
					}
				}
				if(roomUsers[i][j] == data['toUser'] && !ignoring){
					roomSockets[i][j].emit("message_to_client",{message:data["message"], from:fromUser }) // broadcast the message to other users
				}
			}
		}
	});

	socket.on('get_rooms_on_server', function(data) {
		io.sockets.emit("return_rooms_to_client",{allRooms:rooms, index:rooms.length }) // broadcast the message to other users
	});


	socket.on("add_room_on_server", function(data){
		var exists = false;
		for(var i = 0; i < rooms.length; i++){
			if(rooms[i]==data['roomName']){
				exists = true;
			}
		}
		if(!exists){
			rooms.push(data["roomName"]);
			roomPasswords.push(data["roomPass"]);
			roomUsers.push([]);
			bannedUsers.push([]);
			roomCreators.push(data["creator"]);
			roomSockets.push([]);
		}
	});

	socket.on('ban_user_on_server', function(data) {
		var userSocket;
		for(var i = 0; i < roomUsers.length; i++){
			for(var j = 0; j < roomUsers[i].length; j++){
				if(data['bannedUser']==roomUsers[i][j]){
					bannedUsers[i].push(roomUsers[i][j]);
					userSocket = roomSockets[i][j];
				}
			}
		}
		kickUser(data,userSocket);
	});

	socket.on('kick_user_on_server', function(data) {
		var userSocket;
		for(var i = 0; i < roomUsers.length; i++){
			for(var j = 0; j < roomUsers[i].length; j++){
				if(data['kickedUser']==roomUsers[i][j]){
					userSocket = roomSockets[i][j];
				}
			}
		}
		kickUser(data,userSocket);
	});

	socket.on('friend_user_on_server', function(data) {
		for(var i = 0; i < loggedUsers.length; i++)
		{
			if(loggedUsers[i] == data["nickname"])
			{
				var alreadyThere = false;
				for(var j = 0; j < friends[i].length; j++)
				{
					if(friends[i][j] == data["friend"])
					{
						alreadyThere = true;
						friends[i].splice(j,1);
					}
				}
				if(!alreadyThere){
					friends[i].push(data["friend"]);
				}
				socket.emit("return_friends_to_client", {friends:friends[i], numFriends:friends[i].length});
			}
		}
	});

	socket.on('ignore_user_on_server', function(data) {
		for(var i = 0; i < loggedUsers.length; i++)
		{
			if(loggedUsers[i] == data["nickname"])
			{
				var alreadyThere = false;
				for(var j = 0; j < ignored[i].length; j++)
				{
					if(ignored[i][j] == data["ignore"])
					{
						alreadyThere = true;
						ignored[i].splice(j,1);
					}
				}
				if(!alreadyThere){
					ignored[i].push(data["ignore"]);
				}
			}
		}
	});

	socket.on('nickname_to_server', function(data) {
		var isValid = true;
		removeUser(data, socket);
		if(data["nickname"].length >= 5 && data["nickname"].substring(0, 5) == "Guest"){
			isValid = false;
		}
		else{
			for(var i = 0; i < loggedUsers.length; i++)
			{
				if(loggedUsers[i] == data["nickname"])
				{
				isValid = false;
					break;
				}
			}
		}
		var name = data["nickname"];
		if(isValid){
		}
		else{
			guestNumber++;
			name = "Guest"+guestNumber;
		}
		loggedUsers.push(name);
		friends.push([[]]);
		ignored.push([[]]);
		var room = data['room'];
		var otherUsers;
		for(var i = 0; i < rooms.length; i++){
			if(rooms[i]==data['room']){
				socketBanned = false;
				console.log("BANNED: " + bannedUsers[i]);
				for(var j = 0; j < bannedUsers[i].length; j++){
					if(bannedUsers[i][j] === name){
						socketBanned = true;
					}
				}
				if((roomPasswords[i] != "" && roomPasswords[i] != data['password']) || socketBanned){
					roomSockets[0].push(socket);
					roomUsers[0].push(name);
					otherUsers = roomUsers[0];
					roomMaker = roomCreators[0];
					room = "General";
				}
				else{
					roomSockets[i].push(socket);
					roomUsers[i].push(name);
					otherUsers = roomUsers[i];
					roomMaker = roomCreators[i];
				}
			}
		}
		socket.emit("validate_nickname_to_client", {nickname:name, inRoom:room, users:otherUsers, creator:roomMaker});
		for(var i = 0; i < roomSockets.length; i++){
			for(var j = 0; j < roomSockets[i].length; j++){
				roomSockets[i][j].emit("new_user_joined", {users:roomUsers[i]});
			}
		}
	});
});

function removeUser(data, socket){
	for(var i = 0; i < rooms.length; i++){
		if(rooms[i]==data['crntRoom']){
			for(var j = 0; j < roomUsers[i].length; j++){
				if(roomUsers[i][j] == data['crntUser']){
					roomUsers[i].splice(j, 1);
					roomSockets[i].splice(j, 1);
				}
			}
		}
	}
	for(var i = 0; i < loggedUsers.length; i++){
		if(loggedUsers[i] == data['crntUser']){
			loggedUsers.splice(i,1);
			friends.splice(i,1);
			ignored.splice(i,1);
		}
	}
}

function kickUser(data, socket){
	for(var i = 0; i < rooms.length; i++){
		if(rooms[i]==data['crntRoom']){
			for(var j = 0; j < roomUsers[i].length; j++){
				if(roomUsers[i][j] == data['kickedUser']){
					roomUsers[i].splice(j, 1);
					roomSockets[i].splice(j, 1);
				}
			}
		}
	}
	for(var i = 0; i < loggedUsers.length; i++){
		if(loggedUsers[i] == data['kickedUser']){
			loggedUsers.splice(i,1);
		}
	}
	var name = data['kickedUser'];
	roomSockets[0].push(socket);
	roomUsers[0].push(name);
	var otherUsers = roomUsers[0];
	var roomMaker = roomCreators[0];
	room = "General";
	socket.emit("validate_nickname_to_client", {nickname:name, inRoom:room, users:otherUsers, creator:roomMaker});
}

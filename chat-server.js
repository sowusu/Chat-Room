// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");
 
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
 
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
 
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);




var loggedUsers = ["Guest"];
var guestNumber = 0;
var rooms = ["General"];
var roomPasswords = [""];
var roomSockets = [[]];
var roomUsers = [[]];
var bannedUsers = [[]];
var roomCreators = ["devs"];

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
					roomSockets[i][j].emit("message_to_client",{message:data["message"], from:fromUser }) // broadcast the message to other users
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
					if(roomUsers[i][j] == data['toUser']){
						roomSockets[i][j].emit("message_to_client",{message:data["message"], from:fromUser }) // broadcast the message to other users
					}
				}
			}
		}
	});

	socket.on('get_rooms_on_server', function(data) {
		io.sockets.emit("return_rooms_to_client",{allRooms:rooms, index:rooms.length }) // broadcast the message to other users
	});


	socket.on("add_room_on_server", function(data){
		rooms.push(data["roomName"]);
		roomPasswords.push(data["roomPass"]);
		roomUsers.push([]);
		roomCreators.push(data["creator"]);
		roomSockets.push([]);
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
			loggedUsers.push(data["nickname"]);
		}
		else{
			guestNumber++;
			name = "Guest"+guestNumber;
		}
		var room = data['room'];
		var otherUsers;
		for(var i = 0; i < rooms.length; i++){
			if(rooms[i]==data['room']){
				if(roomPasswords[i] != "" && roomPasswords[i] != data['password']){
					roomSockets[0].push(socket);
					roomUsers[0].push(name);
					otherUsers = roomUsers[0];
					room = "General";
				}
				else{
					roomSockets[i].push(socket);
					roomUsers[i].push(name);
					otherUsers = roomUsers[i];
				}
			}
		}
		socket.emit("validate_nickname_to_client", {nickname:name, inRoom:room, users:otherUsers});
		for(var i = 0; i < roomSockets.length; i++){
			for(var j = 0; j < roomSockets[i].length; i++){
				roomSockets[i][j].emit("new_user_joined", {users:otherUsers});
			}
		}
	});
});

function removeUser(data, socket){
	console.log("crntroom: "+data['crntRoom']); // log it to the Node.JS output
	console.log("crntuser: "+data['crntUser']); // log it to the Node.JS output
	for(var i = 0; i < rooms.length; i++){
		if(rooms[i]==data['crntRoom']){
			console.log("ROOM USERS: "+roomUsers); // log it to the Node.JS output
			for(var j = 0; j < roomUsers[i].length; j++){
				if(roomUsers[i][j] == data['crntUser']){
					console.log("crntroomasjkdhkja: "+roomUsers[i]); // log it to the Node.JS output
					roomUsers[i].splice(j, 1);
					roomSockets[i].splice(j, 1);
					console.log("AHJSJDKHJcrntroomasjkdhkja: "+roomUsers[i]); // log it to the Node.JS output
				}
			}
		}
	}
	for(var i = 0; i < loggedUsers.length; i++){
		if(loggedUsers[i] == data['crntUser']){
			loggedUsers.splice(i,1);
		}
	}
}



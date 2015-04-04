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


 
// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.

//	connectedUsers.push(socket);
 
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
 
		console.log("message: "+data["message"]); // log it to the Node.JS output
		io.sockets.emit("message_to_client",{message:data["message"] }) // broadcast the message to other users
	});

	socket.on('nickname_to_server', function(data) {
		var isValid = true;
		if(data["nickname"].length >= 5 && data["nickname"].substring(0, 6) == "Guest"){
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
		if(isValid){
			loggedUsers.push(data["nickname"]);
			socket.emit("validate_nickname_to_client", {nickname:data["nickname"]});
		}
		else{
			guestNumber++;
			socket.emit("validate_nickname_to_client", {nickname:"Guest" + guestNumber});
		}
	});
});





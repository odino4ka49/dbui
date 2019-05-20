var WebSocketServer = require('websocket').server;
var http = require('http');
const dbtree = require("./dbtree")

var clients = [];

var server = http.createServer(function (request, response) {
    // process HTTP request. Since we're writing just WebSockets
    // server we don't have to implement anything.
});
server.listen(1337, function () { });

wsServer = new WebSocketServer({
    httpServer: server
});

// WebSocket server
wsServer.on('request', function (request) {
    var connection = request.accept(null, request.origin);
    var index = clients.push(connection) - 1;

    wsServer.sendTree(dbtree.systems)
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            // process WebSocket message
        }
    });

    connection.on('close', function (connection) {
        clients.splice(index, 1);

        // close user connection
    });
});

wsServer.sendTree = function(data){
    for (var i=0; i < clients.length; i++) {
        clients[i].sendUTF(JSON.stringify(data));
    }
};

wsServer.sendTree(dbtree.systems)
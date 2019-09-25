var WebSocketServer = require('websocket').server;
var http = require('http');
const model = require("./model")

var clients = [];
var order = 0;
var orders = new Map();

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

    connection.sendUTF(JSON.stringify(model.systems));
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function (msg) {
        if(msg.type=="utf8"){
            var message = JSON.parse(msg.utf8Data);
            console.log(message);
            switch(message.type) {
                case 'channel_data':
                    orders.set(order,index);
                    model.getChannelData(message.datatable,message.channel,message.datetime,order);
                    order++;
                    break;
            }
        }
    });

    connection.on('close', function (connection) {
        clients.splice(index, 1);

        // close user connection
    });
});

wsServer.sendData = function(data,ordernum,end){
    var index = orders.get(ordernum);
    clients[index].sendUTF(JSON.stringify(data));
    if(end){
        removeOrder(ordernum);
    }
}

wsServer.broadcast = function(data){
    for (var i=0; i < clients.length; i++) {
        clients[i].sendUTF(JSON.stringify(data));
    }
};

function removeOrder(ordernum){
    orders.delete(ordernum);
}

function sendData(data,ordernum){
    wsServer.sendData(data,ordernum);
}


module.exports = {
    sendData: sendData
}
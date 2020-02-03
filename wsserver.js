var WebSocketServer = require('websocket').server;
var http = require('http');
const model = require("./model");
var dbconnection = require("./dbconnection")

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

    console.log("connection is set with: "+connection.remoteAddress)
    connection.sendUTF(JSON.stringify({
        title: "databases",
        data: model.getDatabasesInfo()
    }));
    connection.on('message', function (msg) {
        if(msg.type=="utf8"){
            var message = JSON.parse(msg.utf8Data);
            switch(message.type) {
                case 'channel_data':
                    orders.set(order,connection);
                    model.getChannelData(message.chart,message.pixels,message.dbid,message.datatable,message.hierarchy,message.datetime,order);
                    order++;
                    break;
                case 'tree_data':
                    orders.set(order,connection);
                    model.loadTreeData(message.database,order);
                    order++;
                    break;
            }
            console.log("got message "+message.type+" from: "+connection.remoteAddress)
        }
    });

    connection.on('close', function (connection) {
        console.log("connection is closed with: "+connection.remoteAddress)
        clients.splice(index, 1);
    });
});

wsServer.sendData = function(data,ordernum,end){
    var connection = orders.get(ordernum);
    console.log("try to send data to: "+connection.remoteAddress)
    connection.sendUTF(JSON.stringify(data));
    if(end){
        removeOrder(ordernum);
    }
}

wsServer.sendError = function(err,ordernum){
    var connection = orders.get(ordernum);
    err.text = err.stack;
    console.log("try to send error to: "+connection.remoteAddress)
    connection.sendUTF(JSON.stringify({
        "title": "error",
        "data": err
    }));
    removeOrder(ordernum);
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
var WebSocketServer = require('websocket').server;
var http = require('http');
const model = require("./dbqueue");
var dbconnection = require("./dbconnection")

//список клиентов
var clients = [];
//счетчик запросов от клиентов
var order = 0;
//список запросов от клиентов
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

    console.log("connection is set with: "+connection)
    connection.sendUTF(JSON.stringify({
        title: "databases",
        data: model.getDatabasesInfo()
    }));
    connection.on('message', function (msg) {
        if(msg.type=="utf8"){
            var message = JSON.parse(msg.utf8Data);
            switch(message.type) { 
                //depending on the msgtype we decide what to do
                case 'channel_data':
                    connection.ordernum = message.ordernum;
                    orders.set(order,connection);
                    model.getChannelData(message.chart,message.pixels,message.dbid,message.datatable,message.hierarchy,message.datetime,message.mode,message.ordernum,order);
                    order++;
                    break;
                case 'get_full_channel_data':
                    connection.ordernum = message.ordernum;
                    orders.set(order,connection);
                    model.getFullChannelData(message.dbid,message.datatable,message.hierarchy,message.datetime,message.ordernum,order);
                    order++;
                    break;
                case 'tree_data':
                    orders.set(order,connection);
                    model.loadTreeData(message.database,order);
                    order++;
                    break;
                case 'v3v4chan_orbits_start_data':
                    orders.set(order,connection);
                    model.loadV3V4ChanOrbitsStartData(message.system,order);
                    order++;
                    break;
                case 'v3v4chan_orbits_data':
                    orders.set(order,connection);
                    console.log("datetime"+message.datetime)
                    model.loadV3V4ChanDatetimeData(message.system,message.datetime,order);
                    order++;
                    break;
                case 'cancel_orders':
                    wsServer.cancelOrders(message.orders);
                    break;
            }
            console.log("got message "+message.type+" from: "+connection.remoteAddress)
        }
    });

    connection.on('close', function (code) {
        console.log("connection is closed with: "+code)
        for (var k of orders.keys()) {
            if ((orders.get(k).remoteAddress==clients[index].remoteAddress))
                orders.delete(k);
        }
        clients.splice(index, 1);
    });
});

wsServer.cancelOrders = function(orders_to_cancel){
    for (var k of orders.keys()) {
        if (orders_to_cancel.includes(orders.get(k).ordernum))
            orders.delete(k);
    }
}

wsServer.isOrderExist = function(ordernum){
    return orders.has(ordernum);
}

wsServer.sendData = function(data,ordernum,end){
    if(!this.isOrderExist(ordernum)) return;
    var connection = orders.get(ordernum);
    console.log("try to send data to: "+connection.remoteAddress)
    connection.sendUTF(JSON.stringify(data));
    if(end){
        removeOrder(ordernum);
    }
}

wsServer.sendError = function(err,ordernum,clientordernum){
    var connection = orders.get(ordernum);
    if (!err.text) err.text = "Error: "+err+". Please let us know about the incident: khudayb@inp.nsk.su";
    console.log(err,clientordernum)
    connection.sendUTF(JSON.stringify({
        "title": "error",
        "data": err,
        "clientordernum": clientordernum
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
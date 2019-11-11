const dbc = require('./dbconnection')
const tm = require('./model_classes')

var databases = new Map();

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000));
    return this;
}

function parseToChartData(channel,data){
    var result = [];
    data.forEach(element => {
        result.push([parseInt(element["t"]),element[channel]]);
    });
    return result;
}

function checkIfError(result,order){
    if(result.name == 'error'){
        wsServer.sendError(result.stack,order);
        return true;
    }
    return false;
}

function loadTreeData(dbid,order){
    var tree = new tm.SystemTree(dbid);
    var db = databases.get(dbid);
    if(db.type == 'v4'){
        db.sendRequest('SELECT * FROM "01_system"',order,function(result){
            tree.parseSystems(result);
            db.sendRequest('SELECT * FROM "02_group"',order,function(result){
                tree.parseGroups(result);
                db.sendRequest('SELECT * FROM "03_chan"',order,function(result){
                    tree.parseChannels(result);
                    wsServer.sendData({
                        "title": "tree_data",
                        "database": dbid,
                        "data": tree.systems
                    },order,true);
                })
            })
        })
    }
    else if(db.type == 'pickups'){
        db.sendRequest('SELECT * FROM "01_system"',order,function(result){
            tree.parseSystems(result);
            db.sendRequest('SELECT * FROM "02_chan"',order,function(result){
                tree.parseChannels(result);
                wsServer.sendData({
                    "title": "tree_data",
                    "database": dbid,
                    "data": tree.systems
                },order,true);
            })
        })
    }
}

function getChannelData(chart,dbid,datatable,channel,datetime,order){
    var datatype = channel.datatype==null ? '' : '::'+channel.datatype;
    var db = databases.get(dbid);
    var date1 = new Date(datetime[0]);
    var date2 = new Date(datetime[1]);
    var hours = Math.abs(date1 - date2) / 36e5;
    var parts = Math.ceil(hours/12.0);
    var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
    for(var i=0;i<parts;i++){
        if(i==parts-1){
            dates.push(date2.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
        else{
            dates.push(date1.addHours(12).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
    }
    loadChannelData(chart,db,datatable,channel,dates,order,datatype,0);
}

function loadChannelData(chart,db,datatable,channel,dates,order,datatype,i){
    var parts = dates.length-1;
    try{
        db.sendRequest('select extract(epoch from date_time)*1000::integer as t,"'+channel.name+'"'+datatype+' from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
        ,order,function(result){
            if(result.type=="err"){
                console.log("problema")
            }
            else{
                var channel_data = {
                    "title": "channel_data",
                    "name": channel.name,
                    "data": parseToChartData(channel.name, result),
                    "units": channel.unit,
                    "index": i,
                    "chart": chart
                }
                if(i==parts-1){
                    wsServer.sendData(channel_data,order,true);
                }
                else{
                    wsServer.sendData(channel_data,order,false);
                    loadChannelData(chart,db,datatable,channel,dates,order,datatype,i+1)
                }
            }
        });
    }
    catch(e){
        console.log(e);
    }
}

function getSensors(magnet_name){
    var sensors = systems.find(o => o.name === "Temperature").findAll(magnet_name)
    return sensors
}

function initDatabases(){
    for(var i=1;i<6;i++){
        var db = new dbc.DBConnection("db"+i);
        databases.set(db.id,db);
    }
}

function getDatabasesInfo(){
    var result = [];
    databases.forEach(function(db){
        result.push({
            id: db.id,
            name: db.name,
            status: db.status
        })
    });
    return result;
}

initDatabases();

module.exports = {
    loadTreeData: loadTreeData,
    getSensors: getSensors,
    getChannelData: getChannelData,
    getDatabasesInfo: getDatabasesInfo
}
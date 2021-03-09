const dbc = require('./dbconnection')
const tm = require('./model_classes')

var databases = new Map();
console.log(dbc.dbs);

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000));
    return this;
}

function parseToChartData(channel,data){
    var x = [];
    var y = [];
    data.forEach(element => {
        var date = new Date();
        date.setTime(element["t"]);
        //console.log(date.toLocaleString())
        //result.push([parseInt(element["t"]),element[channel]]);
        x.push(date),
        y.push(element[channel])
    });
    console.log(x[0])
    return {x: x,y: y};
}

function parseToOrbitData(channel,data,azimuths){
    var values = data[0][channel]
    var result = []
    for(var i=0;i<azimuths.length;i++){
        result.push([azimuths[i].azimuth,values[i]]);
    }
    return result;
}

function checkIfError(result,order){
    if(result.name == 'error'){
        wsServer.sendError(result,order);
        return true;
    }
    return false;
}

function loadTreeData(dbid,order){
    console.log("loadTreeData");
    var tree = new tm.SystemTree(dbid);
    var db = databases.get(dbid);
    if(db.type == 'v4'){
        db.sendRequest('SELECT * FROM "01_system"',order,function(result){
            tree.parseSystems(result);
            console.log(result);
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
            tree.setOneDatatable("03_v4pkpmea");
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

function loadAzimuths(db){
    db.sendRequest('SELECT * FROM "04_azimuth"',null,function(result){
        db.setAzimuths(result);
    });
}

function averageData(data,y){
    if(!data || data.length==0){
        return [];
    }
    var min = data[0];
    var max = data[0];
    //console.log(data)
    for (var i=0;i<data.length;i++){
        if(min[y]>data[i][y]) min = data[i];
        if(max[y]<data[i][y]) max = data[i];
    }
    if(min[y]==max[y]) min = data[0];
    var result = min.t>max.t? [max,min] : [min,max]
    return(result)
}

function filterData(data,pixels,chname){
    var partsize = data.length/pixels;
    var result = [];
    for (var i=0;i<pixels;i++){
        result = result.concat(averageData(data.slice(i*partsize,(i+1)*partsize-1),chname));
    }
    return(result);
}

function getChannelData(chart,pixels,dbid,datatable,hierarchy,datetime,mode,order){
    var channel = hierarchy.channel;
    var datatype = channel.datatype==null ? '' : '::'+channel.datatype;
    var db = databases.get(dbid);
    var subsystem = null;
    var date1 = new Date(datetime[0]);
    var date2 = new Date(datetime[1]);
    var hours = Math.abs(date1 - date2) / 36e5;
    var parts = Math.ceil(hours/12.0);
    var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
    if(datatable == "v4cod,v4-new"){
        if(channel.name.endsWith("set")){
            datatable = "v4cod";
        }
        else{
            datatable = "v4-new";
        }
    }
    for(var i=0;i<parts;i++){
        if(i==parts-1){
            dates.push(date2.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
        else{
            dates.push(date1.addHours(12).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
    }
    if(db.type == "pickups"){
        if("subsystem" in hierarchy){
            subsystem = hierarchy.subsystem
        }
        else{
            loadOrbitData(chart,db,datatable,channel,null,order);
            return;
        }
    }
    loadChannelData(chart,pixels/parts,db,datatable,channel,subsystem,dates,order,datatype,mode,0);
}

function loadOrbitData(chart,db,datatable,channel,date,mode,order){
    console.log("loadOrbitData");
    var req = 'select date_time,"'+channel.name+'"'+' from "'+datatable+'" ORDER BY date_time DESC LIMIT 1;'
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                console.log(result)
            }
            else{
                var channel_data = {
                    "title": "orbit_data",
                    "name": channel.name,
                    "data": parseToOrbitData(channel.name,result,db.getAzimuths()),
                    "units": "mm",
                    "chart": chart,
                    "mode": mode,
                    "dbid": db.id
                }
                wsServer.sendData(channel_data,order,true);
            }
        });
    }
    catch(e){
        console.log(e);
    }
}

function loadChannelData(chart,pixels,db,datatable,channel,subsystem,dates,order,datatype,mode,i){
    //console.log("loadChannelData part "+i);
    var parts = dates.length-1;
    var req;
    var chan_name = channel.name;
    if(subsystem){
        chan_name = subsystem.name+": "+chan_name;
        req = 'select extract(epoch from date_time)*1000::integer as t,"'+channel.name+'"['+subsystem.id+']'+datatype+' as"'+chan_name+'" from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
    }
    else{
        req = 'select extract(epoch from date_time)*1000::integer as t,"'+channel.name+'"'+datatype+' from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
    }
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                console.log("problema")
                wsServer.sendError(result,order)
            }
            else{
                var filtered_data = [];
                /*if(result.length==0){
                    wsServer.sendError({"text":"There is no data on this period"},order)
                }*/
                filtered_data = filterData(result,pixels,chan_name);
                var channel_data = {
                    "title": "channel_data",
                    "name": chan_name,
                    "data": parseToChartData(chan_name, filtered_data),
                    "units": channel.unit,
                    "index": i,
                    "chart": chart,
                    "mode": mode,
                    "dbid": db.id
                }
                if(i==parts-1){
                    wsServer.sendData(channel_data,order,true);
                }
                else{
                    wsServer.sendData(channel_data,order,false);
                    loadChannelData(chart,pixels,db,datatable,channel,subsystem,dates,order,datatype,mode,i+1)
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
        if(db.type=="pickups"){
            loadAzimuths(db);
        }
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
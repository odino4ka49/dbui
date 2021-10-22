const dbc = require('./dbconnection')
const tm = require('./dbstructure')

var databases = new Map();
//console.log(dbc.dbs);

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
        //result.push([parseInt(element["t"]),element[channel]]);
        x.push(date),
        y.push(element[channel])
    });
    return {x: x,y: y};
}

function parseToOrbitData(channel,data,azimuths){
    var x = [];
    var y = [];
    data[0][channel].forEach((element,i) => {
        x.push( azimuths[i].azimuth),
        y.push(element)
    });
    return {x: x,y: y};
}

/*function parseToOrbitData(channel,data,azimuths){
    var values = data[0][channel]
    var result = []
    for(var i=0;i<azimuths.length;i++){
        result.push([azimuths[i].azimuth,values[i]]);
    }
    return result;
}*/

function checkIfError(result,order){
    if(result.name == 'error'){
        wsServer.sendError(result,order);
        return true;
    }
    return false;
}

//загрузка начальных данных для списка орбит v3v4chan или v4
function loadV3V4ChanOrbitsStartData(system,order){
    var db = databases.get("db1");
    if(system=="v4"){
        db.sendRequest('select "03_chan".id,name,fullname from "03_chan" join "01_system" on "01_system".id = "03_chan".ss_id where "01_system".system = \'orbits v4\'',order,function(result){
            wsServer.sendData({
                "title": "v4orbits_start_data",
                "data": result
            },order,false);
            loadV3V4ChanPkpPosData(system,order);
        })
    }
    else{
        loadV3V4ChanPkpPosData(system,order);
    }
}

//загрузка азимутов для орбит v3v4chan или v4
function loadV3V4ChanPkpPosData(system,order){
    var db = databases.get("db1");
    var systemname = (system=="v3v4") ? "orbits v3v4chan" : "orbits v4" 
    db.sendRequest('select pkp_name,azimuth from "04_pkp_position" join "01_system" on "01_system".sys_id = "04_pkp_position".sys_id where "01_system".system = \''+systemname+'\'',order,function(result){
        wsServer.sendData({
            "title": "v3v4chan_pkppos_data",
            "system": system,
            "data": result//result.map(x => x.azimuth)
        },order,false);
        loadFirstRecortTime(system,order)
        //loadV3V4ChanLastDatetimeData(system,order);
    })
}

//загрузка времени последней записи
function loadFirstRecortTime(system,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(
            'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".name FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id order by "14_orb_v3v4chan".date_time asc limit 1;',order,function(result){
                //console.log(result);
                wsServer.sendData({
                    "title": "v3v4_firstrecord",
                    "system": system,
                    "data": result[0].t
                },order,false);
                //var date1 = new Date(result[0].t-86400000);
                //var date2 = new Date(result[0].t);
                //var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, ''),date2.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
                loadV3V4ChanLastDatetimeData(system,order);
            })
    }
    else if(system=="v4"){
        db.sendRequest(
            'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t FROM "15_orb_v4" order by "15_orb_v4".date_time asc limit 1;',order,function(result){
                //console.log(result);
                wsServer.sendData({
                    "title": "v3v4_firstrecord",
                    "system": system,
                    "data": result[0].t
                },order,false);
                //var date1 = new Date(result[0].t-86400000);
                //var date2 = new Date(result[0].t);
                //var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, ''),date2.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
                loadV3V4ChanLastDatetimeData(system,order);
            })
    }
}

//загрузка табличных данных (время и имя канала) для орбит v3v4chan или v4 за последние доступные сутки
function loadV3V4ChanDatetimeData(system,datetime,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(
            'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".fullname,"03_chan".unit,"03_chan".name,"14_orb_v3v4chan".value FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id and "14_orb_v3v4chan".date_time >=\''+datetime[0]+'\' and "14_orb_v3v4chan".date_time <= \''+datetime[1]+'\' order by "14_orb_v3v4chan".date_time desc;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4chan_orbits_data",
                    "last": false,
                    "data": result
                },order,true);
            })
    }
    else if(system=="v4"){
        db.sendRequest(
            'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t,* FROM "15_orb_v4" where "15_orb_v4".date_time >=\''+datetime[0]+'\' and "15_orb_v4".date_time <= \''+datetime[1]+'\' order by "15_orb_v4".date_time desc;',order,function(result){
                wsServer.sendData({
                    "title": "v4_orbits_data",
                    "last": false,
                    "data": result
                },order,true);
            })
    }

}


//загрузка табличных данных (время и имя канала) для орбит v3v4chan или v4
function loadV3V4ChanLastDatetimeData(system,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(
            //'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".fullname,"03_chan".unit,"03_chan".name,"14_orb_v3v4chan".value FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id and "14_orb_v3v4chan".date_time >=\''+datetime[0]+'\' and "14_orb_v3v4chan".date_time <= \''+datetime[1]+'\' order by "14_orb_v3v4chan".date_time desc;',order,function(result){
            'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".fullname,"03_chan".unit,"03_chan".name,"14_orb_v3v4chan".value FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id and "14_orb_v3v4chan".date_time >= ((select date_time from "14_orb_v3v4chan" order by date_time desc limit 1) - \'1 day\'::interval) and "14_orb_v3v4chan".date_time <= (select date_time from "14_orb_v3v4chan" order by date_time desc limit 1) order by "14_orb_v3v4chan".date_time desc;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4chan_orbits_data",
                    "last": true,
                    "data": result
                },order,true);
            })
    }
    else if(system=="v4"){
        db.sendRequest(
            //'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t,* FROM "15_orb_v4" where "15_orb_v4".date_time >=\''+datetime[0]+'\' and "15_orb_v4".date_time <= \''+datetime[1]+'\' order by "15_orb_v4".date_time desc;',order,function(result){
            'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t,* FROM "15_orb_v4" where "15_orb_v4".date_time >=((select date_time from "15_orb_v4" order by date_time desc limit 1) - \'1 day\'::interval) and "15_orb_v4".date_time <= (select date_time from "15_orb_v4" order by date_time desc limit 1) order by "15_orb_v4".date_time desc;',order,function(result){
                wsServer.sendData({
                    "title": "v4_orbits_data",
                    "last": true,
                    "data": result
                },order,true);
            })
    }

}

//загрузка и парсинг данных о дереве БД
function loadTreeData(dbid,order){
    //console.log("loadTreeData");
    var tree = new tm.SystemTree(dbid);
    var db = databases.get(dbid);
    if(db.type == 'v4'){
        db.sendRequest('SELECT * FROM "01_system" order by sys_id,subsys_id',order,function(result){
            tree.parseSystems(result);
            db.sendRequest('SELECT * FROM "02_group" order by ss_id,group_id',order,function(result){
                tree.parseGroups(result);
                db.sendRequest('SELECT * FROM "03_chan" order by id',order,function(result){
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
        db.sendRequest('SELECT * FROM "01_system" order by id',order,function(result){
            tree.parseSystems(result);
            tree.setOneDatatable("03_v4pkpmea");
            db.sendRequest('SELECT * FROM "02_chan"',order,function(result){
                tree.parseChannels(result,db.type);
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

//усреднение данных
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

//фильтр данных - по точке на пиксель
function filterData(data,pixels,chname){
    var partsize = data.length/pixels;
    var result = [];
    for (var i=0;i<pixels;i++){
        result = result.concat(averageData(data.slice(i*partsize,(i+1)*partsize-1),chname));
    }
    return(result);
}

//we get all channel data for a particular period of time
function getChannelData(chart,pixels,dbid,datatable,hierarchy,datetime,mode,ordernum,order){
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
    if(db.type == "pickups" || ("system" in hierarchy && hierarchy.system.name=="pickups v4")){    
        if("subsystem" in hierarchy){
            subsystem = hierarchy.subsystem
        }
        else{
            loadOrbitData(chart,db,datatable,channel,null,mode,ordernum,order);
            return;
        }
    }
    loadChannelData(chart,pixels/parts,db,datatable,channel,subsystem,dates,ordernum,order,datatype,mode,0);
}

//we get all orbit data for a particular period of time
function loadOrbitData(chart,db,datatable,channel,date,mode,ordernum,order){
    var req = 'select date_time,"'+channel.name+'"'+' from "'+datatable+'" ORDER BY date_time DESC LIMIT 1;'
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                console.log("problem")
                wsServer.sendError(result,order)
            }
            else{
                var channel_data = {
                    "title": "orbit_data",
                    "name": channel.name,
                    "data": parseToOrbitData(channel.name,result,db.getAzimuths()),
                    "units": "mm",
                    "chart": chart,
                    "mode": mode,
                    "dbid": db.id,
                    "ordernum": ordernum
                }
                wsServer.sendData(channel_data,order,true);
            }
        },ordernum);
    }
    catch(e){
        console.log(e);
    }
}

//загрузка данных с канала определенного перидоа на определенное число пикселей
function loadChannelData(chart,pixels,db,datatable,channel,subsystem,dates,ordernum,order,datatype,mode,i){
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
                console.log("problem")
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
                    "fullname": chan_name,
                    "name": channel.name,
                    "data": parseToChartData(chan_name, filtered_data),
                    "units": channel.unit,
                    "index": i,
                    "chart": chart,
                    "mode": mode,
                    "dbid": db.id,
                    "ordernum": ordernum,
                    "parts": parts
                }
                if(i==parts-1){
                    wsServer.sendData(channel_data,order,true);
                }
                else{
                    wsServer.sendData(channel_data,order,false);
                    loadChannelData(chart,pixels,db,datatable,channel,subsystem,dates,ordernum,order,datatype,mode,i+1)
                }
            }
        },ordernum);
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
    loadV3V4ChanOrbitsStartData: loadV3V4ChanOrbitsStartData,
    loadV3V4ChanDatetimeData: loadV3V4ChanDatetimeData,
    getSensors: getSensors,
    getChannelData: getChannelData,
    getDatabasesInfo: getDatabasesInfo
}

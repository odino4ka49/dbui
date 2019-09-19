const dbc = require('./dbconnection')
const tm = require('./model_classes')
var TreeModel = require('tree-model')

var systems = []
var subsystems = []


function parseToChartData(channel,data){
    var result = [];
    data.forEach(element => {
        //result.dates.push(parseInt(element["t"]));
        result.push([parseInt(element["t"]),element[channel]]);
    });
    return result;
}

function findSS(ss_id){
    var res = systems.find(o => o.ss_id === ss_id);
    if(res){
        return res;
    }
    res = subsystems.find(o => o.ss_id === ss_id);
    if(res){
        return res;
    }
    return null;
}

function parseSystems(data) {
    var sys_ids = []
    var sys
    data.forEach(function(ss){
        if(sys_ids.includes(ss.sys_id)){
            sys = systems.find(o => o.id === ss.sys_id);
        }
        else{
            sys = new tm.System(ss.sys_id,ss.system);
            sys_ids.push(ss.sys_id);
            systems.push(sys);
        }
        if(ss.subsys_id){
            subsys = new tm.Subsystem(ss.subsys_id,ss.id,ss.subsystem,ss.data_tbl,ss.status);
            sys.appendSubsystem(subsys);
            subsystems.push(subsys)
        }
        else{
            sys.data_tbl = ss.data_tbl;
            sys.status = ss.status;
            sys.ss_id = ss.id; 
        }
    });
}

function parseGroups(data){
    data.forEach(function(gr){
        group = new tm.Group(gr.group_id,gr.name,gr.status);
        var ss = findSS(gr.ss_id);
        if(ss){
            ss.appendGroup(group);
        }
    })
}

function parseChannels(data){
    data.forEach(function(ch){
        channel = new tm.Channel(ch.name,ch.fullname,ch.address,ch._type,ch.unit,ch.divider,ch.status);
        var ss = findSS(ch.ss_id);
        if(ss&&ch.gr_id){
            group = ss.groups.find(o => o.id === ch.gr_id);
            group.appendChannel(channel);
        }
        else if(ss){
            ss.appendChannel(channel);
        }
    })
}


function loadSystems(){
    dbc.sendRequest('SELECT * FROM "01_system"',function(result){
        parseSystems(result);
        loadGroups();
    })
}

function loadGroups(){
    dbc.sendRequest('SELECT * FROM "02_group"',function(result){
        parseGroups(result);
        loadChannels();
    })
}

function loadChannels(){
    dbc.sendRequest('SELECT * FROM "03_chan"',function(result){
        parseChannels(result);
    })
}

function getChannelData(datatable,channel,datetime,order){
    var datatype = channel.datatype==null ? '' : '::'+channel.datatype;
    dbc.sendRequest('select extract(epoch from date_time)*1000::integer as t,"'+channel.name+'"'+datatype+' from "'+datatable+'" where date_time >=\''+datetime[0]+'\' and date_time <= \''+datetime[1]+'\' order by date_time asc;'
    ,function(result){
        console.log(channel);
        var channel_data = {
            "title": "channel_data",
            "name": channel.name,
            "data": parseToChartData(channel.name, result),
            "units": channel.unit
        }
        wsServer.sendData(channel_data,order);
        //wsServer.sendData(result);
    })
}

function getTestData(){
    //dbc.sendRequest('select extract(epoch from date_time),v4_current from "stap" where date_time >=\'2017-02-01 00:00:00\' and date_time <= \'2017-02-07 00:01:00\' order by date_time asc;'
    dbc.sendRequest('select extract(epoch from date_time)*1000::integer as t,"3M6F_SW"::float from "Tv3" where date_time >=\'2018-01-07 00:00:00\' and date_time <= \'2018-07-07 00:01:00\' order by date_time asc;'
    ,function(result){
        console.log("got db answer");
        //result.title = "channel_data"
        wsServer.sendData(result);
    })
}

function getSensors(magnet_name){
    var sensors = systems.find(o => o.name === "Temperature").findAll(magnet_name)
    return sensors
}

module.exports = {
    loadSystems: loadSystems,
    systems: systems,
    getSensors: getSensors,
    getTestData: getTestData,
    getChannelData: getChannelData
}
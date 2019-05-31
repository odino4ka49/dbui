const pg = require('pg')
const tm = require('./treemodel')

var systems = []
var subsystems = []
var systemtree = []

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

function parseSystemsTree(data){
    var sys_ids = []
    data.forEach(function(ss){
        if(!sys_ids.includes(ss.sys_id)){
            sys = { "id": "ss"+ss.id, "parent": "#", "text": ss.system};
            sys_ids.push(ss.sys_id);
            systemtree.push(sys);
        }
        if(ss.subsys_id){
            sys.id = "sys"+ss.sys_id
            subsys = { "id": "ss"+ss.id, "parent": sys.id, "text": ss.subsystem};
            systemtree.push(subsys)
        }
    });
}

function parseGroupsTree(data){
    data.forEach(function(gr){
        group = { "id": "gr"+gr.group_id, "parent": "ss"+gr.ss_id, "text": gr.name};
        systemtree.push(group)
    })
}

function parseChannelsTree(data){
    data.forEach(function(ch){
        var parent
        if(ch.gr_id){
            parent = "gr"+ch.gr_id
        }
        else{
            parent = "ss"+ch.ss_id
        }
        channel = { "id": "ch"+ch.id, "parent": parent, "text": ch.name};
        systemtree.push(channel)
    })
}

const pool = new pg.Pool({
    user: 'vepp4',
    host: '192.168.144.4',
    database: 'v4',
})
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
})

function selectSystems(){
    pool.connect()
        .then(client => {
            return client.query('SELECT * FROM "01_system"')
                .then(res => {
                    parseSystems(res.rows);
                    //parseSystemsTree(res.rows);
                    selectGroups();
                    client.release();
                })
                .catch(err => {
                    client.release();
                    console.log(err.stack);
                })
        })
}

function selectGroups(){
    pool.connect()
        .then(client => {
            return client.query('SELECT * FROM "02_group"')
                .then(res => {
                    parseGroups(res.rows);
                    //parseGroupsTree(res.rows);
                    selectChannels();
                    client.release();
                })
                .catch(err => {
                    client.release();
                    console.log(err.stack);
                })
        })
}

function selectChannels(){
    pool.connect()
        .then(client => {
            return client.query('SELECT * FROM "03_chan"')
                .then(res => {
                    parseChannels(res.rows);
                    //parseChannelsTree(res.rows);
                    client.release();
                })
                .catch(err => {
                    client.release()
                    console.log(err.stack)
                })
        })
}

function getSystemTree(){
    return systemtree;
}

function getSystems(){
    return systems;
}

function getSensors(magnet_name){
    var sensors = systems.find(o => o.name === "Temperature").findAll(magnet_name)
    return sensors
}

module.exports = {
    selectSystems: selectSystems,
    systems: systems,
    systemtree: systemtree,
    getSensors: getSensors
}
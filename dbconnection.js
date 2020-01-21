const pg = require('pg')

var dbs = {
    "db2": {
        name: "v4_Sep2015-..",
        user: 'vepp4',
        port: 5432,
        host: 'vepp4-pg',
        database: 'v4parameters',
        type: 'v4',
        active: true
    },
    /*"db1": {
        name: "v4_Jun2019-..",
        user: 'vepp4',
        port: 5432,
        host: '192.168.144.4',
        database: 'v4',
        type: 'v4'
    },*/
    "db3": {
        name: "v4pickups_Oct2019-..",
        user: "vepp4",
        port: 5432,
        host: "vepp4-pult1",
        database: "v4pickups",
        type: 'pickups',
        active: true
    },
    "db4":{
        name: "v4_2013-2015",
        user: "vepp4",
        port: 5433,
        host: "vepp4-k500",
        database: 'v4parameters',
        type: 'v4',
        active: false
    },
    "db5":{
        name: "v4_2007-2013",
        user: "vepp4",
        port: 5432,
        host: "vepp4-k500",
        database: 'v4parameters',
        type: 'v4',
        active: false
    }
}

class DBConnection {
    constructor(id){
        let info = dbs[id];
        this.id = id;
        this.name = info.name;
        this.user = info.user;
        this.port = info.port;
        this.host = info.host;
        this.type = info.type;
        this.database = info.database;
        this.status = info.active;
        this.pool = new pg.Pool(info)
        this.pool.on('error', (err, client) => {
            this.status = false;
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        })
    }
    sendRequest(request,order,callback){
        this.pool.connect()
            .then(client => {
                this.status = true;
                return client.query(request)
                    .then(res => {
                        callback(res.rows);
                        client.release();
                    })
                    .catch(err => {
                        client.release();
                        this.status = false;
                        //console.log(request);
                        wsServer.sendError(err,order);
                    })
            })
            .catch(err => {
                this.status = false;
                if(order){
                    if(err.code=="EHOSTUNREACH"){
                        this.status = false;
                    }
                    err.dbid = this.id;
                    //console.log(err);
                    wsServer.sendError(err,order);
                }
            })
    }
    setAzimuths(az){
        this.azimuths = az;
    }
    getAzimuths(){
        return JSON.parse(JSON.stringify(this.azimuths));
    }
}

module.exports = {
    DBConnection: DBConnection
}
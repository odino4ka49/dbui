const pg = require('pg')
var fs = require('fs');

var dbs = JSON.parse(fs.readFileSync('databases.json', 'utf8'));

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
    sendRequest(request,order,callback,clientordernum){
        console.log(request,order)
        this.pool.connect()
            .then(client => {
                this.status = true;
                return client.query(request)
                    .then(res => {
                        //console.log(res);
                        if(callback) callback(res.rows);
                        client.release();
                    })
                    .catch(err => {
                        client.release();
                        this.status = false;
                        if(order) wsServer.sendError(err,order,clientordernum);
                    })
            })
            .catch(err => {
                this.status = false;
                if(order!=null){
                    switch(err.code){
                        case "EHOSTUNREACH":
                            this.status = false;
                            err.text = "No route to the host";
                            break;
                        case "ECONNREFUSED":
                            err.text = "Connection refused by DB server";
                            break;
                        case "ENOTFOUND":
                            err.text = "The domain you are trying to reach is unavailable or wrong";
                            break;  
                    }
                    err.dbid = this.id;
                    console.log("error"+err);
                    wsServer.sendError(err,order,clientordernum);
                }
            })
    }
    /*setAzimuths(az){
        this.azimuths = az;
    }
    getAzimuths(){
        console.log(this.azimuths)
        if(this.azimuths){
            return JSON.parse(JSON.stringify(this.azimuths));
        }
        else{
            return null;
        }
    }*/
}

function GetDbNumber()
{
    var num = 0;
    for(var key in dbs)
    {
        num++;
    }
    return num;
}

module.exports = {
    DBConnection: DBConnection,
    GetDbNumber: GetDbNumber
}
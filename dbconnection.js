const pg = require('pg')

var dbs = {
    "db1": {
        user: 'vepp4',
        port: 5432,
        host: 'vepp4-pg',//'192.168.144.4',
        database: 'v4parameters'//'v4',
    },
    "db2": {
        user: 'vepp4',
        port: 5432,
        host: '192.168.144.4',
        database: 'v4',
    },
    "db3": {
        user: 'vepp4',
        port: 5432,
        host: 'pg',
        database: 'v4',
    }
}

var pool = new pg.Pool(dbs["db1"])

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
})

function sendRequest(request,callback){
    pool.connect()
        .then(client => {
            return client.query(request)
                .then(res => {
                    callback(res.rows);
                    client.release();
                })
                .catch(err => {
                    client.release();
                    console.log(err.stack);
                })
        })
        .catch(err => {
            throw "can't connect to the DB";
        })
}

function changeDB(db){
    pool = new pg.Pool(dbs[db]);
}

module.exports = {
    sendRequest: sendRequest,
    changeDB: changeDB
}
const pg = require('pg')

const pool = new pg.Pool({
    user: 'vepp4',
    port: 5432,
    host: 'vepp4-pg',//'192.168.144.4',
    database: 'v4parameters'//'v4',
})

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
}


module.exports = {
    sendRequest: sendRequest
}
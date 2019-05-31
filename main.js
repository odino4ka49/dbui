const path = require('path')
const dbtree = require("./dbtree")
const wsserver = require("./wsserver")
const express = require('express')
const exphbs = require('express-handlebars')


const app = express()
const port = 8080

dbtree.selectSystems();

app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views/layouts')
}))
app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, 'views'))
app.use("/bower_components",express.static(__dirname + "/bower_components"));
app.use("/static",express.static(__dirname + "/static"));

app.get('/', (request, response) => {
    response.render('home', {})
})
app.get('/detectors', (request, response) => {
    response.render('detectors', {})
})
app.get('/get_magnet_sensors/:magnet', (request, response) => {
    response.json(dbtree.getSensors(request.params.magnet))
})

app.use((err, request, response, next) => {
    console.log(err)
    response.status(500).send("Something broke!")
})

app.listen(port)
 
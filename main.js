//импортируем нужные библиотеки
const path = require('path')
const model = require("./dbqueue")
const wsserver = require("./wsserver")
const express = require('express')
const exphbs = require('express-handlebars')
var bodyParser = require('body-parser');

//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

const app = express()
const port = 8080

app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views/layouts')
}))
app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, 'views'))
app.use("/bower_components",express.static(__dirname + "/bower_components"));
app.use("/static",express.static(__dirname + "/static"));
app.use(bodyParser.urlencoded({ extended: false }));

//описание ответов на конкретные запросы
app.get('/', (request, response) => {
    response.render('home', {})
})
app.get('/general', (request, response) => {
    response.render('general', {})
})  
app.get('/orbits', (request, response) => {
    response.render('orbits', {})
})
app.get('/detectors', (request, response) => {
    response.render('detectors', {})
})
app.get('/contacts', (request, response) => {
    response.render('contacts', {})
})
app.get('/t-diagnostics', (request, response) => {
    response.render('t-diagnostics', {})
})
app.get('/get_magnet_sensors/:magnet', (request, response) => {
    response.json(model.getSensors(request.params.magnet))
})
app.post('/get_channel_data/:channel', (request, response) => {
    model.getChannelData(request.body.datatable,request.params.channel);
    response.json(null);
})

app.use((err, request, response, next) => {
    console.log(err)
    response.status(500).send("Something broke!")
})

app.listen(port)

app.on('uncaughtException', function (err) {
    console.log(err);
});

//полотно, которое выделено сейчас
var activeplot = 'chart_1';
//последний индекс полотна
var chart_max_n = 0;
//var colors = ['#ff66ff','#b266ff','#66ffff','#66ffb2','#66ff66','#ffff66','#ffb266','#66b2ff'];
//var colors = ['#fa8eb4','#b48efa','#62b4ec','#32d4b4','#b4ffb4','#b4d432','#ecb462','#ec62b4','#b4b4ff','#62ecb4']
//тоны для генерации цветов графиков
var tones = [20];
var resizeObserver;
var orders = [];
var orders_max_n = 0;
var synched = true;

//проверка на возраст браузера
try {
    resizeObserver = new ResizeObserver(entries => {
        for (var entry of entries) {
            Plotly.Plots.resize(entry.target);
        }
    });
}
catch (error) {
    alert("This browser is outdated. Some of the functions are not going to work. We recommend you to use Chrome 64+ or Firefox 69+ versions.");
}

function defaultCursor() {
    if (orders.length == 0) {
        document.body.style.cursor = 'default';
    }
}

function setActivePlot(div) {
    activeplot = div.attr('id');
    $(".graphset").children().removeClass('active');
    div.parent().addClass('active');
    $(document).trigger("activePlotSet");
}

function setActivePlotByName(name) {
    activeplot = name;
    $(".graphset").children().removeClass('active');
    $("#" + name).parent().addClass('active');
    $(document).trigger("activePlotSet");
}

function parseDates(dates) {
    var result = [];
    //console.log("dates",dates)
    dates.forEach(element => {
        //console.log(element);
        result.push(Date.parse(element.substring(0, element.length - 1)));
    });
    return result;
}

//возвращает ширину полотна в пикселях
function getActivePlotWidth() {
    return Math.ceil($("#" + activeplot).width());
}

//добавляет новый канал на активный Plot
function addChannelToActivePlot(channel_node, hierarchy, datatable, dbid) {
    if (!activeplot) {
        alert("Please choose a canvas to display the data");
        $(document).trigger("channelsUpdated");
        return;
    }
    var chart = charts[activeplot];
    var channel = new ChartChannel(channel_node.name, hierarchy, datatable, dbid, channel_node.nodeId, activeplot);
    var new_chart_n = chart.name;
    if ((channel.hierarchy.channel.orbit && chart.type == "timeseries") || (!channel.hierarchy.channel.orbit && chart.type == "orbit")) {
        new_chart_n = addChartBeforeTarget($("#" + chart.name).parent());
        setActivePlotByName("chart_" + new_chart_n);
    }
    charts[activeplot].addChannel(channel);
}

//класс каналов для добавления в объект Chart
function ChartChannel(name, hierarchy, datatable, dbid, nodeid, chartname) {
    this.name = name;
    this.hierarchy = hierarchy;
    this.datatable = datatable;
    this.dbid = dbid;
    this.fullname;
    //this.id = null; //?
    this.nodeid = nodeid;
    this.displayed = false;
    this.color = null;
    this.data = [];
    this.units = null;
    this.chartname = chartname;
}

ChartChannel.prototype.addData = function (newdata, datetime) {
    var data_str = { 'period': datetime, 'data': newdata };/*[newdata[0][t],newdata[newdata.length-1][t]]*/
    for (var i = 0; i < this.data.length; i++) {
        var piece = this.data[i];
        //console.log("compare",piece.period,data_str.period)
        if ((piece.period[0] < data_str.period[0]) && (piece.period[1] > data_str.period[0])) {
            //remove duplicates
            //console.log("if1")
            data_str.splice(0, data_str.findIndex((element) => (element.t > piece.period[1])));
        }
        else if ((piece.period[0] < data_str.period[1]) && (piece.period[1] > data_str.period[1])) {
            //remove duplicates
            //console.log("if2")
            var ind = data_str.findIndex((element) => (element.t > piece.period[0]));
            data_str.splice(ind, 9e9);
        }
        else if ((piece.period[0] < data_str.period[1]) && (piece.period[0] > data_str.period[0]) && (piece.period[1] < data_str.period[1]) && (piece.period[1] > data_str.period[0])) {
            //console.log("if3")
            this.data.splice(this.data.findIndex(piece), 1);
        }
    }
    //insert data_str
    if (this.data.length == 0) {
        this.data.push(data_str);
        return;
    }
    if (this.data[0].period[0] >= data_str.period[1]) {
        //console.log("if2")
        this.data.unshift(data_str);
    }
    else if (this.data[this.data.length - 1].period[1] <= data_str.period[0]) {
        //console.log("if3")
        this.data.push(data_str);
    }
    else {
        //console.log("if4")
        for (var i = 0; i < this.data.length - 1; i++) {
            if ((this.data[i].period[1] <= data_str.period[0]) && (this.data[i + 1].period[0] >= data_str.period[1])) {
                this.data.splice(i + 1, 0, data_str);
            }
        }
    }
}

ChartChannel.prototype.checkIfMoreDataNeeded = function (time) {
    //отрезки времени, которые мы будем догружать
    var time_to_load = [];
    //отрезок времени, из которого мы потихоньку будем отрезать проверенные части и части для загрузки
    var time_to_cut = [time[0],time[1]];
    //console.log("checkIfMoreDataNeeded", new Date(time[0]).toString(), new Date(time[1]).toString())
    if((this.data.length!=0) && (time_to_cut[1]>=this.data[0].period[0]) && (time_to_cut[0]<=this.data[this.data.length-1].period[1])){
        for (var i = 0; i < this.data.length; i++) {
            var piece = this.data[i];
            //console.log("piece", new Date(piece.period[0]).toString(), new Date(piece.period[1]).toString())
            if(time_to_cut){
                if (time_to_cut[0] < piece.period[0]) {
                    time_to_load.push([time_to_cut[0], piece.period[0]]);
                }
                if (time_to_cut[1] > piece.period[1]) {
                    time_to_cut = [piece.period[1], time_to_cut[1]];
                }
                else {
                    time_to_cut = null;
                    break;
                }
                //console.log("time_to_cut", new Date(time_to_cut[0]).toString(), new Date(time_to_cut[1]).toString())
            }
        }
    }
    if(time_to_cut){
        if(time_to_cut[1]>moment()){
            time_to_cut = [time_to_cut[0],moment()];
        }
        else{
            time_to_load.push(time_to_cut);
        }
    }
    //console.log("time_to_load", time_to_load);
    for (var i = 0; i < time_to_load.length; i++) {
        //console.log("time_to_load", moment(time_to_load[i][0]).format('YYYY-MM-DD HH:mm:ss'), moment(time_to_load[i][1]).format('YYYY-MM-DD HH:mm:ss'))
        loadChannelDataObject(this, [moment(time_to_load[i][0]).format('YYYY-MM-DD HH:mm:ss'), moment(time_to_load[i][1]).format('YYYY-MM-DD HH:mm:ss')], this.chartname);
    }
}

ChartChannel.prototype.getData = function (time) {
    var result = [];
    //console.log(this.data);
    //put in result all the needed data
    for (var i = 0; i < this.data.length; i++) {
        var piece = this.data[i];
        //console.log(piece.period[0],time[0],piece.period[1],time[1])
        if ((piece.period[0] > time[0]) && (piece.period[1] < time[1])) {
            result = result.concat(piece.data);
        }
        else if ((piece.period[0] > time[0]) && (piece.period[0] < time[1]) && (piece.period[1] > time[1])) {
            result = result.concat(piece.data.slice(0, piece.data.findIndex((element) => (element.t > time[1]))));
        }
        else if ((piece.period[0] < time[0]) && (piece.period[1] < time[1]) && (piece.period[1] > time[0])) {
            var ind = piece.data.findIndex((element) => (element.t > time[0]));
            result = result.concat(piece.data.slice(ind, 9e9));
        }
        else if ((piece.period[0] <= time[0]) && (piece.period[1] >= time[1])) {
            var ind = piece.data.findIndex((element) => (element.t >= time[0]));
            result = result.concat(piece.data.slice(ind, piece.data.findIndex((element) => (element.t > time[1]))));
        }
    }
    return result;
}

ChartChannel.prototype.getFilteredData = function (time, pixels) {
    //time = [Date.parse(time[0]),Date.parse(time[1])];
    //assume time is in ms, otherwise we will change it to ms
    //console.log("getFilteredData",time);
    var result = [];
    //find time for every pixel
    this.checkIfMoreDataNeeded(time);
    var ms_in_px = (time[1] - time[0]) / pixels;
    for (var i = 0; i <= pixels - 1; i++) {
        time[0] + ms_in_px * i//get average data for every pixel
        result = result.concat(this.averageData([time[0] + ms_in_px * i, time[0] + ms_in_px * (i + 1)]))
    }
    return result;
}


//усреднение данных
ChartChannel.prototype.averageData = function (time) {
    var data = this.getData(time);
    //console.log("data",data);
    if (!data || data.length == 0) {
        return [];
    }
    var min = data[0];
    var max = data[0];
    //console.log(data)
    //console.log(data[0],this.name)
    var y = this.name;
    for (var i = 0; i < data.length; i++) {
        if (min[y] > data[i][y]) min = data[i];
        if (max[y] < data[i][y]) max = data[i];
    }
    var result = min.t > max.t ? [max, min] : [min, max]
    if (min[y] == max[y]) result = [max];
    return (result)
}

//фильтр данных - по точке на пиксель
/*ChartChannel.prototype.filterData = function(data,pixels,chname){
    var partsize = data.length/pixels;
    var result = [];
    for (var i=0;i<pixels;i++){
        result = result.concat(this.averageData(data.slice(i*partsize,(i+1)*partsize-1),chname));
    }         
    return(result);
}*/

//класс полотна с графиками
function Chart(name) {
    this.name = name;
    this.is_chart_rendered = false;
    this.scales_units = new Map();
    this.channels = [];
    this.axis_labels = [];
    if(synched&&activeplot&&(activeplot!=this.name)){
        this.range = [charts[activeplot].range[0],charts[activeplot].range[1]];
    }
    else{
        this.range = [moment().subtract(1, 'days').format('YYYY-MM-DD')+' 09:00:00', moment().format('YYYY-MM-DD HH:mm:ss')];//timepicker.getDateTime();//[];//
    }
    //this.max_id = 0;
}

//добавляет новый канал на канвас
Chart.prototype.addChannel = function (channel) {
    //TODO: check if channel is in plot
    var result = this.channels.find(obj => {
        return ((obj.name == channel.name) && (obj.dbid == channel.dbid))
    })
    if (result) return;
    //TODO: if it is not, put new channel in plot and ask to load
    this.channels.push(channel);
    loadChannelDataObject(channel, this.range, this.name);
}

Chart.prototype.getWidth = function () {
    return Math.ceil($("#" + this.name).width());
}

Chart.prototype.getHeight = function () {
    return Math.ceil($("#" + this.name).parent().height());
}

Chart.prototype.getChannels = function () {
    return this.channels;
}

//загружает информацию о канале из БД

//добавляет график, старая функция
Chart.prototype.addGraphData = function (json) {
    if (this.type == "orbit") {
        return false;
    }
    json.data.x = parseDates(json.data.x);
    var channel = this.channels.find((element) => (element.name == json.name));
    // console.log("CHANNEL",channel);
    var chan_name = json.name
    if (channel) {
        if (channel.displayed) {
            this.extendLine(chan_name, json.data, json.units, json.fullname)
        }
        else {
            if (!this.is_chart_rendered) {
                this.type = "timeseries";
                this.renderChart(chan_name, json.data, json.units, json.mode, json.fullname);
            }
            else {
                this.addPlot(chan_name, json.data, json.units, json.mode, json.fullname);
            };
        }
    }
    return true;
}

//добавляет данные из БД, запоминает и отрисовывает
Chart.prototype.addChannelData = function (json, mode) {
    if (this.type == "orbit") {
        return false;
    }
    var channel = this.channels.find((element) => (element.name == json.name));
    var datetime = [Date.parse(json.datetime[0]), Date.parse(json.datetime[1])];
    channel.addData(json.data, datetime);
    channel.units = json.units;
    channel.fullname = json.fullname;
    channel.mode = mode;
    console.log("addChannelData",datetime);
    console.log("channel.data",channel.data);

    this.drawChannelData(channel, datetime);
    /*var chan_name = json.name;
    var pixels = Math.ceil(this.getWidth()/(Date.parse(this.range[1])-Date.parse(this.range[0])) * (datetime[1]-datetime[0]));
    if(channel){
        var data_to_display = this.parseToChartData(chan_name,channel.getFilteredData(datetime,pixels));
        //console.log("data_to_display",data_to_display)
        if(channel.displayed){
            this.extendLine(chan_name,data_to_display,json.units,json.fullname)
        }
        else{
            if(!this.is_chart_rendered){
                this.type = "timeseries";
                this.renderChart(chan_name,data_to_display,json.units,mode,json.fullname);
            }
            else{
                this.addPlot(chan_name,data_to_display,json.units,mode,json.fullname);
            };
        }
    }*/
    return true;
}

Chart.prototype.drawChannelData = function (channel, datetime) {
    var chan_name = channel.name;
    var pixels = Math.ceil(this.getWidth() / (Date.parse(this.range[1]) - Date.parse(this.range[0])) * (datetime[1] - datetime[0]));
    if (channel) {
        var data_to_display = this.parseToChartData(chan_name, channel.getFilteredData(datetime, pixels));
        //console.log("data_to_display",data_to_display)
        if (channel.displayed) {
            this.extendLine(chan_name, data_to_display, channel.units, channel.fullname)
        }
        else {
            if (!this.is_chart_rendered) {
                this.type = "timeseries";
                this.renderChart(chan_name, data_to_display, channel.units, channel.mode, channel.fullname);
            }
            else {
                this.addPlot(chan_name, data_to_display, channel.units, channel.mode, channel.fullname);
            };
        }
    }
    return true;
}

//добавляет график орбиты
Chart.prototype.addOrbitData = function (json, chart, mode) {
    if (this.type == "timeseries") {
        return false;
    }
    this.type = "orbit";
    if (!this.is_chart_rendered) {
        this.renderChart(json.name, json.data, json.units, json.mode, json.fullname);
    }
    else {
        this.addPlot(json.name, json.data, json.units, json.mode, json.fullname);
    };
    return true;
}

Chart.prototype.parseToChartData = function (channel, data) {
    //console.log("data_to_parse",data);
    var x = [];
    var y = [];
    data.forEach(element => {
        var date = new Date();
        date.setTime(element["t"]);
        //result.push([parseInt(element["t"]),element[channel]]);
        x.push(date),
            y.push(element[channel])
    });
    return { x: x, y: y };
}

//готовит данные для вывода в виде графика
Chart.prototype.parseToArrayData = function (data) {
    var result = []
    data.forEach(element => {
        result.push([parseInt(element["date_part"]) * 1000, element.v4_current]);
    });
    data = null;
    return result;
}

//дорисовывает график
Chart.prototype.extendLine = function (channel, data, units) {
    //console.log(this.channels, channel)
    data.name = channel;
    var id = this.channels.findIndex((element) => (element.name == channel));
    data.x.push(null);
    data.y.push(null);
    //console.log("extendLine", data, id)
    Plotly.extendTraces(this.name, { y: [data.y], x: [data.x] }, [id])
}

//перерисовать все графики
Chart.prototype.redrawChannels = function (datetime) {
    var datetime = [Date.parse(datetime[0]), Date.parse(datetime[1])];
    console.log("redrawChannels",datetime);
    //console.log("redrawChannels",this.channels);
    for (var i = 0; i < this.channels.length; i++) {
        this.removeLine(0);
    }
    for (var i = 0; i < this.channels.length; i++) {
        var channel = this.channels[i];
        channel.displayed = false;
        this.drawChannelData(channel, datetime);
    }
}

//отрисовывает полотно с первым графиком
Chart.prototype.renderChart = function (channel, data, units, mode, fullname) {
    this.is_chart_rendered = true;
    var chan_data = this.channels.find((element) => (element.name == channel));
    //chan_data.id = this.max_id;
    //this.max_id++;
    data.mode = mode;//'markers';//
    data.name = channel;
    if (fullname) data.name = fullname;
    //auto generate line color with the right tone
    var color = hsvToHex(tones[0], 80, 80)
    chan_data.color = color;
    data.line = { color: color }
    data.marker = { size: 3 }
    data.x.push(null);
    data.y.push(null);
    this.axis_labels = [
        {
            xref: 'paper',
            yref: 'paper',
            x: -0.02,
            xanchor: 'top',
            y: 0.91,
            yanchor: 'bottom',
            text: units,
            textangle: -45,
            font: { color: color },
            showarrow: false
        }
    ];
    var chartData = [data];
    var config = { responsive: true, doubleClickDelay: 2000 };
    var layout = {
        legend: {
            yanchor: "top",
            y: 1.2,
            xanchor: "left",
            x: 0.04,
            //traceorder: 'reversed',
            font: { size: 12 },
            orientation: "h"
        },
        showlegend: true,
        margin: { l: 20, r: 10, b: 40, t: 40 },
        xaxis: {
            range: this.range,
            domain: [0, 1],
            type: "date"
        },
        yaxis: {
            color: color,
            linecolor: color,
            domain: [0, 0.9],
            zerolinecolor: "#444",
            position: 0,
            //hoverformat: ",d",
            ticklabelposition: 'inside'
        },
        annotations: this.axis_labels
    };
    if (this.type == "orbit") {
        layout.xaxis = {
            domain: [0, 1]
        }
    }
    Plotly.react(this.name, chartData, layout, config).then(function (gd) {
        //console.log(gd)
        resizeObserver.observe(gd);
    });
    this.scales_units.set(units, {
        color: color,
        axis_n: 1,
        channel_counter: 1
    });
    document.getElementById(this.name).on('plotly_legenddoubleclick', function (data) {
        terminateChannel(data.curveNumber)
        return false;
    }).on('plotly_relayout', (eventdata) => {
        this.loadNewDataAfterZoom(eventdata);
        if (synched) {
            relayoutAllPlots(eventdata)
        }
    });
    chan_data.displayed = true;
    chartData = null;
    transform_x_scale = null;
}

//подгрузка новых данных в соответствии с зумом
Chart.prototype.loadNewDataAfterZoom = function (eventdata) {
    //console.log('zoom',this,eventdata);
    if ('xaxis.range[0]' in eventdata) {
        setActivePlotByName(this.name);
        //this.max_id = 0;
        this.redrawChannels([eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']]);
        //reloadChannels(this.channels,[eventdata['xaxis.range[0]'],eventdata['xaxis.range[1]']]);
    }
}


//удаляет линию графика с осями и пр. (не сделано)
Chart.prototype.terminateChannel = function (id) {
    var channel = this.channels[id];
    this.channels.splice(id, 1);
    if (this.channels.length == 0) {
        terminateChart(this.name);
        return;
    }
    Plotly.deleteTraces(this.name, id);
    //вычтем 1 из счетчика каналов на оси
    var scales_data = this.scales_units.get(channel.units);
    scales_data.channel_counter--;
    if (scales_data.channel_counter == 0) {
        this.removeAxis(channel.units);
    }
    $(document).trigger("channelsUpdated");
    //console.log(id,Plotly)
    /*for(var i=0;i<this.channels.length;i++){
        if(id<this.channels.id)
        { 
            this.channels.id--;
        }
    }*/
}

//удаляет только линию графика
Chart.prototype.removeLine = function (id) {
    //console.log("removeLine",id,this)
    Plotly.deleteTraces(this.name, id);
}

//удаление канала
Chart.prototype.removeChannel = function (id) {
    //TODO
}

//сохраняем асинхронное состояние
Chart.prototype.saveAsyncState = function () {
    this.last_async_range = [this.range[0],this.range[1]];
}

//возвращаемся в асинхронное состояние
Chart.prototype.gotoAsyncState = function () {
    if(this.last_async_range){
        this.setRange([this.last_async_range[0],this.last_async_range[1]]);
        //this.range = [this.last_async_range[0],this.last_async_range[1]];
        //console.log(this.range);
    }
//    this.redrawChannels(this.range);*/
}

//устанавливает границы оси х
Chart.prototype.setRange = function (time) {
    this.range = [time[0],time[1]];
    if (this.is_chart_rendered && this.type != "orbit") {
        var relayout_data = {
            xaxis: {
                range: this.range,
                domain: [(this.scales_units.size - 1) / 25, 1],
                type: "date"
            }
        }
        Plotly.update(this.name, [], relayout_data);
        this.redrawChannels(time);
        //TODO: call for more data if needed
    }
}

//возвращает границы оси х
Chart.prototype.getRange = function () {
    //var start = (' ' + this.range[0]).slice(1);
    //var end = (' ' + this.range[1]).slice(1);
    return this.range;//[start,end];
}

Chart.prototype.removeAxis = function (units) {
    //remove the scale
    if (this.type == "orbit") {
        return;
    }
    this.scales_units.delete(units);
    var scale_num = this.scales_units.size;
    //while(scale_num>=tones.length) nextTone();
    //console.log(this.scales_units)
    //if(chan_data.color==null) chan_data.color = color;
    var axis_ind = this.axis_labels.findIndex((element) => (element.text == units));
    this.axis_labels.splice(axis_ind, 1);

    var relayout_data = {
        xaxis: {
            range: this.range,
            domain: [(scale_num - 1) / 25, 1],
            autorange: false,
            type: "date"
        },
        annotations: this.axis_labels
    };
    for (var i = axis_ind; i < scale_num; i++) {
        this.axis_labels[i].x = i / 25 - 0.02;
        var axis_color = this.axis_labels[i].font.color;
        var scales_data = this.scales_units.get(this.axis_labels[i].text)
        var yaxisname = "yaxis" + (scales_data.axis_n);
        var ticklabelposition = (i == 0) ? "inside" : "outside";
        relayout_data[yaxisname] = {
            overlaying: "y",
            color: axis_color,
            linecolor: axis_color,
            zerolinecolor: "#ccc",
            anchor: 'free',
            side: "left",
            ticklabelposition: ticklabelposition,
            position: i / 25
        };

    }
    Plotly.update(this.name, [], relayout_data);
    scale_num = null;
}

//отрисовывает новый график на полотне
Chart.prototype.addPlot = function (channel, data, units, mode, fullname) {
    //console.log("addplot",channel)
    var scale_data = this.scales_units.get(units);
    var chan_data = this.channels.find((element) => (element.name == channel));
    /*if(chan_data.id==null){
        chan_data.id = this.max_id;
        this.max_id++;
    }*/
    if (fullname) channel = fullname;
    if (!scale_data) {
        //add new scale
        var scale_num = this.scales_units.size;
        var yaxisname = "yaxis" + (scale_num + 1);
        while (scale_num >= tones.length) nextTone();
        //console.log(this.scales_units)
        var color = hsvToHex(tones[scale_num], 80, 80);
        if (chan_data.color == null) chan_data.color = color;
        var relayout_data = {
            xaxis: {
                range: this.range,
                domain: [scale_num / 25, 1],
                autorange: false,
                type: "date"
            },
            annotations: this.axis_labels
        };
        if (this.type == "orbit") {
            relayout_data.xaxis = {
                domain: [scale_num / 25, 1]
            }
        }
        relayout_data[yaxisname] = {
            overlaying: "y",
            color: color,
            linecolor: color,
            zerolinecolor: "#ccc",
            anchor: 'free',
            side: "left",
            position: scale_num / 25
        };
        scale_data = {
            color: color,
            axis_n: scale_num + 1,
            channel_counter: 1
        };
        this.scales_units.set(units, scale_data);
        this.axis_labels.push(
            {
                xref: 'paper',
                yref: 'paper',
                x: scale_num / 25 - 0.02,
                xanchor: 'top',
                y: 0.91,
                yanchor: 'bottom',
                text: units,
                textangle: -45,
                font: { color: color },
                showarrow: false
            }
        )
        Plotly.update(this.name, [], relayout_data);
        scale_num = null;
    }
    else {
        scale_data.channel_counter++;
        if (chan_data.color == null) {
            //scale_data.color = hsvToHex(tones[scale_data.axis_n-1], getRandomInt(30,100), getRandomInt(40,100));
            chan_data.color = hsvToHex(tones[scale_data.axis_n - 1], getRandomInt(30, 100), getRandomInt(40, 100));
        }
    }
    data.mode = mode//'markers'; //type of plot
    data.name = channel;
    data.line = { color: chan_data.color };
    data.marker = { size: 3 }; //size of markers
    data.yaxis = "y" + scale_data.axis_n;
    data.x.push(null);
    data.y.push(null);
    Plotly.addTraces(this.name, data);
    chan_data.displayed = true;
    scale_data = null;
}

//начальные графики
var charts = {}

function initCharts() {
    charts['chart_1'] = new Chart('chart_1');
    chart_max_n++;
}

//удаляет линию графика
function removeLine(id) {
    if (activeplot) {
        charts[activeplot].removeLine(id);
    }
}

function removeChanFromActivePlot(node, dbid) {
    if (activeplot) {
        charts[activeplot].removeChannel(node, dbid);
    }
}

//удаляет канал
function terminateChannel(id) {
    if (activeplot) {
        charts[activeplot].terminateChannel(id);
    }
}


//sets variable range of the active plot
function setRange(time) {
    if (synched) {
        for (var chart in charts) {
            charts[chart].setRange(time);
        }
    }
    else if (activeplot) {
        charts[activeplot].setRange(time);
    }
}

function getActivePlotRange() {
    if (activeplot) {
        return charts[activeplot].getRange();
    }
}

//returns channels of the active plot
function getActivePlotChanels() {
    if (activeplot) {
        return charts[activeplot].getChannels();
    }
    return [];
}

Array.prototype.unique = function () {
    //TODO: check
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
};

//returns channels of all the plots
function getAllPlotsChannels() {
    var channels = [];
    for (var chart in charts) {
        channels.concat(charts[chart].getChannels()).unique();
    }
    return channels;
}

//синхронизация всех холстов
function synchronizePlots() {
    if (activeplot) {
        var range = charts[activeplot].getRange();
        for (var chart in charts) {
            charts[chart].saveAsyncState();
        }
        for (var chart in charts) {
            charts[chart].setRange(range);
        }
    }
}

//рассинхронизация всех холстов
function asynchronizePlots() {
    for (var chart in charts) {
        charts[chart].gotoAsyncState();
    }
}

//распространить зум на все холсты
function relayoutAllPlots(ed) {
    if("yaxis.range[0]" in ed){
        delete ed["yaxis.range[0]"];
    }
    if("yaxis.range[1]" in ed){
        delete ed["yaxis.range[1]"];
    }
    if(("xaxis.autorange" in ed)||("xaxis.range[0]" in ed)){
        for (var chart in charts) {
            if(ed.autosize) return;
            if(chart!=activeplot){
                var div = document.getElementById(chart);
                if(div){
                    var x = div.layout.xaxis;
                    if (ed["xaxis.autorange"] && x.autorange) return;
                    //console.log("ED",div,activeplot,ed,x)
                    if (x.range[0] != ed["xaxis.range[0]"] || x.range[1] != ed["xaxis.range[1]"]) {
                        Plotly.relayout(div, ed);
                    }
                }
            }
        }
    }
}

//добавляет данные о канале
function addChannelDataInOrder(json) {
    var order = orders.filter(obj => { return obj.number === json.ordernum })[0];
    order.parts_num = json.parts;
    order.parts[json.index] = json;
    var i = 0;
    //console.log("order", order);
    console.log("got", json);
    if (order.last_displayed != null) i = order.last_displayed + 1;
    for (; i <= json.index; i++) {
        //console.log("draw",i);
        if (order.parts[i] != undefined) {
            addChannelData(order.parts[i], order.chart, order.mode);
            order.last_displayed = i;
            //order.parts[i]=1;
        }
    }
    if (order.last_displayed == order.parts_num - 1) {
        var no_data = true;
        //console.log(order.parts);
        for (i = 0; i <= order.last_displayed; i++) {
            if (order.parts[i].data.length != 0) {
                no_data = false;
            }
        }
        if (no_data) alert("Sorry, no data to display");
        orders.splice(orders.indexOf(order), 1);
        defaultCursor();
    }
}

//добавляет график: old
/*function addGraphDataInOrder(json){
    var order = orders.filter(obj => {  return obj.number === json.ordernum})[0];
    order.parts_num = json.parts;
    order.parts[json.index]=json;
    var i = 0;
    console.log("got",json.index);
    if(order.last_displayed!=null) i=order.last_displayed+1;
    for(;i<=json.index;i++){
        console.log("draw",i);
        if(order.parts[i]!=undefined){
            addGraphData(order.parts[i]);
            order.last_displayed = i;
            //order.parts[i]=1;
        }
    }
    if(order.last_displayed==order.parts_num-1)
    {
        var no_data = true;
        //console.log(order.parts);
        for(i=0;i<=order.last_displayed;i++){
            if(order.parts[i].data.x.length!=0){
                no_data = false;
            }
        }
        if(no_data) alert("Sorry, no data to display");
        orders.splice(orders.indexOf(order),1);
        defaultCursor();
    }
}*/

//добавляет и отрисовывает данные
function addChannelData(json, chart, mode) {
    if (chart in charts) {
        charts[chart].addChannelData(json, mode);
        //charts[chart].
        /*if(!charts[chart].addGraphData(json,chart,mode)){
            if(!charts[activeplot].addGraphData(json)){
                var new_chart_n = addChartBeforeTarget($("#"+json.chart).parent());
                setActivePlotByName("chart_"+new_chart_n);
                charts["chart_"+new_chart_n].addGraphData(json);
                new_chart_n = null;
            }
        }*/
    }
}

//добавляет график орбиты
function addOrbitData(json) {
    var order = orders.filter(obj => { return obj.number === json.ordernum })[0];
    if (json.chart in charts) {
        if (!charts[json.chart].addOrbitData(json)) {
            var new_chart_n = addChartBeforeTarget($("#" + json.chart).parent());
            setActivePlotByName("chart_" + new_chart_n);
            charts["chart_" + new_chart_n].addOrbitData(json);
            new_chart_n = null;
        }
    }
    else {
        alert("Please choose a canvas to display the data");
        $(document).trigger("channelsUpdated");
        document.body.style.cursor = 'default';
    }
    orders.splice(orders.indexOf(order), 1);
    defaultCursor();
    json = null;
}

//удалить заказ
function removeOrder(ordernum) {
    console.log(ordernum)
    var order = orders.filter(obj => { return obj.number === ordernum })[0];
    orders.splice(orders.indexOf(order), 1);
    defaultCursor();
}

//добавление полотна
function addChart(e) {
    addChartBeforeTarget(e.target);
}

function addChartBeforeTarget(target) {
    chart_max_n++;
    $('<div id="graph' + chart_max_n
        + '" class="resizable"><div id="chart_' + chart_max_n
        + '" class="pchart"></div><div class="close_chart"></div><div class="handle"></div></div>').insertBefore(target).resizable();
    charts["chart_" + chart_max_n] = new Chart("chart_" + chart_max_n);
    return chart_max_n;
}

function closeChart(e) {
    var graph = $(e.target).parent().children(":first");
    var name = graph.attr("id");
    terminateChart(name);
}

//удаление полотна
function terminateChart(name) {
    var graph = $("#" + name).parent();
    resizeObserver.unobserve(document.getElementById(name));
    graph.remove();
    //$(e.target).parent().remove();
    delete charts[name];
    if (activeplot == name) {
        activeplot = null;
    }
    $(document).trigger("channelsUpdated");
    name = null;
}

//перезагрузка каждого графика
function reloadChannels(channels, time) {
    //console.log(channels);
    channels.forEach(function (channel) {
        //TODO:reloadallthegraphs    

        //channel.displayed = false;
        //removeLine(0);
        //loadChannelDataObject(channel,time);
    })
}

//работа с кодом цвета
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}
//работа с кодом цвета
function hsvToHex(h, s, v) {
    var hsv = {
        h: h,
        s: s,
        v: v
    };
    var c = Color(hsv);
    return c.toString();
}
//выбор следующего тона
function nextTone() {
    var size = tones.length;
    if (tones[size - 1] + 30 >= 360) {
        tones.push(tones[size - 1] + 40 - 360);
    }
    else {
        tones.push(tones[size - 1] + 30);
    }
    return tones[size];
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}


//посылает запрос на данные о канале с помощью объекта канал
function loadChannelDataObject(channel_object, time, chartname) {
    var msg = {
        type: "get_full_channel_data",
        hierarchy: channel_object.hierarchy,
        datatable: channel_object.datatable,
        datetime: time,
        dbid: channel_object.dbid,
        //chart: plot,
        //pixels: getActivePlotWidth()-10,
        //mode: getMode(),
        ordernum: orders_max_n
    };
    orders.push({
        number: orders_max_n,
        parts_num: null,
        chart: chartname,
        mode: getMode(),
        last_displayed: null,
        parts: []
    })
    orders_max_n++;
    document.body.style.cursor = 'wait';
    sendMessageToServer(JSON.stringify(msg));
    msg = null;
}

function synchronizePlotsEvent(checkboxElem) {
    if (checkboxElem.checked) {
        if (!activeplot) {
            alert("Please select a canvas to sync all the plots");
            checkboxElem.removeAttr("checked");
        }
        else {
            synched = true;
            synchronizePlots();
        }
    } else {
        synched = false;
        asynchronizePlots();
    }
}

$(document).ready(function () {
    dragula([document.getElementById('graphset')], {
        moves: function (el, container, handle) {
            return handle.classList.contains('handle');
        },
        mirrorContainer: document.getElementById('mirror')
    });
    $("body").on("click", ".pchart", function () {
        setActivePlot($(this));
    }); close
    $("body").on("click", ".close_chart", closeChart);
    $('.resizable').resizable();
    $('.resizable_hor').resizable({
        handles: 'e, w'
    });
    $("#add_chart").click(addChart);
    synched = ("#synchronization").checked;
});

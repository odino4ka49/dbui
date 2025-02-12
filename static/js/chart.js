//имя холста, который выделен сейчас
var activeplot = 'chart_1';
//максимальный номер холста (используется при создании нового холста)
var chart_max_n = 0;
//набор освновных цветов для графиков
//var colors = ['#ff66ff','#b266ff','#66ffff','#66ffb2','#66ff66','#ffff66','#ffb266','#66b2ff'];
//var colors = ['#fa8eb4','#b48efa','#62b4ec','#32d4b4','#b4ffb4','#b4d432','#ecb462','#ec62b4','#b4b4ff','#62ecb4']
var colors_table = [
    ["#478DB8", "#009EFF", "#00FFF0", "#0D4B72", "#175ABE", "#1C736E", "#47B8B1", "#7B9DBC", "#4E7FFB", "#8EE7ED", "#A4CFEA"],
    ["#7BBC9A", "#00FF7A", "#0D6B3A", "#23F900", "#2E981D", "#64830B", "#64D651", "#83F3B8", "#A1BF49", "#A3EA98", "#B5F10B"],
    ["#A40C1B", "#FF0019", "#A1420D", "#AB2264", "#FA1B86", "#FB9AA3", "#FB9ACE", "#FF0000", "#FF4D00", "#FFA184"],
    ["#783C8D", "#4D056F", "#4D056F", "#BC07BF", "#BD00FF", "#C078D9", "#D09AFB"],
    ["#252525", "#C7C7C7", "#000000", "#858585", "#5C5C5C", "#666666", "#CCCCCC", "#9F9F9F", "#ABABAB"]
];
var resizeObserver;
var orders = [];
var orders_max_n = 0;
var synched = true;
var max_scale_num = 0;
//начальные графики
var charts = {};
var monitoringTimer;
var chart_to_download_name;

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
        $("#blocker").addClass("invisible");
    }
}

function waitCursor(){
    document.body.style.cursor = 'wait';
    $("#blocker").removeClass("invisible");
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

//возвращает ширину полотна в пикселях
function getActivePlotWidth() {
    return Math.ceil($("#" + activeplot).width());
}

//добавляет новый канал на активный Plot или создает новый холст соответствующего типа
function addChannelToActivePlot(channel_node, hierarchy, datatable, dbid) {
    var chart = charts[activeplot];
    var channel = new ChartChannel(channel_node.name, channel_node.fullname, channel_node.unit, channel_node.datatype, channel_node.orbit, hierarchy, datatable, dbid, channel_node.nodeId, activeplot, getMode(),channel_node.data_tbl_type);

    //if we want to open new chart
    if ((!activeplot) || (channel.datatype == "char" || channel.datatype == "stringin" /* && chart.type != "text"*/) || (channel.datatype != "char" && chart.type == "text") || (channel.orbit && chart.type == "timeseries") || (!channel.orbit && chart.type == "orbit")) {
        var istext = (channel.datatype == "char" || channel.datatype == "stringin" ) ? true : false;
        if(!activeplot){
            new_chart_n = addChartBeforeTarget($("#add_chart"),istext);
        }
        else{
            new_chart_n = addChartBeforeTarget($("#" + chart.name).parent(),istext);
        }
        var newchartname = "chart_" + new_chart_n;
        var newchart = charts[newchartname];
        if(istext) newchart.setType("text");
        else if(channel.orbit) newchart.setType("orbit");
        else newchart.setType("timeseries");
        channel.chartname = newchartname;
        newchart.addChannel(channel);
        setActivePlotByName(newchartname);
    }
    else{
        if(chart.type == null){
            if(channel.datatype == "char" || channel.datatype == "stringin" ) chart.setType("text");
            else if(channel.orbit) chart.setType("orbit");
            else chart.setType("timeseries");
        }
        chart.addChannel(channel);
    }
}

//класс каналов для добавления в объект Chart
class ChartChannel
{
    constructor (name, fullname, units, datatype, orbit, hierarchy, datatable, dbid, nodeid, chartname, mode, dtt) {
        this.name = name;
        this.hierarchy = hierarchy;
        this.datatable = datatable;
        this.dbid = dbid;
        //this.display_id = null;
        this.fullname = fullname;
        this.datatype = datatype;
        this.orbit = orbit;
        this.nodeId = nodeid;
        this.displayed = false;
        this.color = null;
        this.data = [];
        this.units = units;
        this.chartname = chartname;
        this.type = null;
        this.mode = mode;
        this.data_tbl_type = dtt;
    }

    //если datetime заканчивается меньше, чем за 30 секунд до now, обрубить по последней записи либо по 30 сек до now
    checkMonitoringData (newdata,datetime)
    {
        if(!newdata || newdata.length == 0) return;
        var timenow = new Date().getTime();
        if(datetime[1] >= timenow-30000)
        {
            if(newdata[newdata.length-1].t >= timenow - 30000)
            {
                datetime[1] = newdata[newdata.length-1].t;
            }
            else
            {
                datetime[1] = timenow-30000;
            }
        }
        return datetime;
    }

    //добавляет новый промежуток с данными
    addData (newdata, datetime) {
        //если datetime заканчивается меньше, чем за 30 секунд до now, обрубить по последней записи либо по 30 сек до now
        datetime = this.checkMonitoringData(newdata,datetime);
        var data_str = { 'period': datetime, 'data': newdata };/*[newdata[0][t],newdata[newdata.length-1][t]]*/
        for (var i = 0; i < this.data.length; i++) {
            var piece = this.data[i];
            if ((piece.period[0] < data_str.period[0]) && (piece.period[1] > data_str.period[0])) {
                //remove duplicates
                data_str.data.splice(0, data_str.data.findIndex((element) => (element.t > piece.period[1])));
            }
            else if ((piece.period[0] < data_str.period[1]) && (piece.period[1] > data_str.period[1])) {
                //remove duplicates
                var ind = data_str.data.findIndex((element) => (element.t > piece.period[0]));
                data_str.data.splice(ind, 9e9);
            }
            else if ((piece.period[0] < data_str.period[1]) && (piece.period[0] > data_str.period[0]) && (piece.period[1] < data_str.period[1]) && (piece.period[1] > data_str.period[0])) {
                this.data.splice(this.data.findIndex(piece), 1);
            }
        }
        //insert data_str
        if (this.data.length == 0) {
            this.data.push(data_str);
            return;
        }
        if (this.data[0].period[0] >= data_str.period[1]) {
            this.data.unshift(data_str);
        }
        else if (this.data[this.data.length - 1].period[1] <= data_str.period[0]) {
            var last = this.data[this.data.length - 1];
            //если последний промежуток меньше 12 часов и стоит рядом с новыми данными, сшиваем
            if((last.period[1]-last.period[0]<43200000)&&last.period[1]==data_str.period[0]){
                last.period[1] = data_str.period[1];
                last.data = last.data.concat(data_str.data);
            }
            else{
                this.data.push(data_str);
            }
        }
        else {
            for (var i = 0; i < this.data.length - 1; i++) {
                if ((this.data[i].period[1] <= data_str.period[0]) && (this.data[i + 1].period[0] >= data_str.period[1])) {
                    this.data.splice(i + 1, 0, data_str);
                }
            }
        }
    }

    //проверка, есть ли нехватка данных в нужном промежутке
    checkIfMoreDataNeeded (time, monitoring = false) {        
        //console.log("MOREDATANEEDED0", [moment(time[0]).format('YYYY-MM-DD HH:mm:ss'), moment(time[1]).format('YYYY-MM-DD HH:mm:ss')]);
        //if(this.data.length>0)
        //    console.log("moredataneeded1", [moment(this.data[0].period[0]).format('YYYY-MM-DD HH:mm:ss'), moment(this.data[0].period[1]).format('YYYY-MM-DD HH:mm:ss')]);
        //отрезки времени, которые мы будем догружать
        var time_to_load = [];
        //отрезок времени, из которого мы потихоньку будем отрезать проверенные части и части для загрузки
        var time_to_cut = [Math.floor(time[0]/1000)*1000,Math.floor(time[1]/1000)*1000];
        if((this.data.length!=0) && (time_to_cut[1]>=this.data[0].period[0]) && (time_to_cut[0]<=this.data[this.data.length-1].period[1])){
            for (var i = 0; i < this.data.length; i++) {
                var piece = this.data[i];
                if(time_to_cut){
                    if (time_to_cut[0] < piece.period[0])
                    {
                        if(time_to_cut[1]>=piece.period[0]) {
                            time_to_load.push([time_to_cut[0], piece.period[0]]);
                            //time_to_cut = null;
                            time_to_cut = [piece.period[0],time_to_cut[1]];
                        }
                        else{
                            break;
                        }
                    }
                    if(time_to_cut[0] < piece.period[1]){
                        if (time_to_cut[1] > piece.period[1]) {
                            time_to_cut = [piece.period[1], time_to_cut[1]];
                        }
                        else{
                            time_to_cut = null;
                            break;
                        }
                    }
                }
            }
        }
        //console.log("MOREDATANEEDED1", this.data, [moment(time_to_cut[0]).format('YYYY-MM-DD HH:mm:ss'), moment(time_to_cut[1]).format('YYYY-MM-DD HH:mm:ss')]);
        if(time_to_cut){
            if(time_to_cut[1]>moment()){
                time_to_cut = [time_to_cut[0],moment()];
            }
            time_to_load.push(time_to_cut);
        }
        for (var i = 0; i < time_to_load.length; i++) {
            //console.log("moredataneeded2", this.data, [moment(time_to_load[i][0]).format('YYYY-MM-DD HH:mm:ss'), moment(time_to_load[i][1]).format('YYYY-MM-DD HH:mm:ss')]);
            loadChannelDataObject(this, [moment(time_to_load[i][0]).format('YYYY-MM-DD HH:mm:ss'), moment(time_to_load[i][1]).format('YYYY-MM-DD HH:mm:ss')], this.chartname, monitoring);
        }
    }

    //finds next after given time
    getFirstAfter (time){
        var result = null;
        for(var i=0; i < this.data.length; i++){
            var piece = this.data[i];
            if(piece.period[0]<=time && piece.period[1]>=time){
                var dot = piece.data.find((element) => (element.t >= time));
                if(dot) result = (!result) ? dot : ((result.t > dot.t) ? dot : result);
            }
        }
        return result;
    }

    //finds first before given time
    getFirstBefore (time){
        var result = null;
        for(var i=0; i < this.data.length; i++){
            var piece = this.data[i];
            if(piece.period[0]<=time && piece.period[1]>=time){
                var ind = piece.data.findIndex((element) => (element.t > time));
                var dot = (ind!=0) ? piece.data[ind-1] : piece.data[0];
                if(dot) result = (!result) ? dot : ((result.t < dot.t) ? dot : result);
            }
        }
        return result;
    }

    //возвращает нужные данные за промежуток времени
    getData (time) {
        var result = [];
        //put in result all the needed data
        for (var i = 0; i < this.data.length; i++) {
            var piece = this.data[i];
            if ((piece.period[0] >= time[0]) && (piece.period[1] <= time[1])) {
                result = result.concat(piece.data);
            }
            else if ((piece.period[0] >= time[0]) && (piece.period[0] <= time[1]) && (piece.period[1] >= time[1])) {
                var indmax = piece.data.findIndex((element) => (element.t >= time[1]));
                //if(indmax+1 < piece.data.length) indmax = indmax+1; //захватим дополнительную точку справа
                result = result.concat(piece.data.slice(0, indmax));
            }
            else if ((piece.period[0] <= time[0]) && (piece.period[1] <= time[1]) && (piece.period[1] >= time[0])) {
                var ind = piece.data.findIndex((element) => (element.t >= time[0]));
                //if((ind-1)>=0) ind = ind-1; //захватим дополнительную точку слева
                result = result.concat(piece.data.slice(ind, 9e9));
            }
            else if ((piece.period[0] <= time[0]) && (piece.period[1] >= time[1])) {
                var ind = piece.data.findIndex((element) => (element.t >= time[0]));
                var indmax = piece.data.findIndex((element) => (element.t >= time[1]));
                //if(indmax+1 < piece.data.length) indmax = indmax+1; //захватим дополнительную точку справа
                //if((ind-1)>=0) ind = ind-1;  //захватим дополнительную точку слева
                result = result.concat(piece.data.slice(ind, indmax));
            }
        }
        return result;
    }

    //возвращает усредненные по пикселям данные
    getFilteredData (time, pixels) {
        var result = [];
        //find time for every pixel
        var ms_in_px = (time[1] - time[0]) / pixels;
        var first_dot = this.getFirstBefore(time[0]);
        if(first_dot) result.push(first_dot);
        for (var i = 0; i <= pixels - 1; i++) {
            //time[0] + ms_in_px * i
            //get average data for every pixel
            result = result.concat(this.averageData([time[0] + ms_in_px * i, time[0] + ms_in_px * (i + 1)]))
        }
        var last_dot = this.getFirstAfter(time[1]);
        if(last_dot) result.push(last_dot);
        return result;
    }

    //усреднение данных
    averageData (time) {
        var data = this.getData(time);
        if (!data || data.length == 0) {
            return [];
        }
        var min = data[0];
        var max = data[0];
        var y = this.name;

        if(this.fullname) y = this.fullname;

        for (var i = 0; i < data.length; i++) {
            if (min[y] > data[i][y]) min = data[i];
            if (max[y] < data[i][y]) max = data[i];
        }
        var result = min.t > max.t ? [max, min] : [min, max]
        if (min[y] == max[y]) result = [max];
        return (result)
    }

    //получение текстовых данных в виде набора отрезков для новых графиков
    getSegmentedData (time){
        var data = this.getData(time);
        if (!data || data.length == 0) {
            return [];
        }
        //this.values - список возможных значений текстового канала с цветами. нужен для того, чтобы создать легенду
        if(!this.values) this.values = {};
        var result = {};
        var new_values = [];
        var y = this.name;
        var lastval = data[0];
        for (var i = 0; i < data.length; i++) {
            if(data[i][y]!=lastval[y]){
                if(! (lastval[y] in result)){
                    result[lastval[y]] = [];
                }
                result[lastval[y]].push(lastval.t,(data[i].t+lastval.t)/2,data[i].t-1,null);
                lastval = data[i];
                if(! (lastval[y] in this.values)){
                    this.values[lastval[y]] = {color: lastval.color};
                    new_values.push(lastval[y]);
                }
                //color_n ++;
            }
        }
        if(!(lastval[y] in this.values)){
            this.values[lastval[y]] = {color: lastval.color};
            new_values.push(lastval[y]);
        }
        if(! (lastval[y] in result)){
            result[lastval[y]] = [];
        }
        result[lastval[y]].push(lastval.t,(data[data.length-1].t+lastval.t)/2,data[data.length-1].t-1,null);
        return [result, new_values];
    }

    getTextData (range){
        return this.getData(range);
    }

    setType (type){
        this.type = type;
    }

    setData (data){
        this.data = data;
    }

    getConfigInfo (){
        return [this.dbid,this.nodeId];
    }
}

//класс холста с графиками
class Chart
{
    constructor(name) 
    {
        this.name = name;
        this.is_chart_rendered = false;
        this.scales_units = new Map(); //данные об осях
        this.channels = [];
        this.axis_labels = []; //данные о подписях к осям
        var range = getDateTime();
        this.range = [range[0],range[1]];
        this.zoom_history = [];
        this.zoom_history_index = 0;
        this.type = null;
        this.displayed_channels_counter = 0;
    }

    //добавляет новый канал на холст
    addChannel (channel) {
        var result = this.channels.find(obj => {
            return ((obj.nodeId == channel.nodeId) && (obj.dbid == channel.dbid))
        })
        if (result) return;
        this.channels.push(channel);
        this.addScaleUnits(channel.units);
        var dateDate = [Date.parse(this.range[0]), Date.parse(this.range[1])];
        channel.checkIfMoreDataNeeded(dateDate);

        $(document).trigger("configIsChanged");
        //loadChannelDataObject(channel, this.range, this.name);
    }

    addZoomHistory (autosize) {
        var layout = this.getPlotlyDataLayout();
        var new_zoom = {xaxisrange:[layout.xaxis.range[0],layout.xaxis.range[1]],yaxisrange:[layout.yaxis.range[0],layout.yaxis.range[1]]};
        //если х и у совпадают
        if(JSON.stringify(this.zoom_history[this.zoom_history_index]) === JSON.stringify(new_zoom)) return;
        //если автосайз, записывать последнее значение
        if(autosize)
        {
            this.zoom_history = this.zoom_history.slice(0,this.zoom_history_index);
            this.zoom_history_index = this.zoom_history.push(new_zoom)-1;
        }
        else
        {
            //если y был null (дописать)
            this.zoom_history = this.zoom_history.slice(0,this.zoom_history_index+1);
            this.zoom_history_index = this.zoom_history.push(new_zoom)-1;
            //MAYBE WILL NEED THIS
            //if((this.zoom_history.length != 0) && synched) allChartsAddZoomHistory(this.name);
        }
        //console.log("addZoomHistory",charts);
    }
    setZoomHistory (zhistory) {
        this.zoom_history = zhistory[0];
        for(var i=0;i<this.zoom_history.length;i++)
        {
            this.zoom_history[i].yaxisrange = null;
        }
        this.zoom_history_index = zhistory[1];
    }
    getZoomHistory () {
        return [this.zoom_history,this.zoom_history_index];
    }
    //no conditions
    JustAddZoomHistory (basic_chart_history)
    {
        console.log("JustAddZoomHistory",this);
        var layout = this.getPlotlyDataLayout();
        if(!layout)
        {
            this.setZoomHistory(basic_chart_history);
        }
        else
        {
            var new_zoom = {xaxisrange:[layout.xaxis.range[0],layout.xaxis.range[1]],yaxisrange:[layout.yaxis.range[0],layout.yaxis.range[1]]};
            this.zoom_history = this.zoom_history.slice(0,this.zoom_history_index+1);
            this.zoom_history_index = this.zoom_history.push(new_zoom)-1;
        }
    }
    takeStepBack () {
        if(this.zoom_history_index > 0)
        {
            this.zoom_history_index--;
            var newrange = this.zoom_history[this.zoom_history_index];
            //console.log("takestepback");
            this.setXYRange(newrange.xaxisrange,newrange.yaxisrange);
        }
    }
    takeStepForward () {
        if(this.zoom_history_index < this.zoom_history.length-1)
        {
            this.zoom_history_index++;
            var newrange = this.zoom_history[this.zoom_history_index];
            this.setXYRange(newrange.xaxisrange,newrange.yaxisrange);
        }
    }
    clearZoomHistory () {
        //console.log("clearZoomHistory",this);
        if(this.zoom_history.length <= 1) return;
        this.zoom_history = [];
        this.zoom_history_index = 0;
        this.addZoomHistory(false);
    }


    getWidth () {
        return Math.ceil($("#" + this.name).width());
    }

    getHeight () {
        return Math.ceil($("#" + this.name).parent().height());
    }

    //оч важные данные, прямо из Plotly
    getPlotlyData(){
        var gd = document.getElementById(this.name);
        console.log("gddata",gd.data);
        console.log("gdlayout",gd.layout);
    }
    getPlotlyDataData ()
    {
        var gd = document.getElementById(this.name);
        return gd.data;
    }
    getPlotlyDataLayout ()
    {
        var gd = document.getElementById(this.name);
        return gd.layout;
    }

    getChannelPlotlyId(ch_fullname){
        var gd = document.getElementById(this.name);
        return gd.data.findIndex(x => x.name === ch_fullname);
    }

    getChannelByPlotlyId(id){
        var gd = document.getElementById(this.name);
        return this.channels.find(x => x.fullname === gd.data[id].name);
    }

    getChannels () {
        return this.channels;
    }

    getChannelsConfig () {
        var chan_config = [];
        for(var i = 0; i < this.channels.length; i++){
            chan_config.push(this.channels[i].getConfigInfo());
        }
        return chan_config;
    }

    setType(type){
        this.type = type;
    }

    getCurrentTextData (channel_names){
        var allChannelsData = {};
        var datetime = [Date.parse(this.range[0]), Date.parse(this.range[1])];
        for(var i = 0; i < this.channels.length; i++){
            if(channel_names.includes(this.channels[i].name)){
                allChannelsData[this.channels[i].name] = this.channels[i].getTextData(datetime);
            }
        }
        return allChannelsData;
    }

    //choose color for new scase
    chooseScaleColor ()
    {
        var colors = new Array(colors_table.length).fill(0);
        this.scales_units.forEach((value, key) => {
            var ind = colors_table.findIndex((el)=>el[0]==value.color);
            if(ind >= 0 && ind < colors.length) colors[ind]++;
        })
        const min = Math.min (...colors);
        const index = colors.indexOf(min);

        return colors_table[index][0];
    }

    //choose color for new line on plot
    chooseLineColor (scale_data, channels)
    {
        //console.log(scale_data,channels);;
        var ind = colors_table.findIndex((el)=>el[0]==scale_data.color);
        if(ind >= 0 && ind < colors_table.length)
        {
            var colors = new Array(colors_table[ind].length).fill(0)
            var color_tones = colors_table[ind];
            for(var i=0;i<channels.length;i++)
            {
                var ci = color_tones.findIndex((el)=>el==channels[i].color);
                if(ci >= 0 && ci < colors.length) colors[ci]++;
            }
            const min = Math.min (...colors);
            const index = colors.indexOf(min);

            return color_tones[index];
        }

        return colors_table[ind][0];
    }

    //add new scale 
    addScaleUnits (units){
        var scale_data = this.scales_units.get(units);
        if (!scale_data) {
            var scale_arr = Array.from(this.scales_units, ([name, value]) => (value));
            var scale_num = (this.scales_units.size == 0) ? 0 : scale_arr.reduce((acc,curr)=> acc.axis_n>curr.axis_n ? acc.axis_n:curr.axis_n,0);//this.scales_units.size;
            var color = this.chooseScaleColor();//colors_table[scale_num % colors_table.length][0];//
            
            scale_data = {
                color: color,
                axis_n: scale_num + 1,
                channel_counter: 1
            };
            this.scales_units.set(units, scale_data);
            countMaxScaleNum(this.name);
            return color;
        }
        else{
            scale_data.channel_counter++;
        }
    }

    //добавляет данные из БД, запоминает и отрисовывает
    addChannelData (json) {
        if (this.type == "orbit") {
            return false;
        }
        var channel = this.channels.find((element) => ((element.nodeId == json.nodeId) && (element.dbid == json.dbid)));
        var datetime = [Date.parse(json.datetime[0]), Date.parse(json.datetime[1])];
        channel.addData(json.data, datetime);

        if(this.type == "text"){
            this.drawTextData(channel,datetime);
        }
        else if(this.type == "timeseries"){
            this.drawChannelData(channel, datetime);
        }
        return true;
    }

    //добавляет график орбиты
    addOrbitData (json) {
        if (this.type == "timeseries" || this.type == "text") {
            return false;
        }
        /*if(this.type == null){
            this.type = "orbit";
        }*/
        
        var channel = this.channels.find((element) => ((element.nodeId == json.nodeId) && (element.dbid == json.dbid)));
        channel.setType('orbit');
        channel.setData(json.data);

        this.drawOrbitData(channel);

        return true;
    }

    drawOrbitData (channel){
        if (channel) {
            var data_to_display = channel.data;
            if (channel.displayed) {
                //this.removeLine()
            }
            else {
                if (!this.is_chart_rendered) {
                    this.renderChart(channel, data_to_display);
                }
                else {
                    this.addPlot(channel, data_to_display);
                };
            }
        }
        return true;
    }

    drawChannelData (channel, datetime) {
        var pixels = Math.ceil(this.getWidth() / (Date.parse(this.range[1]) - Date.parse(this.range[0])) * (datetime[1] - datetime[0]));
        if (channel) {
            var data_to_display = this.parseToChartData(channel.fullname, channel.getFilteredData(datetime, pixels));
            if(channel.data_tbl_type == "chan_id"){
                data_to_display = this.parseToDiscrChartData(data_to_display,datetime[1]);
            }
            if (channel.displayed) {
                this.extendLine(channel, data_to_display);
            }
            else {
                if (!this.is_chart_rendered) {
                    this.renderChart(channel, data_to_display);
                }
                else {
                    this.addPlot(channel, data_to_display);
                };
            }
        }
        return true;
    }

    drawTextData (channel,datetime){
        if (channel) {
            var [new_data,new_values] = channel.getSegmentedData(datetime);
            if (!this.is_chart_rendered) {
                this.renderTextChart();
                //this.addZoomHistory();
            }
            this.addNewTraces(new_values,channel.values);
            this.addDataToTraces(new_data,channel.values);
        }
        return true;
    }

    parseToChartData (channel, data) {
        var x = [];
        var y = [];
        data.forEach(element => {
            var date = new Date();
            date.setTime(element["t"]);
            x.push(date),
                y.push(element[channel])
        });
        return { x: x, y: y };
    }

    parseToDiscrChartData (data,end_time){
        var xnew = [];
        var ynew = [];
        for(var i=0; i < data.x.length; i++){
            xnew.push(data.x[i]);
            ynew.push(data.y[i]);
            if(i<data.x.length-1){
                xnew.push(data.x[i+1]);
                ynew.push(data.y[i]);
            }
            
        }
        var date = new Date();
        var endtime = date.setTime(end_time);
        var timenow = new Date().getTime();
        if(xnew[xnew.length-1]<endtime && endtime<timenow){
                xnew.push(endtime);
                ynew.push(ynew[ynew.length-1]);
            }
        return { x: xnew, y: ynew };
    }

    //дорисовываем текстовый график графиками
    addNewTraces (new_values,chan_vals){
        var new_traces = [];
        var line_id = Object.keys(chan_vals).length - new_values.length;
        for(var i=0;i<new_values.length;i++){
            new_traces.push({
                type: 'scatter',
                x: [],
                y: [],
                mode: 'lines',
                name: new_values[i],
                line: {
                    color: chan_vals[new_values[i]].color,
                }
            })
            chan_vals[new_values[i]].id = line_id;
            line_id++;
        }
        Plotly.addTraces(this.name, new_traces);
    }

    addDataToTraces (new_data,chan_vals){
        console.log("addDataToTraces",chan_vals,new_data);
        var ids = [];
        var ys = [];
        var xs = []
        for(var key in new_data){
            var line = new_data[key];
            xs.push(line);
            ys.push(new Array(line.length).fill(0.25));
            ids.push(chan_vals[key].id);
        }
        Plotly.extendTraces(this.name, { y: ys, x: xs }, ids);
    }

    //дорисовывает график
    extendLine (channel, data) {
        data.name = channel.fullname;
        var id = this.getChannelPlotlyId(channel.fullname);
        data.x.push(null);
        data.y.push(null);
        Plotly.extendTraces(this.name, { y: [data.y], x: [data.x] }, [id])
    }

    //перерисовать все графики
    redrawChannels (datetime, monitoring = false) {
        var dateDate = [Date.parse(datetime[0]), Date.parse(datetime[1])];

        var channels_by_plotly = this.getPlotlyDataData();
        if(channels_by_plotly == undefined) return;
        var length = channels_by_plotly.length;
        if(this.type == "text"){
            if(this.channels.length !=0){
                this.channels[0].checkIfMoreDataNeeded(dateDate, monitoring);
            }
            return;
        }
        for (var i = 0; i < length; i++) {
            this.removeLine(0);
        }
        for (var i = 0; i < this.channels.length; i++) {
            var channel = this.channels[i];
            channel.displayed = false;
            if(this.type=="orbit"){
                loadChannelDataObject(channel, datetime, this.name, monitoring);
            }
            else{
                this.drawChannelData(channel, dateDate);
                channel.checkIfMoreDataNeeded(dateDate, monitoring);
            }
        }
    }

    //создает пустое плотно
    renderTextChart (){
        this.is_chart_rendered = true;

        var domain_start = 0;
        if(synched) domain_start = max_scale_num - 1;

        var icon_left = {
            'width': 500,
            'height': 600,
            'path': 'M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z'
        }
        var icon_right = {
            'width': 500,
            'height': 600,
            'path': 'M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z'
        }
        var config = { modeBarButtonsToAdd: [
            {
                name: 'back',
                icon: icon_left,
                direction: 'up',
                click: function(gd) { takeStepBackOnChart($(gd).attr('id'));
            }},
            {
                name: 'forward',
                icon: icon_right,
                direction: 'up',
                click: function(gd) { takeStepForwardOnChart($(gd).attr('id'));
            }},
            {
            name: 'text',
            icon: Plotly.Icons.disk,
            direction: 'up',
            click: function(gd) { saveTextChartData($(gd).attr('id'));
            }}],
            responsive: true, 
            doubleClickDelay: 2000,
            //showEditInChartStudio: true,
            //plotlyServerURL: "https://chart-studio.plotly.com" 
        };
        var layout = {
            margin: { l: 20, r: 10, b: 40, t: 40 },
            xaxis: {
                range: this.range,
                domain: [domain_start/25, 1],
                showgrid: false,
                type: "date"
            },
            yaxis:{
                range: [0, 1],
                domain: [0, 0.9],
                showgrid: false,
                zeroline: false,
                showline: false,
                autotick: true,
                ticks: '',
                showticklabels: false
            },
            legend: {
                yanchor: "top",
                y: 1.5,
                xanchor: "left",
                x: 0,
                font: { size: 12 },
                orientation: "h"
            },
            showlegend: true
        };
        Plotly.react(this.name, [{x:[],y:[],name:'ll',color:'black'}], layout, config);/*.then(function (gd) {
            resizeObserver.observe(gd);
        });*/
        document.getElementById(this.name).on('plotly_relayout', (eventdata) => {
            this.loadNewDataAfterZoom(eventdata);
            console.log(this.name,eventdata);
            if(!("chart_zoomed_first" in eventdata))
            {
                if(!eventdata["autosize"])
                    setActivePlotByName(this.name);
                if((eventdata["yaxis.autorange"]) && ("xaxis.range" in eventdata))
                {
                    this.setRange(eventdata["xaxis.range"]);
                }
                this.addZoomHistory(eventdata.autosize);
                if(synched)
                {
                    eventdata["chart_zoomed_first"] = this.name;
                    relayoutAllPlots(eventdata);
                }
            }
            /*if (synched && !("chart_zoomed_first" in eventdata)) {
                setActivePlotByName(this.name);
                eventdata["chart_zoomed_first"] = this.name;
                relayoutAllPlots(eventdata);
            }*/
            $(document).trigger("zoomed");
        });
    }

    //отрисовывает полотно с первым графиком
    renderChart (channel, data) {
        this.is_chart_rendered = true;
        var scale_data = this.scales_units.get(channel.units);
        var chan_data = this.channels.find((element) => ((element.nodeId == channel.nodeId)&&(element.dbid==channel.dbid)));

        data.mode = channel.mode;//'markers';//
        data.name = channel.name;
        //if(this.type == "orbit") data.name = channel+":"+data.datetime;
        if (channel.fullname) data.name = channel.fullname;
        //auto generate line color with the right tone
        var color = scale_data.color;//colors_table[0][0];//hsvToHex(tones[0], 80, 80)
        chan_data.color = color;
        data.line = { color: color };
        scale_data.axis_n = 1;
        data.marker = { size: 3 };
        var domain_start = 0;
        if(synched) domain_start = max_scale_num - 1;

        if(this.type == "orbit"){
            data.error_y = {
                type: 'data',
                array: data.sigma,
                visible: true
            }
        }
        else{
            data.x.push(null);
            data.y.push(null);
        }
        this.axis_labels = [
            {
                xref: 'paper',
                yref: 'paper',
                x: -0.005,
                xanchor: 'top',
                y: 0.91,
                yanchor: 'bottom',
                text: channel.units,
                //textangle: -45,
                font: { color: color },
                showarrow: false
            }
        ];
        var chartData = [data];
        var icon_left = {
            'width': 500,
            'height': 600,
            'path': 'M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z'
        }
        var icon_right = {
            'width': 500,
            'height': 600,
            'path': 'M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z'
        }
        var config;
        if(this.type == "orbit")
            config = { modeBarButtonsToAdd: [
                {
                name: 'text',
                icon: Plotly.Icons.disk,
                direction: 'up',
                click: function(gd) { saveTextChartData($(gd).attr('id'));
                }}], 
                responsive: true, 
                doubleClickDelay: 2000,
            };
        else
        {
            config = { modeBarButtonsToAdd: [
                {
                    name: 'back',
                    icon: icon_left,
                    direction: 'up',
                    click: function(gd) { takeStepBackOnChart($(gd).attr('id'));
                }},
                {
                    name: 'forward',
                    icon: icon_right,
                    direction: 'up',
                    click: function(gd) { takeStepForwardOnChart($(gd).attr('id'));
                }},
                {
                name: 'text',
                icon: Plotly.Icons.disk,
                direction: 'up',
                click: function(gd) { saveTextChartData($(gd).attr('id'));
                }}], 
                responsive: true, 
                doubleClickDelay: 2000,
                //showEditInChartStudio: true,
                //plotlyServerURL: "https://chart-studio.plotly.com" 
            };
        }
        var layout = {
            legend: {
                yanchor: "top",
                y: 1.2,
                xanchor: "left",
                x: 0.04,
                font: { size: 12 },
                orientation: "h"
            },
            showlegend: true,
            margin: { l: 20, r: 10, b: 40, t: 40 },
            xaxis: {
                range: this.range,
                domain: [domain_start/25, 1],
                type: "date",
                gridwidth: 1,
                gridcolor: '#dbdbdb'
            },
            yaxis: {
                color: color,
                linecolor: color,
                domain: [0, 0.9],
                zerolinecolor: "#444",
                position: 0,
                gridwidth: 1,
                gridcolor: '#dbdbdb',
                //hoverformat: ",d",
                ticklabelposition: 'inside'
            },
            annotations: this.axis_labels
        };
        if (this.type == "orbit") {
            layout.xaxis = {
                domain: [0, 1],
                zeroline: false
            };
            //layout.showlegend = false;
        }
        Plotly.react(this.name, chartData, layout, config).then(function (gd) {
            resizeObserver.observe(gd);
        });

        document.getElementById(this.name).on('plotly_legenddoubleclick', function (data) {
                terminateChannel(data.curveNumber);
                return false;
            })
        if(this.type != "orbit"){
            document.getElementById(this.name).on('plotly_relayout', (eventdata) => {
                this.loadNewDataAfterZoom(eventdata);
                //console.log(this.name,eventdata);
                if(!("chart_zoomed_first" in eventdata))
                {
                    if(!eventdata["autosize"])
                        setActivePlotByName(this.name);
                    if((eventdata["yaxis.autorange"]) && ("xaxis.range" in eventdata))
                    {
                        this.setRange(eventdata["xaxis.range"]);
                    }
                    this.addZoomHistory(eventdata.autosize);
                    if(synched)
                    {
                        eventdata["chart_zoomed_first"] = this.name;
                        relayoutAllPlots(eventdata);
                    }
                }
                $(document).trigger("zoomed");
            });
        }
        chan_data.displayed = true;
    }

    //подгрузка новых данных в соответствии с зумом
    loadNewDataAfterZoom (eventdata) {
        if ('xaxis.range[0]' in eventdata) {
            //setActivePlotByName(this.name);
            //this.max_id = 0;
            this.redrawChannels([eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']]);
            //reloadChannels(this.channels,[eventdata['xaxis.range[0]'],eventdata['xaxis.range[1]']]);
        }
        else if('xaxis.range' in eventdata){
            this.redrawChannels([eventdata['xaxis.range'][0], eventdata['xaxis.range'][1]]);
        }
    }

    //удаляет линию графика с осями и пр.
    terminateChannel (id) {
        var channel = this.getChannelByPlotlyId(id);
        //удаляем канал из списка каналов холста
        this.channels.splice(this.channels.findIndex(c => c.name === channel.name), 1);
        if (this.channels.length == 0) {
            terminateChart(this.name);
            return;
        }
        Plotly.deleteTraces(this.name, id);
        //вычтем 1 из счетчика каналов на оси
        var scales_data = this.scales_units.get(channel.units);
        scales_data.channel_counter--;
        if (scales_data.channel_counter == 0) {
            //this.updateAxes();
            this.removeAxis(channel.units);
        }
        this.redrawChannels(this.range);
        $(document).trigger("channelsUpdated");
        $(document).trigger("configIsChanged");
    }

    //удаляет только линию графика
    removeLine (id) {
        Plotly.deleteTraces(this.name, id);
    }

    //сохраняет асинхронное состояние
    saveAsyncState () {
        this.last_async_range = [this.range[0],this.range[1]];
    }

    //возвращаемся в асинхронное состояние
    gotoAsyncState () {
        if(this.last_async_range){
            this.setRange([this.last_async_range[0],this.last_async_range[1]]);
            //this.range = [this.last_async_range[0],this.last_async_range[1]];
        }
    //    this.redrawChannels(this.range);*/
    }

    //устанавливает границы оси х
    setRange (time) {
        //console.log("setrange",this.name, time);
        this.range = [time[0],time[1]];
        if (this.is_chart_rendered ) {
            if( this.type != "orbit"){
                var domain_start = this.scales_units.size - 1;
                if(synched) domain_start = max_scale_num - 1;
                var relayout_data = {
                    xaxis: {
                        range: this.range,
                        domain: [domain_start / 25, 1],
                        type: "date"
                    }
                }
                Plotly.update(this.name, [], relayout_data) ;
            }
            this.redrawChannels(time);
            this.addZoomHistory(false);
        }
    }

    //устанавливает границы осей x и y
    setXYRange (x_range,y_range) {
        //console.log("setXYRange",this);
        this.range = [x_range[0],x_range[1]];
        if (this.is_chart_rendered ) {
            if( this.type != "orbit"){
                var domain_start = this.scales_units.size - 1;
                if(synched) domain_start = max_scale_num - 1;
                var relayout_data = {
                    xaxis: {
                        range: this.range,
                        domain: [domain_start / 25, 1],
                        type: "date"
                    }
                }
                if(y_range != null)
                {
                    relayout_data.yaxis = {
                        range: [y_range[0],y_range[1]]
                    }
                }
                Plotly.update(this.name, [], relayout_data) ;
            }
            this.redrawChannels(x_range);
        }
    }

    //изменяет домен оси х
    setDomain (domain_start){
        if(!this.is_chart_rendered) return;
        var relayout_data = {
            xaxis: {
                range: this.range,
                domain: [domain_start / 25, 1],
                type: "date"
            }
        }
        Plotly.update(this.name, [], relayout_data);
    }

    //возвращает границы оси х
    getRange () {
        //var start = (' ' + this.range[0]).slice(1);
        //var end = (' ' + this.range[1]).slice(1);
        return this.range;//[start,end];
    }

    //добавляет данные про все оси y в relayout_data
    updateYAxes (relayout_data){
        var scale_num = this.scales_units.size;
        for (var i = 0; i < scale_num; i++) {           /*axis_ind*/
            if(this.axis_labels.length>i){
                this.axis_labels[i].x = i / 25 - 0.005;
                var axis_color = this.axis_labels[i].font.color;
                var scales_data = this.scales_units.get(this.axis_labels[i].text);
                scales_data.axis_n = i+1;
                var yaxisname = "yaxis" + (i==0 ? "":(i+1));//(scales_data.axis_n==1 ? "":scales_data.axis_n);
                var ticklabelposition = (i == 0) ? "inside" : "outside";
                relayout_data[yaxisname] = {
                    //overlaying: "y",
                    color: axis_color,
                    linecolor: axis_color,
                    zerolinecolor: "#ccc",
                    anchor: 'free',
                    side: "left",
                    autorange: true,
                    showgrid: (scale_num>1) ? false : true,
                    gridwidth: 1,
                    gridcolor: '#dbdbdb',
                    ticklabelposition: ticklabelposition,
                    type:"linear",
                    position: i / 25
                };
                if(i!=0) relayout_data[yaxisname].overlaying = "y";
            }
            //if(scales_data.axis_n!=1) relayout_data[yaxisname].overlaying = "y";
        }
    }

    removeAxis (units) {
        //remove the scale
        if (this.type == "orbit") {
            return;
        }
        var axis_ind = this.axis_labels.findIndex((element) => (element.text == units));

        this.scales_units.delete(units);
        var scale_num = this.scales_units.size;
        var domain_start = scale_num - 1;
        countMaxScaleNum(this.name);
        if(synched){
            domain_start = max_scale_num - 1;
        }

        this.axis_labels.splice(axis_ind, 1);

        var relayout_data = {
            xaxis: {
                range: this.range,
                domain: [ domain_start / 25, 1],
                autorange: false,
                showgrid: (scale_num>1) ? false : true,
                gridwidth: 1,
                gridcolor: '#dbdbdb',
                type: "date"
            },
            annotations: this.axis_labels
        };
        this.updateYAxes(relayout_data,axis_ind);
        var yaxisname = "yaxis" + (scale_num==0 ? "":(scale_num+1));
        relayout_data[yaxisname] = null;
        
        Plotly.update(this.name, [], relayout_data);
    }

    //отрисовывает новый график на холсте
    addPlot (channel, data) {
        var scale_data = this.scales_units.get(channel.units);
        var axis_label = this.axis_labels.find((el) => el.text == channel.units);
        var chan_data = this.channels.find((element) => ((element.nodeId == channel.nodeId)&&(element.dbid==channel.dbid)));
        
        var chan_name = channel.name;
        if (channel.fullname) chan_name = channel.fullname;
        if (!axis_label) {
            //add new scale
            var scale_num = this.scales_units.size - 1;
            var domain_start = scale_num;
            if(synched) domain_start = max_scale_num - 1;
            //var yaxisname = "yaxis" + (scale_data.axis_n);
            var color = scale_data.color;
            if (chan_data.color == null) chan_data.color = color;
            var relayout_data = {
                xaxis: {
                    range: this.range,
                    domain: [domain_start / 25, 1],
                    autorange: false,
                    showgrid: false,
                    type: "date"
                },
                annotations: this.axis_labels
            };
            if (this.type == "orbit") {
                relayout_data.xaxis = {
                    domain: [scale_num / 25, 1],
                    zeroline: false
                }
            }
            this.axis_labels.push(
                {
                    xref: 'paper',
                    yref: 'paper',
                    x: scale_num / 25 - 0.005,
                    xanchor: 'top',
                    y: 0.91,
                    yanchor: 'bottom',
                    text: channel.units,
                    font: { color: color },
                    showarrow: false
                }
            )
            scale_data.axis_n = this.axis_labels.length;
            this.updateYAxes(relayout_data); 
            /*relayout_data[yaxisname] = {
                overlaying: "y",
                color: color,
                linecolor: color,
                zerolinecolor: "#ccc",
                anchor: 'free',
                side: "left",
                showgrid: false,
                position: scale_num / 25
            };
            //hide first yaxis grid
            if(scale_num==1){
                var axis_color = this.axis_labels[0].font.color;
                if(this.scales_units.get(this.axis_labels[0].text).axis_n == 1){
                    relayout_data["yaxis"] = {
                        showgrid: false,
                        domain: [0, 0.9],
                        zerolinecolor: "#444",
                        position: 0,
                        color: axis_color,
                        //overlaying: "y",
                        linecolor: axis_color,
                        anchor: 'free',
                        side: "left",
                        ticklabelposition: "inside",
                    };
                }
            }*/
            Plotly.update(this.name, [], relayout_data);
            //channel.setDisplayId(this.displayed_channels_counter);
            //this.displayed_channels_counter++;
        }
        else {
            if (chan_data.color == null) {
                chan_data.color = this.chooseLineColor(scale_data,this.channels);
            }
        }
        data.mode = channel.mode//'markers'; //type of plot
        data.name = chan_name;
        data.line = { color: chan_data.color };
        if(this.type=="orbit"){
            //data.name = chan_name;
            data.error_y = {
                type: 'data',
                array: data.sigma,
                visible: true
            }
            //data.opacity = 0.15;//opacity;
        }
        data.marker = { size: 3 }; //size of markers
        data.yaxis = "y" + scale_data.axis_n;
        if(this.type != "orbit"){
            data.x.push(null);
            data.y.push(null);
        }
        Plotly.addTraces(this.name, data);
        chan_data.displayed = true;
    }
}


//если у холста время выставлено дальше текущего, то догрузить
function monitorAllCharts() {
    for (var name in charts) {
        var chart = charts[name];
        if(chart.range.length >=1 && moment(chart.range[1])>moment()){
            charts[name].redrawChannels([chart.range[0],chart.range[1]],true);
        }
    }
}
//запуск мониторинга
function startMonitoring(){
    monitoringTimer = setInterval(function() {
        monitorAllCharts();
    }, 30 * 1000);
}

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

/*
function removeChanFromActivePlot(node, dbid) {
    if (activeplot) {
        charts[activeplot].removeChannel(node, dbid);
    }
}*/

//удаляет канал
function terminateChannel(id) {
    if (activeplot) {
        charts[activeplot].terminateChannel(id);
    }
}


//устанавливает промежуток времени на нужные холсты
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

//возвращает промежуток времени активного холста
function getActivePlotRange() {
    if (activeplot) {
        return charts[activeplot].getRange();
    }
}

// возвращает список каналов активного холста
function getActivePlotChanels() {
    if (activeplot) {
        return charts[activeplot].getChannels();
    }
    return [];
}

function getChartsConfig() {
    var charts_config = [];
    for (var chart in charts) {
        charts_config.push(charts[chart].getChannelsConfig());
    }
    return charts_config;
}

Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
};

//возвращает каналы всех холстов
/*function getAllPlotsChannels() {
    var channels = [];
    for (var chart in charts) {
        channels.concat(charts[chart].getChannels()).unique();
    }
    return channels;
}*/

//синхронизация всех холстов
function synchronizePlots() {
    if (activeplot) {
        var range = getDateTime();
        for (var chart in charts) {
            charts[chart].saveAsyncState();
        }
        for (var chart in charts) {
            charts[chart].setRange(range);
            charts[chart].clearZoomHistory();
        }
    }
}

//рассинхронизация всех холстов
function asynchronizePlots() {
    for (var chart in charts) {
        charts[chart].gotoAsyncState();
        charts[chart].clearZoomHistory();
    }
    $(document).trigger("asyncronized");
}

//распространяет зум на все холсты
function relayoutAllPlots(ed) {
    if("yaxis.range[0]" in ed){
        delete ed["yaxis.range[0]"];
    }
    if("yaxis.range[1]" in ed){
        delete ed["yaxis.range[1]"];
    }
    if(("xaxis.autorange" in ed)||("xaxis.range[0]" in ed)||("xaxis.range" in ed)){
        for (var chart in charts) {
            //if(ed.autosize) return;
            if(charts[chart].type == "orbit") {
                charts[chart].setRange(charts[ed.chart_zoomed_first].getRange());
            }
            else if(("chart_zoomed_first" in ed) && chart!=ed.chart_zoomed_first){
                //if(charts[chart].type=="orbit"){
                    charts[chart].setRange(charts[ed.chart_zoomed_first].getRange());
                //}
                //else {
                    var div = document.getElementById(chart);
                    if(div.layout){
                        var x = div.layout.xaxis;
                        if (ed["xaxis.autorange"] && x.autorange) return;
                        if (x.range[0] != ed["xaxis.range[0]"] || x.range[1] != ed["xaxis.range[1]"]) {
                            Plotly.relayout(div, ed);
                        }
                    }
                //}
                //charts[chart].addZoomHistory();
            }
        }
    }
}

//добавляет данные о канале согласно заказу
function addChannelDataInOrder(json) {
    var order = orders.filter(obj => { return obj.number === json.ordernum })[0];
    if(order == undefined) return;
    order.parts_num = json.parts;
    order.parts[json.index] = json;
    var i = 0;
    /*var loaded = true;

    for ( i=0; i <= order.parts_num; i++) {
        if (order.parts[i] == undefined) {
            loaded = false;
        }
    }
    i=0;*/
    
    if (order.last_displayed != null) i = order.last_displayed + 1;
    for (; i <= json.index; i++) {
        if (order.parts[i] != undefined) {
            addChannelData(order.parts[i], order.chart);
            order.last_displayed = i;
            //order.parts[i]=1;
        }
    }
    if //(loaded){
        (order.last_displayed == order.parts_num - 1) {
        var no_data = true;
        for (i = 0; i <= order.last_displayed; i++) {
            if (order.parts[i].data.length != 0) {
                no_data = false;
            }
        }
        if (no_data) {
            if(!order.monitoring)
                alertify.error("Sorry, no data to display for "+json.fullname);
        }
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
    if(order.last_displayed!=null) i=order.last_displayed+1;
    for(;i<=json.index;i++){
        if(order.parts[i]!=undefined){
            addGraphData(order.parts[i]);
            order.last_displayed = i;
            //order.parts[i]=1;
        }
    }
    if(order.last_displayed==order.parts_num-1)
    {
        var no_data = true;
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
function addChannelData(json, chart) {
    if (chart in charts) {
        charts[chart].addChannelData(json);
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
    if(json.data.length == 0){
        alertify.error("Sorry, no data to display "+json.fullname);
    }
    else{
        if (order.chart in charts) {
            if (!charts[order.chart].addOrbitData(json)) {
                /*var new_chart_n = addChartBeforeTarget($("#" + order.chart).parent());
                setActivePlotByName("chart_" + new_chart_n);
                charts["chart_" + new_chart_n].addOrbitData(json);*/
            }
        }
        else {
            alert("Can't find plot to display the data.");
            $(document).trigger("channelsUpdated");
            defaultCursor();
            //document.body.style.cursor = 'default';
        }
    }
    orders.splice(orders.indexOf(order), 1);
    defaultCursor();
}

//удаляет заказ
function removeOrder(ordernum) {
    var order = orders.filter(obj => { return obj.number === ordernum })[0];
    orders.splice(orders.indexOf(order), 1);
    defaultCursor();
}

function checkIfMonitoring(ordernum) {
    var order = orders.filter(obj => { return obj.number === ordernum })[0];
    //console.log("checkifmonitorn",ordernum,order);
    if(!order) return false;
    return order.monitoring;
}

//добавляет холст
function addChart(e) {
    addChartBeforeTarget(e.target);
}

//добавляет холст перед элементом DOM target
function addChartBeforeTarget(target,is_text=false) {
    chart_max_n++;
    var style = '';
    if(is_text) style = ' style="height:150px" ';
    $('<div id="graph' + chart_max_n + '"' + style 
        + ' class="resizable"><div id="chart_' + chart_max_n
        + '" class="pchart"></div><div class="close_chart"></div><div class="handle"></div></div>').insertBefore(target).resizable();
    charts["chart_" + chart_max_n] = new Chart("chart_" + chart_max_n);
    //if synched we have to copy zoom history to the new chart
    if(synched)
    {
        charts["chart_" + chart_max_n].setZoomHistory(Object.values(charts)[0].getZoomHistory());
    }
    return chart_max_n;
}

//обрабатывает событие закрытия холста
function closeChart(e) {
    var graph = $(e.target).parent().children(":first");
    var name = graph.attr("id");
    cancelOrders(name);
    terminateChart(name);
}

//удаляет холст
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
    $(document).trigger("configIsChanged");
}

//удаляет все холсты
function terminateAllPlots(){
    for (var chart in charts) {
        terminateChart(chart);
    };
}

//перезагрузка каждого графика
/*function reloadChannels(channels, time) {
    channels.forEach(function (channel) {
        //TODO:reloadallthegraphs    

        //channel.displayed = false;
        //removeLine(0);
        //loadChannelDataObject(channel,time);
    })
}*/

//работа с кодом цвета
/*function hslToHex(h, s, l) {
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
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    var rgb = result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
    return ""+ rgb.r + "," + rgb.g + "," + rgb.b;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}*/


//посылает запрос к серверу на данные о канале с помощью объекта канала channel_object
function loadChannelDataObject(channel_object, time, chartname, monitoring = false) {
    //console.log("loadChannelDataObject",chartname,time);
    var msg = {
        type: "get_full_channel_data",
        hierarchy: channel_object.hierarchy,
        datatable: channel_object.datatable,
        datetime: time,
        dbid: channel_object.dbid,
        //chart: plot,
        //pixels: getActivePlotWidth()-10,
        ordernum: orders_max_n
    };
    orders.push({
        number: orders_max_n,
        parts_num: null,
        chart: chartname,
        last_displayed: null,
        parts: [],
        monitoring: monitoring
    })
    orders_max_n++;
    //document.body.style.cursor = 'wait';
    if(!monitoring)
    {
        waitCursor();
    }
    sendMessageToServer(JSON.stringify(msg));
}

//посылает данные на сервер с запросом об отмене заказов холста chartname
function cancelOrders(chartname){
    var orders_to_cancel = orders.filter(order => order.chart == chartname);
    orders = orders.filter(order => order.chartname != chartname);
    var msg = {
        type: "cancel_orders",
        orders: orders_to_cancel.map(order => order.number)
    }
    sendMessageToServer(JSON.stringify(msg));
}

function cancelCurrentOrders(){
    if(orders.length == 0) return;
    var msg = {
        type: "cancel_orders",
        orders: orders.map(order => order.number)
    }
    sendMessageToServer(JSON.stringify(msg));
    orders = [];
    defaultCursor();
}

//обрабатывает событие нажатия кнопки синхронизации
/*function synchronizePlotsEvent(checkboxElem) {
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
}*/

//обрабатыавет событие изменения режима синхронизации
function handleSyncChange(src) {
    if (src.value == "sync") {
        if (!activeplot) {
            alert("Please select a canvas to sync all the plots");
            $("input[name=synchronization][value=async]").prop('checked', true);
        }
        else {
            synched = true;
            synchronizePlots();
        }
    } else {
        synched = false;
        asynchronizePlots();
    }
    checkMonitoringOption();
    $(document).trigger("configIsChanged");
}
function handleMonitoringChange(src){
    /*if(src.checked) startMonitoringMode(true);
    else startMonitoringMode(false);*/
}
function checkMonitoringOption(){
    if(synched) $("#monitoring").removeClass("hidden");
    else $("#monitoring").addClass("hidden");
}
function monitoringDropdownClicked(src)
{
    //console.log(src);
}

//подсчитывает самое большое число y-осей на всех холстах
function countMaxScaleNum(channel_name){
    var old = max_scale_num;
    max_scale_num = 0;
    for (var chname in charts) {
        var chart = charts[chname];
        if(chart&&(chart.scales_units.size>max_scale_num)) max_scale_num = chart.scales_units.size;
    }
    if(synched && (max_scale_num != old)){
        for (var chname in charts) {
            if(channel_name != chname){
                var chart = charts[chname];
                chart.setDomain(max_scale_num - 1);
            }
        }
    }
    return max_scale_num;
}

function isSynchedMode(){
    return synched;
}

function presetSynchedMode(synch){
    if(typeof(synch) == "boolean"){
        $("input[name=synchronization][value=sync]").prop('checked', synch);
        $("input[name=synchronization][value=async]").prop('checked', !synch);
        synched = synch;
    }
}

function addNewChart(){
    var id = addChartBeforeTarget($("#add_chart"));
    setActivePlotByName("chart_"+id);
}

function saveTextChartData(name){
    var chart = charts[name];
    chart_to_download_name = name;
    const dialog = document.getElementById("dialog");
    //create checklist
    for(var i=0;i<chart.channels.length;i++){
        $("#channels_dialog").append('<input type="checkbox" name="channels_list_dialog" value="'+chart.channels[i].name+'" /> '+chart.channels[i].fullname+'_.txt <br/>')
    }
    $("#channels_dialog").append('<br/>');
    dialog.showModal();
}

function takeStepBackOnChart(name)
{
    var chart = charts[name];
    if(isSynchedMode() && (chart.type != "orbit")) 
    {
        allChartsStepBack();
    }
    else
    {
        var chart = charts[name];
        chart.takeStepBack();
    }
}
function takeStepForwardOnChart(name)
{
        var chart = charts[name];
    if(isSynchedMode() && (chart.type != "orbit")) 
    {
        allChartsStepForward();
    }
    else
    {
        chart.takeStepForward();
    }
}
function allChartsStepBack()
{
    for (var name in charts) {
        var chart = charts[name];
        chart.takeStepBack();
    }
}
function allChartsStepForward()
{
    for (var name in charts) {
        var chart = charts[name];
        chart.takeStepForward();
    }
}
function allChartsAddZoomHistory(basic_chart_name)
{
    for (var name in charts) {
        var chart = charts[name];
        if(name != basic_chart_name)
            chart.JustAddZoomHistory(charts[basic_chart_name].getZoomHistory());
    }
}

function downloadChannelTxtFiles(){
    var chart = charts[chart_to_download_name];
    var range = chart.getRange();
    var channels_to_download = [];
    var markedCheckbox = document.getElementsByName('channels_list_dialog');  
    for (var checkbox of markedCheckbox) {  
      if (checkbox.checked)
        channels_to_download.push(checkbox.value);  
    }
    var timeformat = $("input[name='timeformat']:checked").val();
    //if ($("#timestamp_dialog").checked)
    var chartTextData = chart.getCurrentTextData(channels_to_download);
    for(var i=0;i<channels_to_download.length;i++){
        var name = channels_to_download[i];
        if(name in chartTextData){
            download(name+"-"+range[0]+"-"+range[1],convertChanDataToFileText(chartTextData[name],name,timeformat));
        }
    }
    closeChartDialog();
}

function closeChartDialog(){
    $("#channels_dialog").empty();
}

function convertChanDataToFileText(data,name,timeformat){
    var result = "";
    for(var i=0;i<data.length;i++){
        var time = data[i].t.toString();
        if(timeformat=="timestamp"){
            time = moment(data[i].t).format('YYYY-MM-DD HH:mm:ss');
        }
        result = result.concat(time+"   "+data[i][name]+"\n");
    }
    return result;
}

/*no need in this one
function preOpenCharts(length){
    for(var i=0;i<length-1;i++){
        addChartBeforeTarget($("#add_chart"));
    }
}*/
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
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
    synched = $('input[name="synchronization"]:checked').val() == 'sync' ? true : false;
    startMonitoring();
    checkMonitoringOption();
});




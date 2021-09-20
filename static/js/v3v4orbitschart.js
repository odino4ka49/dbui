var activechart = 'chart_1';
var chart_max_n = 2;
//var colors = ['#ff66ff','#b266ff','#66ffff','#66ffb2','#66ff66','#ffff66','#ffb266','#66b2ff'];
var colors = ['#fa8eb4','#b48efa','#62b4ec','#32d4b4','#b4ffb4','#b4d432','#ecb462','#ec62b4','#b4b4ff','#62ecb4']
var tones = [20];
var mousePosition;
var resizeObserver;

try{
    resizeObserver = new ResizeObserver(entries => {
        for (var entry of entries) {
            Plotly.Plots.resize(entry.target);
        }
    });
}
catch(error){
    alert("This browser is outdated. Some of the functions are not going to work. We recommend you to use Chrome 64+ or Firefox 69+ versions.");
}

function setActiveGraph(div){
    activechart = div.attr('id');
    //$(".graphset").children().removeClass('active');
    //div.parent().addClass('active');
}

function setActiveGraphByName(name){
    activechart = name;
    $(".graphset").children().removeClass('active');
    $("#"+name).parent().addClass('active');
}

function parseDates(dates){
    var result = [];
    dates.forEach(element => {
        result.push(new Date(element));
    });
    return result;
}

function getActiveGraphWidth(){
    return Math.ceil($("#"+activechart).width());
}

function addChannelToGraph(channel,graph){
    var chart = charts[graph];
    var new_chart_n = chart.name;
    if(channel.hierarchy!=null){
        if((channel.hierarchy.channel.orbit && chart.type=="timeseries")||(!channel.hierarchy.channel.orbit && chart.type=="orbit")){
            new_chart_n = addChartBeforeTarget($("#"+chart.name).parent());
            setActiveGraphByName("chart_"+new_chart_n);
        }
    }
    charts[graph].addChannel(channel);
}

function ChartChannel(name,hierarchy,datatable,dbid){
    this.name = name;
    this.hierarchy = hierarchy;
    this.datatable = datatable;
    this.dbid = dbid;
    this.id = null;
    this.displayed = false;
}

function Chart (name) {
        this.name = name;
        this.is_chart_rendered = false;
        this.scales_units = new Map();
        this.channels = [];
        this.axis_labels = [];
        this.range = [];
        this.max_id = 0;
    }

Chart.prototype.addChannel = function(channel){
    this.channels.push(channel);
}

Chart.prototype.getWidth = function(){
    return Math.ceil($("#"+this.name).width());
}

Chart.prototype.getHeight = function(){
    return Math.ceil($("#"+this.name).parent().height());
}

Chart.prototype.addGraphData = function(json){
    if(this.type=="orbit"){
        return false;
    }
    json.data.x = parseDates(json.data.x);
    var channel = this.channels.find((element)=>(element.name==json.name));
    var chan_name = json.name
    if(channel){ 
        if(channel.displayed){
            this.extendLine(chan_name,json.data,json.units,json.fullname)
        }
        else{
            if(!this.is_chart_rendered){
                this.type = "timeseries";
                this.renderChart(chan_name,json.data,json.units,json.mode,json.fullname);
            }
            else{
                this.addPlot(chan_name,json.data,json.units,json.mode,json.fullname);
            };
        }
    }
    return true;
}

Chart.prototype.addOrbitData = function(json){
    if(this.type=="timeseries"){
        return false;
    }
    this.type = "orbit";
    if(!this.is_chart_rendered){
        this.renderChart(json.name,json.data,json.units,json.mode,json.fullname,json.color);
    }
    else{
        this.addPlot(json.name,json.data,json.units,json.mode,json.fullname,json.color);
    };
    return true;
}

Chart.prototype.parseToArrayData = function(data){
    var result = []
    data.forEach(element => {
        result.push([parseInt(element["date_part"])*1000,element.v4_current]);
    });
    data = null;
    return result;
}

Chart.prototype.extendLine = function(channel,data,units){
    data.name = channel;
    var id = this.channels.find((element)=>(element.name==channel)).id;
    Plotly.extendTraces(this.name, {y:[data.y],x:[data.x]}, [id])
}


Chart.prototype.renderChart = function(channel,data,units,mode,fullname,color){
    this.is_chart_rendered = true;
    var chan_data = this.channels.find((element)=>(element.name==channel));
    chan_data.id = this.max_id;
    this.max_id++;
    data.mode = mode;//'markers';//
    data.name = channel;
    if(fullname) data.name = fullname;
    //auto generate line color with the right tone
    //var color = hsvToHex(100, 80, 80)
    data.line = { color: color }
    data.marker = {size:3}
    this.axis_labels = [
        {
            xref:'paper',
            yref:'paper',
            x: -0.02,
            xanchor:'top',
            y: 0.91,
            yanchor:'bottom',
            text: units,
            textangle: -45,
            //font: {color: color},
            showarrow: false
        }
    ];
    var chartData = [data];
    var config = {responsive: true,doubleClickDelay: 2000};
    var layout = {
        legend: {
            yanchor: "top",
            y: 1.2,
            xanchor: "left",
            x: 0.04,
            //traceorder: 'reversed',
            font: {size: 12},
            orientation: "h"
        },
        showlegend: true,
        margin: { l: 20, r: 10, b: 40, t: 40},
        xaxis: {
            range: this.range,
            domain: [0, 1],
            type: "date",
            //tickvals: 
        },
        yaxis: {
            //color: color,
            //linecolor: color,
            domain: [0, 0.9],
            zerolinecolor: "#444",
            position: 0
        },
        annotations: this.axis_labels
    };
    if(this.type=="orbit"){
        layout.xaxis= {
            domain: [0, 1]
        }
    }
    Plotly.react(this.name, chartData, layout, config).then(function(gd) {
        resizeObserver.observe(gd);
      });
    this.scales_units.set(units,{
        //color: color,
        axis_n: 1
    });
    document.getElementById(this.name).on('plotly_legenddoubleclick', function(data){
        terminatePlot(data.curveNumber)
        return false;
    });
    chan_data.displayed = true;
    chartData = null;
    transform_x_scale = null;
}

Chart.prototype.loadNewDataAfterZoom = function(eventdata){
    //console.log('zoom',this,eventdata);
    if('xaxis.range[0]' in eventdata){
        setActiveGraphByName(this.name);
        this.max_id = 0;
        reloadChannels(this.channels,[eventdata['xaxis.range[0]'],eventdata['xaxis.range[1]']]);
    }
}

//удаляет линию графика с осями и пр.
Chart.prototype.terminatePlot = function(id){
    //this.channels.splice(this.channels.findIndex((element)=>(element.id==id)), 1);
    //console.log(id,Plotly)
    Plotly.deleteTraces(this.name, id);
}

//удаляет только линию графика с готовностью к обновлению
Chart.prototype.removePlot = function(id){
    //this.channels.splice(this.channels.findIndex((element)=>(element.id==id)), 1);
    //console.log(id,this)
    Plotly.deleteTraces(this.name, id);
}

Chart.prototype.setRange = function(time){
    this.range = time;
    if(this.is_chart_rendered && this.type!="orbit"){
        var relayout_data = {
            xaxis: {
                range: this.range,
                domain: [(this.scales_units.size-1)/25,1],
                type: "date"
            }
        }
        Plotly.update(this.name,[], relayout_data);
    }
}

Chart.prototype.addPlot = function(channel,data,units,mode,fullname,color){
    var scale_data = this.scales_units.get(units);
    var chan_data = this.channels.find((element)=>(element.name==channel));
    chan_data.id = this.max_id;
    this.max_id++;
    if(fullname) channel = fullname;
    if(!scale_data){
        //add new scale
        var scale_num = this.scales_units.size;
        var yaxisname = "yaxis" + (scale_num+1);
        while(scale_num>=tones.length) nextTone();
        //var color = hsvToHex(100, 80, 80);
        var relayout_data = {
            xaxis: {
                range: this.range,
                domain: [scale_num/25,1],
                autorange: false,
                type: "date"
            },
            annotations: this.axis_labels
        };
        if(this.type=="orbit"){
            relayout_data.xaxis = {
                domain: [scale_num/25,1]
            }
        }
        relayout_data[yaxisname] = {
            overlaying: "y",
            //color: color,
            //linecolor: color,
            zerolinecolor: "#ccc",
            anchor: 'free',
            side: "left",
            position: scale_num/25
        };
        scale_data = {
            //color: color,
            axis_n: scale_num+1
        };
        this.scales_units.set(units,scale_data);
        this.axis_labels.push(
            {
                xref:'paper',
                yref:'paper',
                x: scale_num/25-0.02,
                xanchor:'top',
                y: 0.91,
                yanchor:'bottom',
                text: units,
                textangle: -45,
                //font: {color: color},
                showarrow: false
            }
        )
        Plotly.update(this.name,[], relayout_data);
        scale_num = null;
    }
    else{
        scale_data.color = hsvToHex(tones[scale_data.axis_n-1], getRandomInt(30,100), getRandomInt(40,100));
    }
    data.mode = mode//'markers'; //type of plot
    data.name = channel;
    data.line = {color: scale_data.color};
    data.marker = {size:3}; //size of markers
    data.yaxis = "y"+scale_data.axis_n;
    Plotly.addTraces(this.name, data);
    chan_data.displayed = true;
    scale_data = null;
}

var charts = {'v3v4i_chart': new Chart('v3v4i_chart'),'v3v4x_chart': new Chart('v3v4x_chart'),
'v3v4z_chart': new Chart('v3v4z_chart'),'v4i_chart': new Chart('v4i_chart'),
'v4x_chart': new Chart('v4x_chart'),'v4z_chart': new Chart('v4z_chart')}

function removePlot(id){
    if(activechart){
        charts[activechart].removePlot(id);
    }
}

function terminatePlot(id){
    if(activechart){
        charts[activechart].terminatePlot(id);
    }
}


//sets variable range of the active chart
function setRange(time){
    if(activechart){
        charts[activechart].setRange(time);
    }
}

function addGraphData(json){
    if(json.chart in charts){
        if(!charts[json.chart].addGraphData(json)){
            if(!charts[activechart].addGraphData(json)){
                var new_chart_n = addChartBeforeTarget($("#"+json.chart).parent());
                setActiveGraphByName("chart_"+new_chart_n);
                charts["chart_"+new_chart_n].addGraphData(json);
                new_chart_n = null;
            }
        }
    }
    else{
        //alert("Please choose a canvas to display the data");
        document.body.style.cursor='default';
    }
    json = null;
}

function addOrbitData(json){
    if(json.chart in charts){
        if(!charts[json.chart].addOrbitData(json)){
            var new_chart_n = addChartBeforeTarget($("#"+json.chart).parent());
            setActiveGraphByName("chart_"+new_chart_n);
            charts["chart_"+new_chart_n].addOrbitData(json);
            new_chart_n = null;
        }
    }
    else{
        alert("Please choose a canvas to display the data");
        document.body.style.cursor='default';
    }
    json = null;
}

function addChart(e){
    addChartBeforeTarget(e.target);
}

function addChartBeforeTarget(target){
    chart_max_n++;
    $('<div id="graph' + chart_max_n
    + '" class="resizable"><div id="chart_' + chart_max_n
    + '" class="pchart"></div></div>').insertBefore(target).resizable();
    charts["chart_" + chart_max_n] = new Chart("chart_" + chart_max_n);
    return chart_max_n;
}

function closeChart(e){
    var graph = $(e.target).parent().children(":first");
    var name = graph.attr("id");
    resizeObserver.unobserve(graph[0]);
    $(e.target).parent().remove();
    delete charts[name];
    if(activechart == name){
        activechart = null;
    }
    name = null;
}

function reloadChannels(channels,time){
    channels.forEach(function(channel){    
        channel.displayed = false;
        removePlot(0);
        loadChannelDataObject(channel,time);
    })
}

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

function hsvToHex(h,s,v){
    var hsv = {
        h: h,
        s: s,
        v: v
    };
    var c = Color( hsv );
    return c.toString();
}

function nextTone(){
    var size = tones.length;
    if(tones[size-1]+30 >= 360){
        tones.push(tones[size-1]+40-360);
    }
    else{
        tones.push(tones[size-1]+30);
    }
    return tones[size];
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

$(document).ready(function(){
    dragula([document.getElementById('graphset')], {
        moves: function (el, container, handle) {
          return handle.classList.contains('handle');
        },
        mirrorContainer: document.getElementById('mirror')
    });
    $("body").on("click",".pchart",function(){
        setActiveGraph($(this));
    });
    $("body").on("click",".close_chart",closeChart);
    $('.resizable').resizable();
    $('.resizable_hor').resizable({
        handles: 'e, w'
    });
    $("#add_chart").click(addChart);
});

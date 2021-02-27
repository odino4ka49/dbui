var activechart = 'chart_1';
var chart_max_n = 2;
//var colors = ['#ff66ff','#b266ff','#66ffff','#66ffb2','#66ff66','#ffff66','#ffb266','#66b2ff'];
var colors = ['#fa8eb4','#b48efa','#62b4ec','#32d4b4','#b4ffb4','#b4d432','#ecb462','#ec62b4','#b4b4ff','#62ecb4']
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
    $(".graphset").children().removeClass('active');
    div.parent().addClass('active');
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

function addChannelToGraph(channel){
    charts[activechart].addChannel(channel)
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
    if(channel){
        if(channel.displayed){
            this.extendLine(json.name,json.data,json.units)
        }
        else{
            if(!this.is_chart_rendered){
                this.type = "timeseries";
                this.renderChart(json.name,json.data,json.units,json.mode);
            }
            else{
                this.addPlot(json.name,json.data,json.units,json.mode);
            };
        }
    }
    return true;
}

Chart.prototype.addOrbitData = function(json){
    if(this.type=="timeseries"){
        return false;
    }
    if(!this.is_chart_rendered){
        this.type = "orbit";
        this.renderChart(json.name,json.data,json.units,json.mode);
    }
    else{
        this.addPlot(json.name,json.data,json.units,json.mode);
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
    //console.log(this.name,id)
    Plotly.extendTraces(this.name, {y:[data.y],x:[data.x]}, [id])
}

Chart.prototype.renderChart = function(channel,data,units,mode){
    this.is_chart_rendered = true;
    var chan_data = this.channels.find((element)=>(element.name==channel));
    chan_data.id = this.max_id;
    this.max_id++;
    data.mode = mode;//'markers';//
    data.name = channel;
    data.line = { color: colors[0] }
    data.marker = {size:3}
    this.axis_labels = [
        {
            xref:'paper',
            yref:'paper',
            x: -0.02,
            xanchor:'top',
            y: 1.01,
            yanchor:'bottom',
            text: units,
            textangle: -45,
            font: {color: colors[0]},
            showarrow: false
        }
    ];
    var chartData = [data];
    var config = {responsive: true};
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
            domain: [0, 1]
        },
        yaxis: {
            color: colors[0],
            linecolor: colors[0],
            zerolinecolor: "#444",
            position: 0
        },
        annotations: this.axis_labels
    };
    Plotly.react(this.name, chartData, layout, config).then(function(gd) {
        resizeObserver.observe(gd);
      });
    this.scales_units.set(units,{
        color: colors[0],
        axis_n: 1
    });
    document.getElementById(this.name).on('plotly_legenddoubleclick', function(data){
        removePlot(data.curveNumber)
        return false;
    }).on('plotly_relayout',(eventdata) => {
        this.loadNewDataAfterZoom(eventdata);
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

Chart.prototype.removePlot = function(id){
    //this.channels.splice(this.channels.findIndex((element)=>(element.id==id)), 1);
    //console.log(id,this)
    Plotly.deleteTraces(this.name, id);
}

Chart.prototype.setRange = function(time){
    this.range = time;
}

Chart.prototype.addPlot = function(channel,data,units,mode){
    var scale_data = this.scales_units.get(units);
    var chan_data = this.channels.find((element)=>(element.name==channel));
    chan_data.id = this.max_id;
    this.max_id++;
    if(!scale_data){
        var scale_num = this.scales_units.size;
        var yaxisname = "yaxis" + (scale_num+1);
        var relayout_data = {
            xaxis: {range:this.range,domain:[(this.scales_units.size)/25,1]},
            annotations: this.axis_labels
        };
        relayout_data[yaxisname] = {
            overlaying: "y",
            color: colors[scale_num],
            linecolor: colors[scale_num],
            zerolinecolor: "#ccc",
            anchor: 'free',
            side: "left",
            position: scale_num/25
        };
        scale_data = {
            color: colors[scale_num],
            axis_n: scale_num+1
        };
        this.scales_units.set(units,scale_data);
        this.axis_labels.push(
            {
                xref:'paper',
                yref:'paper',
                x: scale_num/25-0.02,
                xanchor:'top',
                y: 1.01,
                yanchor:'bottom',
                text: units,
                textangle: -45,
                font: {color: colors[scale_num]},
                showarrow: false
            }
        )
        Plotly.update(this.name,[], relayout_data);
        scale_num = null;
    }
    data.mode = mode//'markers'; //type of plot
    data.name = channel;
    data.line = {color: scale_data.color};
    data.marker = {size:3} //size of markers
    data.yaxis = "y"+scale_data.axis_n;
    Plotly.addTraces(this.name, data);
    chan_data.displayed = true;
    scale_data = null;
}

var charts = {'chart_1': new Chart('chart_1'),'chart_2': new Chart('chart_2')}

function removePlot(id){
    if(activechart){
        charts[activechart].removePlot(id);
    }
}

function setRange(time){
    if(activechart){
        charts[activechart].setRange(time);
        console.log("new range",time)
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
        alert("Please choose a canvas to display the data");
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
    + '" class="pchart"></div><div class="close_chart"></div><div class="handle"></div></div>').insertBefore(target).resizable();
    charts["chart_" + chart_max_n] = new Chart("chart_" + chart_max_n);
    return chart_max_n;
}

function closeChart(e){
    var name = $(e.target).parent().children(":first").attr("id");
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
    $("#add_chart").click(addChart);
});

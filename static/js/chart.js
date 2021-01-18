var activechart = 'chart_1';
var chart_max_n = 2;
//var colors = ['#ff66ff','#b266ff','#66ffff','#66ffb2','#66ff66','#ffff66','#ffb266','#66b2ff'];
var colors = ['#fa8eb4','#b48efa','#62b4ec','#32d4b4','#b4ffb4','#b4d432','#ecb462','#ec62b4','#b4b4ff','#62ecb4']

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

function Chart (name) {
        this.name = name;
        this.is_chart_rendered = false;
        this.scales_units = new Map();
        this.graphs = [];
        this.axis_labels = [];
        this.range = [];
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
    if(this.graphs.indexOf(json.name)>-1){
        this.extendLine(json.name,json.data,json.units)
    }
    else{
        this.graphs.push(json.name);
        if(!this.is_chart_rendered){
            this.type = "timeseries";
            this.renderChart(json.name,json.data,json.units,json.mode);
        }
        else{
            this.addPlot(json.name,json.data,json.units,json.mode);
        };
    }
    return true;
}

Chart.prototype.addOrbitData = function(json){
    if(this.type=="timeseries"){
        return false;
    }
    this.graphs.push(json.name);
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
    var id = this.graphs.indexOf(channel);
    Plotly.extendTraces(this.name, {y:[data.y],x:[data.x]}, [id])
}

Chart.prototype.renderChart = function(channel,data,units,mode){
    this.is_chart_rendered = true;
    data.mode = mode;//'markers';//
    data.name = channel;
    data.line = { color: colors[0] }
    data.marker = {size:3}
    this.axis_labels = [
        {
            xref:'paper',
            yref:'paper',
            x: 0,
            xanchor:'top',
            y: 1.07,
            yanchor:'bottom ',
            text: units,
            showarrow: false
        }
    ];
    var chartData = [data];
    var config = {responsive: true};
    var layout = {
        legend: {
            yanchor:"top",
            y:1,
            xanchor:"left",
            x:0.8,
            traceorder: 'reversed',
            font: {size: 16},
            bordercolor: "lightgray",
            borderwidth: 1
        },
        showlegend: true,
        margin: { l: 20, r: 10, b: 40, t: 40},
        xaxis: {
            range: this.range,
            domain: [0, 1]
        },
        yaxis: {
            linecolor: colors[0],
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
    });
    chartData = null;
    transform_x_scale = null;
}

Chart.prototype.removePlot = function(id){
    this.graphs.splice(id, 1);
    Plotly.deleteTraces(this.name, id);
    id = null;
}

Chart.prototype.setRange = function(time){
    this.range = time;
    /*if(this.is_chart_rendered){
        Plotly.relayout(
            this.name,
            {
                xaxis: {range:[time[0],time[1]]}
            }
        );
    }*/
}

Chart.prototype.addPlot = function(channel,data,units,mode){
    console.log(data);
    var scale_data = this.scales_units.get(units);
    if(!scale_data){
        var scale_num = this.scales_units.size;
        var yaxisname = Symbol("yaxis" + scale_num+1);
        scale_data = {
            color: colors[scale_num],
            axis_n: scale_num+1
        };
        this.scales_units.set(units,scale_data);
        this.axis_labels.push(
            {
                xref:'paper',
                yref:'paper',
                x: scale_num/25,
                xanchor:'top',
                y: 1.07,
                yanchor:'bottom ',
                text: units,
                showarrow:false
            }
        )
        Plotly.relayout(
            this.name,
            {
                yaxisname: {
                    overlaying: "y",
                    linecolor: colors[scale_num],
                    anchor: 'free',
                    side: "left",
                    position: scale_num/25
                },
                xaxis: {range:this.range,domain:[(this.scales_units.size-1)/25,1]},
                annotations: this.axis_labels
            }
        );
        scale_num = null;
    }
    data.mode = mode//'markers'; //type of plot
    data.name = channel;
    data.line = {color: scale_data.color};
    data.marker = {size:3} //size of markers
    data.yaxis = "y"+scale_data.axis_n;
    Plotly.addTraces(this.name, data);
    scale_data = null;
    console.log(mode);
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

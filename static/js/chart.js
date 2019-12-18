var activechart = 'chart_1';
var chart_max_n = 2;

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

class Chart {
    constructor(name) {
        this.name = name;
        this.is_chart_rendered = false;
        this.scales_units = new Map();
        this.graphs = [];//new Map();
    }

    addGraphData(json){
        if(this.type=="orbit"){
            return false;
        }
        //var graph = this.graphs.get(json.name);
        if(this.graphs.includes(json.name)){
            zingchart.exec(this.name, 'appendseriesvalues', {
                plotid: json.name,
                values: json.data
            });
        }
        else{
            this.graphs.push(json.name);//.set(json.name,json.data);
            if(!this.is_chart_rendered){
                this.type = "timeseries";
                this.renderChart(json.name,json.data,json.units);
            }
            else{
                this.addPlot(json.name,json.data,json.units);
            };
        }
        return true;
    }

    addOrbitData(json){
        if(this.type=="timeseries"){
            return false;
        }
        this.graphs.push(json.name);//this.graphs.set(json.name,json.data);
        if(!this.is_chart_rendered){
            this.type = "orbit";
            this.renderChart(json.name,json.data,json.units);
        }
        else{
            this.addPlot(json.name,json.data,json.units);
        };
        return true;
    }

    parseToArrayData(data){
        var result = []
        data.forEach(element => {
            result.push([parseInt(element["date_part"])*1000,element.v4_current]);
        });
        data = null;
        return result;
    }

    renderChart(channel,data,units){
        this.is_chart_rendered = true;
        var transform_x_scale = null;
        if(this.type == "timeseries"){
            transform_x_scale =  {
                type: 'date',
                all: '%D, %d %M<br>%H:%i:%s',
                itemsOverlap: true
            }
        }
        this.scales_units.set(units,"scale-x ,scale-y");
        var chartData = {
            type: 'line',
            legend: {
                'max-items': 5,
                'overflow': "scroll",
                'draggable': true
            },
            series: [
                { 
                    id: channel,
                    values: data,
                    text: channel,
                    scales: this.scales_units.get(units)
                }
            ],
            scaleX: {
                guide: {
                    lineColor: '#444',
                    lineStyle: 'solid',
                    visible: true
                },
                item: {
                    fontFamily: 'Open Sans'
                },
                transform: transform_x_scale,
                zooming: {
                    shared: true
                }
            },
            crosshairX: {
            plotLabel: {
                backgroundColor: '#bbb',
                fontColor: '#222',
                fontFamily: 'Open Sans',
                y: '0px'
            }
            },
            "scale-y-n":{
                zooming: true 
            },
            "scale-y":{
                label:{
                    "text": units
                }
            },
            scrollX:{

            },
            scrollY:{

            }/*,
            preview: {
                adjustLayout: true,
                borderColor: '#E3E3E5',
                label: {
                    fontColor: '#E3E3E5'
                },
                mask: {
                    backgroundColor: '#E3E3E5'
                }
            }*/
        };
        zingchart.complete = function() {
            document.body.style.cursor='default';
        };
        zingchart.render({
            id: this.name,
            data: chartData,
            height: "100%",
            width: "98%"
        });
        chartData = null;
        transform_x_scale = null;
    }

    removePlot(channel){
        this.graphs.splice(this.graphs.indexOf(channel), 1);//this.graphs.delete(channel);
        zingchart.exec(this.name, 'removeplot', {
            plotid: channel
        });
        channel = null;
    }

    addPlot(channel,data,units){
        if(!this.scales_units.get(units)){
            var scale_num = this.scales_units.size+1;
            var scale_data = {};
            scale_data["scale-y-"+scale_num] = {
                label:{
                    "text": units
                }
            };
            this.scales_units.set(units,"scale-x, scale-y-"+scale_num);
            zingchart.exec(this.name, 'modify', {
                data: scale_data
                    //this.chartData,
                //update: false
            })
            scale_num = null;
            scale_data = null;
        }
        zingchart.exec(this.name, 'addplot', {
            data : {
                id: channel,
                values: data,
                text: channel,
                scales: this.scales_units.get(units),
                update: false
            }
        });
    };
};

var charts = {'chart_1': new Chart('chart_1'),'chart_2': new Chart('chart_2')}

function removePlot(channel){
    if(activechart){
        charts[activechart].removePlot(channel);
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
    + '" class="zchart"></div><div class="close_chart"></div></div>').insertBefore(target).resizable();
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
    dragula([document.getElementById('graphset')]);
    $("body").on("click",".zchart",function(){
        setActiveGraph($(this));
    });
    $("body").on("click",".close_chart",closeChart);
    $('.resizable').resizable();
    $("#add_chart").click(addChart);
});
var activechart = 'chart_1';

function setActiveGraph(div){
    activechart = div.attr('id');
    $(".graphset").children().removeClass('active');
    div.parent().addClass('active');
}

class Chart {
    constructor(name) {
        this.name = name;
        this.is_chart_rendered = false;
        this.scales_units = new Map([
            ["Celsius degree", "scale-x, scale-y"],
            [null, "scale-x, scale-y-2"] 
        ]);
        this.graphs = new Map();
    }

    addGraphData(json){
        var graph = this.graphs.get(json.name);
        if(graph){
            zingchart.exec(this.name, 'appendseriesvalues', {
                plotid: json.name,
                values: json.data
            });
        }
        else{
            this.graphs.set(json.name,json.data);
            if(!this.is_chart_rendered){
                this.renderChart(json.name,json.data,json.units);
            }
            else{
                this.addPlot(json.name,json.data,json.units);
            };
        }
    }

    parseToArrayData(data){
        var result = []
        data.forEach(element => {
            result.push([parseInt(element["date_part"])*1000,element.v4_current]);
        });
        return result;
    }

    renderChart(channel,data,units){
        this.is_chart_rendered = true;
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
            transform: {
                type: 'date',
                all: '%D, %d %M<br>%H:%i:%s',
                itemsOverlap: true
            },
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
            scaleY:{
                label:{
                    "text": 'Celsius degree'
                }
            },
            scaleY2:{
            },
            preview: {
                adjustLayout: true,
                borderColor: '#E3E3E5',
                label: {
                    fontColor: '#E3E3E5'
                },
                mask: {
                    backgroundColor: '#E3E3E5'
                }
            }
        };
        zingchart.complete = function() {
            document.body.style.cursor='default';
        };
        zingchart.render({
            id: this.name,
            data: chartData,
            height: "100%",
            width: "100%"
        });
    }

    removePlot(channel){
        this.graphs.delete(channel);
        zingchart.exec(this.name, 'removeplot', {
            plotid: channel
        });
    }

    addPlot(channel,data,units){
        zingchart.exec(this.name, 'addplot', {
            data : {
                id: channel,
                values: data,
                text: channel,
                scales: this.scales_units.get(units)
            }
        });
    };
};

var charts = {'chart_1': new Chart('chart_1'),'chart_2': new Chart('chart_2')}

function removePlot(channel){
    charts[activechart].removePlot(channel);
}

function addGraphData(json){
    charts[activechart].addGraphData(json);
}

$(document).ready(function(){
    dragula([document.getElementById('graphset')]);
    $(".zchart").click(function(){
        setActiveGraph($(this));
    });
    $('.resizable').resizable({
        handles: 'n, e, s, w'
    });
});
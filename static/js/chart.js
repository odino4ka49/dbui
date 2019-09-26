var is_chart_rendered = false;
var scales_units = new Map([
    ["Celsius degree", "scale-x, scale-y"],
    [null, "scale-x, scale-y-2"] 
]);
var graphs = new Map();

function showChart(channel){
    //console.log(channel);
    //loadChannelData(channel);
}

/*
function parseToChartData(channel,data){
    var result = {
        "dates": [],
        "values": []  
    }
    data.forEach(element => {
        result.dates.push(parseInt(element["t"]));
        result.values.push(element[channel]);
    });
    return result;
}*/

function addGraphData(json){
    var graph = graphs.get(json.name);
    if(graph){
        //graph.set(json.index,json.data);
        zingchart.exec('test_zingchart', 'appendseriesvalues', {
            //graphid: 0,
            plotid: json.name,
            values: json.data
          });
    }
    else{
        //graph = new Map([json.index,json.data]);
        graphs.set(json.name,json.data);
        if(!is_chart_rendered){
            renderChart(json.name,json.data,json.units);
        }
        else{
            addPlot(json.name,json.data,json.units);
        };
    }
}

function parseToArrayData(data){
    var result = []
    data.forEach(element => {
        result.push([parseInt(element["date_part"])*1000,element.v4_current]);
    });
    return result;
}

function renderChart(channel,data,units){
    is_chart_rendered = true;
	$('.resizable').resizable({
        handles: 'n, e, s, w'
    });
    var chartData = {
        type: 'line',  // Specify your chart type here.
        legend: {
            'max-items':5,
            'overflow': "scroll",
            'draggable': true
        }, // Creates an interactive legend
        series: [  // Insert your series data here.
            { 
                id: channel,
                values: data,
                text: channel,
                scales: scales_units.get(units)
            }
        ],
        scaleX: {
          //values: data.dates,
          guide: {
            lineColor: '#444',
            lineStyle: 'solid',
            visible: true
          },
          item: {
            fontColor: '#ddd',
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
    zingchart.render({ // Render Method[3]
        id: 'test_zingchart',
        data: chartData,
        height: "100%",
        width: "100%"
    });
    /*zingchart.bind('test_zingchart', 'legend_marker_click', function(e) {
        removePlot(e.plotid)
    });
    zingchart.bind('test_zingchart', 'legend_item_click', function(e) {
        removePlot(e.plotid);
    });*/
}



function removePlot(channel){
    graphs.delete(channel);
    zingchart.exec('test_zingchart', 'removeplot', {
        plotid: channel
    });
}


function addPlot(channel,data,units){
    zingchart.exec('test_zingchart', 'addplot', {
        data : {
            id: channel,
            values: data,
            text: channel,
            scales: scales_units.get(units)
        }
    });
};

$(document).ready(function(){
    dragula([document.querySelector('#graph1'), document.querySelector('#graph2')]);
});
function showChart(channel){
    //console.log(channel);
    //loadChannelData(channel);
}

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
}

function parseToArrayData(data){
    var result = []
    data.forEach(element => {
        result.push([parseInt(element["date_part"])*1000,element.v4_current]);
    });
    return result;
}

function renderChart(channel,data){
    var rightData = parseToChartData(channel,data);
    var chartData = {
        type: 'line',  // Specify your chart type here.
        legend: {}, // Creates an interactive legend
        series: [  // Insert your series data here.
            { 
                values: rightData.values,
                text: channel
            }
        ],
        scaleX: {
          values: rightData.dates,
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
        scaleY:{
          zooming: true 
        },
      };
    zingchart.complete = function() {
        document.body.style.cursor='default';
    };
    zingchart.render({ // Render Method[3]
        id: 'test_zingchart',
        data: chartData,
        height: 700,
        width: 900
    });
}

function loadTestChartData(){
    //renderHighchart();
    $.ajax({
        type: 'GET',
        url: '/get_test_data/',
        datatype: 'json',
        success: function(data){
            //wsServer.sendData(data);
        }
    })
}

function renderHighchart(){
    var myChart = Highcharts.chart('test_highcharts', {
        chart: {
            type: 'bar'
        },
        title: {
            text: 'Fruit Consumption'
        },
        xAxis: {
            categories: ['Apples', 'Bananas', 'Oranges']
        },
        yAxis: {
            title: {
                text: 'Fruit eaten'
            }
        },
        series: [{
            name: 'Jane',
            data: [1, 0, 4]
        }, {
            name: 'John',
            data: [5, 7, 3]
        }]
    });
}
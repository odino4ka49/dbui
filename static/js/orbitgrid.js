var v3v4channames;
var v3v4pkps;

function formatDate(d){
    return d.getFullYear()+"."+d.getMonth().toString().padStart(2, "0")+"."+d.getDate().toString().padStart(2, "0")+" "+d.getHours().toString().padStart(2, "0")+":"+d.getMinutes().toString().padStart(2, "0")+":"+d.getSeconds().toString().padStart(2, "0");
}

function dataToW2Data(data){
    for(let i=1;i<=data.length;i++){
        data[i-1].recid = i;
        data[i-1].t = formatDate(new Date(data[i-1].t));
    }
    return data;
}

function refreshV3V4OrbitTable(data){
    console.log(data);
    $('#date_time_table').w2grid({
        name: 'grid',
        header: 'Orbits V3V4',
        columns: [
            { field: 't', text: 'Date Time', size: '70%' },
            { field: 'name', text: 'Chan name', size: '30%' }
        ],
        records: dataToW2Data(data),
        onClick: function(event) {
            displayOrbit(this.get(Number(event.recid)));
        }
    });
}

function setV3V4OrbitsNames(data){
    v3v4channames = data;
    console.log(data);
}

function setV3V4PkpData(data){
    v3v4pkps = data;
    console.log(data);
}

function displayOrbit(channel){
    if(!activechart){
        alert("Please choose a canvas to display the data");
        return;
    }
    console.log(channel)
    var channel_object = new ChartChannel(channel.fullname+" "+channel.t,null,null,null);
    addChannelToGraph(channel_object);
    var data = {
        "name": channel_object.name,
        "data": parseToOrbitData(channel_object.name,channel.value,v3v4pkps),
        "units": "mm",
        "chart": activechart,
        "mode": getMode()
    }
    addOrbitData(data);
}


function parseToOrbitData(channel,data,azimuths){
    var x = [];
    var y = [];
    data.forEach((element,i) => {
        x.push(azimuths[i].azimuth),
        y.push(element)
    });
    return {x: x,y: y};
}
var v4channames;
var v3v4pkps;
var v3v4basicdata = {
    "v3v4": { 
        loaded: false,
        system: "orbits v3v4chan",
        azimuths: []
    },
    "v4": { 
        loaded: false,
        system: "orbits v4",
        azimuths: []}
    };

function formatDate(d){
    return d.getFullYear()+"."+(d.getMonth()+1).toString().padStart(2, "0")+"."+d.getDate().toString().padStart(2, "0")+" "+d.getHours().toString().padStart(2, "0")+":"+d.getMinutes().toString().padStart(2, "0")+":"+d.getSeconds().toString().padStart(2, "0");
}

function dataToW2Data(data){
    for(let i=1;i<=data.length;i++){
        data[i-1].recid = i;
        data[i-1].t = formatDate(new Date(data[i-1].t-25200000));
    }
    return data;
}

function parseToTableData(data){
    var result = [];
    data.forEach(function(elem){
        v4channames.forEach(function(v4){
            result.push({
                't':elem.t,
                'name':v4.name,
                'fullname':v4.fullname,
                'value':elem[v4.name]
            })
        })
    })
    console.log("parsed",result);
    return result;
}

function refreshV3V4OrbitTable(system,data){
    if(v3v4basicdata[system].loaded==false){
        createV3V4OrbitTable(system,data);
        return;
    }
    w2ui[system].clear();
    w2ui[system].add(dataToW2Data(data));
}

function createV3V4OrbitTable(system,data){
    console.log("tabledata",data);
    $('#'+system).w2grid({
        name: system,
        header: 'Orbits V3V4',
        show: { 
            toolbar: true
        },
        multiSearch: true,
        searches: [
            { field: 't', text: 'Date Time', type: 'text' },
            { field: 'name', text: 'Chan Name', type: 'text' }
        ],
        columns: [
            { field: 't', text: 'Date Time', size: '70%', sortable: true},
            { field: 'name', text: 'Chan name', size: '30%', sortable: true }
        ],
        records: dataToW2Data(data),
        onClick: function(event) {
            displayOrbit(system,this.get(Number(event.recid)));
        },
        onReload: function(event) {
            loadSystemTable(system)
        }
    });
    v3v4basicdata[system].loaded = true;
}

function setV4OrbitsNames(data){
    v4channames = data;
    console.log("v4names",data);
}

function setV3V4PkpData(system,data){
    console.log(system,v3v4basicdata);
    v3v4basicdata[system].azimuths = data;
    console.log("v3v4pkps",data);
}

function displayOrbit(system,channel){
    if(!activechart){
        alert("Please choose a canvas to display the data");
        return;
    }
    console.log(channel)
    var channel_object = new ChartChannel(channel.fullname+" "+channel.t,null,null,null);
    addChannelToGraph(channel_object);
    var data = {
        "name": channel_object.name,
        "data": parseToOrbitData(channel_object.name,channel.value,v3v4basicdata[system].azimuths),
        "units": channel.unit,
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

function openNewTab(event){
    $('#'+event.target).show();
    if(event.target=="v3v4"){
        $("#v4").hide();
    }
    else {
        $("#v3v4").hide();
    }
    if(v3v4basicdata[event.target].loaded==false){
        loadSystemTable(event.target);
    }
}


$(function () {
    $('#tabs').w2tabs({
        name: 'tabs',
        active: 'v3v4',
        tabs: [
            { id: 'v3v4', text: 'V3V4Chan' },
            { id: 'v4', text: 'V4' }
        ],
        onClick: function (event) {
            openNewTab(event)
        }
    });
});

function loadSystemTable(system_id){
    sendMessageToServer(JSON.stringify({
        type: "v3v4chan_orbits_data",
        system: system_id,
        datetime: getDateTime()
    }))
}
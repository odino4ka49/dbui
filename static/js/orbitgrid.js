var v4channames;
var v3v4basicdata = {
    "v3v4": { 
        loaded: false,
        system: "orbits v3v4chan",
        timepicker: new TimePicker("#v3v4dtr"),
        azimuths: [],
        firstrec: null,
        grid: null
    }/*,
    "v4": { 
        loaded: false,
        system: "orbits v4",
        timepicker: new TimePicker("#v4dtr"),
        azimuths: [],
        firstrec: null
    }*/
};

function formatDate(d){
    return d.getFullYear()+"."+(d.getMonth()+1).toString().padStart(2, "0")+"."+d.getDate().toString().padStart(2, "0")+" "+d.getHours().toString().padStart(2, "0")+":"+d.getMinutes().toString().padStart(2, "0")+":"+d.getSeconds().toString().padStart(2, "0");
}

function getTimePicker(system){
    return v3v4basicdata[system].timepicker;
}

//приведение данных к надлежащему виду для библиотеки
function dataToW2Data(data){
    for(let i=1;i<=data.length;i++){
        data[i-1].recid = i;
        data[i-1].t = formatDate(new Date(data[i-1].t-25200000));
    }
    return data;
}

//приведение данных к надлежащему виду для таблицы
function parseToTableData(system,data){
    //only time:
    if(system=="v4"){
        var result = [];
        data.forEach(function(elem){
            var objects = [];
            //var values = [];
            //elem.type = elem.name.substr(2);
            v4channames.forEach(function(v4){
                var object = objects.find(x => x.type === v4.name.substr(0,2))
                if(!object){
                    object = {
                        t:elem.t,
                        values:[],
                        type:v4.name.substr(0,2)
                    }
                    objects.push(object);
                }
                object.values.push({
                    'name':v4.name,
                    'fullname':v4.fullname,
                    'value':elem[v4.name]
                });
            });
            result.push.apply(result,objects);
            //elem.values = values;
        })
        return result;
    }
    else if(system=="v3v4"){
        var result = [];
        var prev_t = "";
        var row = {};
        data.forEach(function(elem){
            if(Math.floor(elem.t)!=Math.floor(prev_t)){
                prev_t = elem.t;
                row = {t:elem.t,values:[],type:elem.name[0]};
                result.push(row);
            }
            row.values.push({
                'name':elem.name,
                'fullname':elem.fullname,
                'value':elem.value
            });
        })
        return result;
    }
    //with the names of channels
    /*var result = [];
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
    return result;*/
}

function initV3V4Time(system,time){
    var start = time-21600000;
    if(v3v4basicdata[system].firstrec>start){
        start = v3v4basicdata[system].firstrec
    }
    if(v3v4basicdata[system].loaded==false){
        v3v4basicdata[system].timepicker.init(new Date(start-25200000),null,new Date(v3v4basicdata[system].firstrec-25200000),new Date(time-25200000),true,v3v4basicdata[system].av_days);
        //v3v4basicdata[system].timepicker.init(new Date(start-25200000),new Date(time-25200000),new Date(v3v4basicdata[system].firstrec-25200000),new Date(time-25200000),true);
    }
}

//приводит дату к строке вида YYYY-MM-DD
function formatCalendarDates(dates){
    var result = [];
    for(var i=0;i<dates.length;i++){
        result.push(dates[i].date_trunc.slice(0,10));
    }
    return result;
}

//сохраним данные о доступных датах
function setV3V4Calendar(system,dates){
    v3v4basicdata[system].av_days = formatCalendarDates(dates.data);
}

function setFirstRecTime(system,time){
    v3v4basicdata[system].firstrec = time;
}

//обновление таблицы
function refreshV3V4OrbitTable(system,data){
    if(v3v4basicdata[system].loaded==false){
        createV3V4OrbitTable(system,data);
       // v3v4basicdata[system].timepicker.init(new Date(data[0].t));
        v3v4basicdata[system].loaded = true;
        return;
    }
    w2ui[system].clear();
    w2ui[system].add(dataToW2Data(data));
}

//создание таблицы
function createV3V4OrbitTable(system,data){
    //("tabledata",data);
    v3v4basicdata[system].grid = $('#'+system).w2grid({
        name: system,
        header: 'Orbits V3V4',
        show: { 
            toolbar: true,
            selectColumn: true
        },
        multiSearch: true,
        multiSelect: true,
        searches: [
            { field: 't', text: 'Date Time', type: 'text' },
            { field: 'type', text: 'Polarity', type: 'text' }
            //{ field: 'name', text: 'Chan Name', type: 'text' }
        ],
        columns: [
            { field: 't', text: 'Date Time', size: '70%', sortable: true},
            { field: 'type', text: 'Polarity',  size: '30%', sortable: true}//,
            //{ field: 'name', text: 'Chan name', size: '30%', sortable: true }
        ],
        records: dataToW2Data(data),
        onSelect/*Click*/: function(event) {
            displayOrbit(system,this.get(Number(event.recid)));
        },
        onReload: function(event) {
            loadSystemTable(system)
        },
        onUnselect: function(event) {
            /*event.stopPropagation();
            event.preventDefault();
            return false;*/
        }
    });
    //v3v4basicdata[system].loaded = true;
}

function reloadGrids(){
    loadSystemTable("v3v4");
    //loadSystemTable("v4");
}

function setV4OrbitsNames(data){
    v4channames = data;
    //console.log("v4names",data);
}

function setV3V4PkpData(system,data){
    v3v4basicdata[system].azimuths = {azimuths:[],pkps:[]};
    //v3v4basicdata[system].azimuths = data;
    data.forEach(function(element){
        v3v4basicdata[system].azimuths.azimuths.push(element.azimuth);
        v3v4basicdata[system].azimuths.pkps.push(element.pkp_name);
    })
    //console.log("v3v4pkps",v3v4basicdata[system].azimuths);
}

//отрисовка орбит на графиках
function displayOrbit(system,channel){
    //console.log("orbit",channel)
    var color = hsvToHex(100, 80, 80);
    channel.values.forEach(function(chan){
        var graph_name = system+chan.name.slice(-1)+"_chart";
        var channel_object = new ChartChannel(chan.fullname+" "+channel.t,null,null,null);
        addChannelToGraph(channel_object,graph_name);
        var data = {
            "name": channel_object.name,
            "data": parseToOrbitData(channel_object.name,chan.value,v3v4basicdata[system].azimuths),
            "units": chan.name.slice(-1)=='i' ? "mA" : "mm",
            "chart": graph_name,
            "color": color,
            "mode": getMode()
        }
        addOrbitData(data);
    })
}


function parseToOrbitData(channel,data,azimuths,pkps){
    //var x = [];
    var x = azimuths.azimuths;
    var y = [];
    data.forEach((element,i) => {
        //x.push(azimuths[i].azimuth),
        y.push(element)
    });
    return {x: x,y: y,text:azimuths.pkps};
}

//переключение между системами
function openNewTab(event){
    $('#'+event.target).show();
    $('#'+event.target+'_graphset').show();
    $('#'+event.target+'dtr').show();
    if(event.target=="v3v4"){
        $("#v4").hide();
        $("#v4_graphset").hide();
        $("#v4dtr").hide();
    }
    else {
        $("#v3v4").hide();
        $("#v3v4_graphset").hide();
        $("#v3v4dtr").hide();
    }
    if(v3v4basicdata[event.target].loaded==false){
        loadStartSystemTable(event.target);
        //v3v4basicdata[event.target].loaded==true;
    }
}

function setActiveTab(system_id){
    w2ui['tabs'].click(system_id);
}

//создание табов для систем
function setTabs(system_id) {
    $('#tabs').w2tabs({
        name: 'tabs',
        //active: system_id,
        tabs: [
            { id: 'v3v4', text: 'V3V4Chan' },
            //{ id: 'v4', text: 'V4', disabled: true }
        ],
        onClick: function (event) {
            openNewTab(event)
        }
    });
    w2ui['tabs'].click(system_id);
}

function loadStartSystemTable(system_id){
    if(system_id=='v4') return;
    sendMessageToServer(JSON.stringify({
        type: "v3v4chan_orbits_start_data",
        system: system_id
    }))
}

function loadSystemTable(system_id){
    var datetime = v3v4basicdata[system_id].timepicker.getDateTime();
    datetime[1] = moment(datetime[1]).add(6, 'hours').format('YYYY-MM-DD HH:mm:ss');
    //console.log("loadSystemTable",v3v4basicdata[system_id].timepicker.getDateTime())
    sendMessageToServer(JSON.stringify({
        type: "v3v4chan_orbits_data",
        system: system_id,
        datetime: datetime
    }))
}


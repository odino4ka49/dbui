const dbc = require('./dbconnection')
const tm = require('./dbstructure')

var databases = new Map();

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000));
    return this;
}

/*function parseToChartData(channel,data){
    var x = [];
    var y = [];
    data.forEach(element => {
        var date = new Date();
        date.setTime(element["t"]);
        //result.push([parseInt(element["t"]),element[channel]]);
        x.push(date),
        y.push(element[channel])
    });
    return {x: x,y: y};
}*/

//оставим только моменты изменения значений канала
function removeSimilar(data,y){
    if (!data || data.length == 0) {
        return [];
    }
    var result = [];
    var lastval = data[0];
    result.push(lastval);
    for (var i = 0; i < data.length; i++) {
        if(data[i][y]!=lastval[y]){
            lastval = data[i];
            result.push(lastval);
        }
    }
    lastval = data[data.length-1];
    lastval.t = lastval.t-1;
    result.push(lastval);
    return result;
}

//применяет к данным data канала name функцию func 
function applyMath(func,data,name){
    if(func == "dispersion"){
        var x0_data = data.find(element => !(element[name].every(el => isNaN(el))));
        var x0;
        if(x0_data){
            var x0 = x0_data[name];
        }
        else{
            return [];
        }
        var N = x0.length;
        var result = [];
        for(var i=0;i<data.length;i++){
            var num = 0;
            var squared = [];
            for(var j=0;j<N;j++){
                var item = data[i][name][j];
                if(!isNaN(item)){
                    squared.push((item-x0[j])**2);
                    num++;
                } 
            }
            var disp = {t:data[i].t};
            disp[name] = Math.sqrt((squared.reduce((a, b) => a + b, 0))/num);
            result.push(Object.assign({}, disp));
        }
        return result;
    }
}

function findAverage(my_arr){
    var summa = 0;
    var summa_2 = 0;
    var kolichestvo = 0;
    for(var i=0;i<my_arr.length;i++){
        var x = my_arr[i];
        if(x){
            summa += x;
            summa_2 += x*x;
            kolichestvo += 1;
        }
    }
    if(kolichestvo==0){
        return [null,null];
    }
    var srednee = summa/kolichestvo;
    var srednee_2 = summa_2/kolichestvo;
    var otklonenie = (srednee_2 - srednee**2)**0.5;
    return [srednee,otklonenie];
}

//returns just medium, переводит данные data в орбитные для лучшего отображения ввиде списка объектов {x - азимут, y - среднее значение, sigma - среднеквадратическкое отклонение}
function parseToOrbitData(channel,data,azimuths){
    //var records = [];
    var x = [];
    var y = [];
    var y_res = [];
    var sigma = [];
    var len = azimuths.length;
    for(var i=0;i<len;i++){
        x.push(azimuths[i].azimuth);
        y.push([]);
    }
    for(var j=0;j<data.length;j++){
        data[j][channel].forEach((element,i) => {
            y[i].push(element);
        });
    }
    for(var i=0;i<len;i++){
        var result = findAverage(y[i]);
        y_res.push(result[0]);
        sigma.push(result[1]);
    }
    return {x: x,y: y_res,sigma:sigma};
    /*var error = [];
    var counter = [];
    var len = data[0][channel].length;
    for(var i=0; i<len;i++){
        y.push(0);
    }
    for(var i=0;i<azimuths.length;i++){
        x.push(azimuths[i].azimuth)
    }
    for(var j=0;j<data.length;j++){
        data[j][channel].forEach((element,i) => {
            if(element){
                y[i]+=element;
                counter++;
            }
        });
    }
    for(var i=0; i<len;i++){
        y.push(0);
    }*/
    //return records;
}

//returns all data as arrays
/*function parseToOrbitData(channel,data,azimuths){
    var records = [];
    for(var j=0;j<data.length;j++){
        var x = [];
        var y = [];
        data[j][channel].forEach((element,i) => {
            x.push( azimuths[i].azimuth),
            y.push(element)
        });
        records.push({x: x,y: y,datetime:data[j]['date_time']});
    }
    return records;
}*/

/*function parseToOrbitData(channel,data,azimuths){
    var x = [];
    var y = [];
    var z = [];
    for(var j=0;j<data.length;j++){
        data[j][channel].forEach((element,i) => {
            x.push(azimuths[i].azimuth);
            y.push(element);
            z.push(j);
        });
    }
    return {x:x,y:y,z:z};
}*/

/*function parseToOrbitData(channel,data,azimuths){
    var values = data[0][channel]
    var result = []
    for(var i=0;i<azimuths.length;i++){
        result.push([azimuths[i].azimuth,values[i]]);
    }
    return result;
}*/

/*function checkIfError(result,order){
    if(result.name == 'error'){
        wsServer.sendError(result,order);
        return true;
    }
    return false;
}*/

//загрузка начальных данных для списка орбит v3v4chan или v4
function loadV3V4ChanOrbitsStartData(system,order){
    var db = databases.get("db1");
    if(system=="v4"){
        db.sendRequest('select "03_chan".id,name,fullname from "03_chan" join "01_system" on "01_system".id = "03_chan".ss_id where "01_system".system = \'orbits\' and "01_system".subsystem=\'v4\'',order,function(result){
            wsServer.sendData({
                "title": "v4orbits_start_data",
                "data": result
            },order,false);
            loadV3V4ChanPkpPosData(system,order);
        })
    }
    else{
        loadV3V4ChanPkpPosData(system,order);
    }
}

//загрузка азимутов для орбит v3v4chan или v4
function loadV3V4ChanPkpPosData(system,order){
    var db = databases.get("db1");
    var subsystemname = (system=="v3v4") ? "v3v4chan" : "v4" 
    db.sendRequest('select pkp_name,azimuth from "04_pkp_position" join "01_system" on "01_system".id = "04_pkp_position".subsys_id where "01_system".abscissa_tbl = \'04_pkp_position\' and "01_system".subsystem = \''+subsystemname+'\' order by azimuth',order,function(result){
        wsServer.sendData({
            "title": "v3v4chan_pkppos_data",
            "system": system,
            "data": result//result.map(x => x.azimuth)
        },order,false);
        loadFirstRecortTime(system,order)
        //loadV3V4ChanLastDatetimeData(system,order);
    })
}

//загрузка времени последней записи
function loadFirstRecortTime(system,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(
            'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".name FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id order by "14_orb_v3v4chan".date_time asc limit 1;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4_firstrecord",
                    "system": system,
                    "data": result[0].t
                },order,false);
                //var date1 = new Date(result[0].t-86400000);
                //var date2 = new Date(result[0].t);
                //var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, ''),date2.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
                loasV3V4CalendarDays(system,order);
            })
    }
    else if(system=="v4"){
        db.sendRequest(
            'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t FROM "15_orb_v4" order by "15_orb_v4".date_time asc limit 1;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4_firstrecord",
                    "system": system,
                    "data": result[0].t
                },order,false);
                //var date1 = new Date(result[0].t-86400000);
                //var date2 = new Date(result[0].t);
                //var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, ''),date2.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
                loasV3V4CalendarDays(system,order);
            })
    }
}

//загрузка доступных дней для орбит
function loasV3V4CalendarDays(system,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(//where date_trunc(\'day\',date_time) >= \'2023-01-01\' and  date_trunc(\'day\',date_time)<=\'2023-08-30\'
            'select date_trunc(\'day\',date_time) from "14_orb_v3v4chan"   group by date_trunc(\'day\',date_time)  order by date_trunc(\'day\',date_time) asc;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4_calendar",
                    "system": system,
                    "data": result
                },order,false);
                loadV3V4ChanLastDatetimeData(system,order);
            })
    }
}

//загрузка табличных данных (время и имя канала) для орбит v3v4chan или v4
function loadV3V4ChanDatetimeData(system,datetime,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(
            'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".fullname,"03_chan".unit,"03_chan".name,"14_orb_v3v4chan".value FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id and "14_orb_v3v4chan".date_time >=\''+datetime[0]+'\' and "14_orb_v3v4chan".date_time <= \''+datetime[1]+'\' order by "14_orb_v3v4chan".date_time desc;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4chan_orbits_data",
                    "last": false,
                    "data": result
                },order,true);
            })
    }
    else if(system=="v4"){
        db.sendRequest(
            'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t,* FROM "15_orb_v4" where "15_orb_v4".date_time >=\''+datetime[0]+'\' and "15_orb_v4".date_time <= \''+datetime[1]+'\' order by "15_orb_v4".date_time desc;',order,function(result){
                wsServer.sendData({
                    "title": "v4_orbits_data",
                    "last": false,
                    "data": result
                },order,true);
            })
    }

}


//загрузка табличных данных (время и имя канала) для орбит v3v4chan или v4 за последние 6 часов, в которые есть данные
function loadV3V4ChanLastDatetimeData(system,order){
    var db = databases.get("db1");
    if(system=="v3v4"){
        db.sendRequest(
            //'SELECT extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".fullname,"03_chan".unit,"03_chan".name,"14_orb_v3v4chan".value FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id and "14_orb_v3v4chan".date_time >=\''+datetime[0]+'\' and "14_orb_v3v4chan".date_time <= \''+datetime[1]+'\' order by "14_orb_v3v4chan".date_time desc;',order,function(result){
            'SELECT distinct extract(epoch from "14_orb_v3v4chan".date_time)*1000::integer as t,"03_chan".fullname,"03_chan".unit,"03_chan".name,"14_orb_v3v4chan".value FROM "14_orb_v3v4chan","03_chan" where "14_orb_v3v4chan".chan_id="03_chan".id and "14_orb_v3v4chan".date_time >= ((select date_time from "14_orb_v3v4chan" order by date_time desc limit 1) - \'6 hours\'::interval) and "14_orb_v3v4chan".date_time <= (select date_time from "14_orb_v3v4chan" order by date_time desc limit 1) order by t desc;',order,function(result){
                wsServer.sendData({
                    "title": "v3v4chan_orbits_data",
                    "last": true,
                    "data": result
                },order,true);
            })
    }
    else if(system=="v4"){
        db.sendRequest(
            //'SELECT extract(epoch from "15_orb_v4".date_time)*1000::integer as t,* FROM "15_orb_v4" where "15_orb_v4".date_time >=\''+datetime[0]+'\' and "15_orb_v4".date_time <= \''+datetime[1]+'\' order by "15_orb_v4".date_time desc;',order,function(result){
            'SELECT distinct extract(epoch from "15_orb_v4".date_time)*1000::integer as t,* FROM "15_orb_v4" where "15_orb_v4".date_time >=((select date_time from "15_orb_v4" order by date_time desc limit 1) - \'1 day\'::interval) and "15_orb_v4".date_time <= (select date_time from "15_orb_v4" order by date_time desc limit 1) order by t desc;',order,function(result){
                wsServer.sendData({
                    "title": "v4_orbits_data",
                    "last": true,
                    "data": result
                },order,true);
            })
    }

}

//загрузка и парсинг данных о дереве БД
function loadTreeData(dbid,order){
    var tree = new tm.SystemTree(dbid);
    var db = databases.get(dbid);
    if(db.type == 'v4'){
        db.sendRequest('SELECT * FROM "01_system" order by sys_id,subsys_id',order,function(result){
            tree.parseSystems(result);
            db.sendRequest('SELECT * FROM "02_group" order by ss_id,group_id',order,function(result){
                tree.parseGroups(result);
                db.sendRequest('SELECT * FROM "03_chan" order by id',order,function(result){
                    tree.parseChannels(result);
                    db.sendRequest('SELECT * FROM "04_pkp_position" order by id',order,function(result){
                        tree.parseAzimuths(result);
                        db.tree = tree;
                        wsServer.sendData({
                            "title": "tree_data",
                            "database": dbid,
                            "data": tree.systems
                        },order,true);
                    })
                })
            })
        })
    }
    else if(db.type == 'pickups'){
        db.sendRequest('SELECT * FROM "01_system" order by id',order,function(result){
            tree.parseSystems(result);
            tree.setOneDatatable("03_v4pkpmea");
            db.sendRequest('SELECT * FROM "02_chan"',order,function(result){
                tree.parseChannels(result,db.type);
                wsServer.sendData({
                    "title": "tree_data",
                    "database": dbid,
                    "data": tree.systems
                },order,true);
            })
        })
    }
}

//загрузка доступных дней для любой таблицы
function loadDatatableRangeData(dbid,data_tbl,order)
{
    var db = databases.get(dbid);
    db.sendRequest(
        //'select date_trunc(\'day\',date_time) from "'+data_tbl+'"   group by date_trunc(\'day\',date_time)  order by date_trunc(\'day\',date_time) asc;',order,function(result){
        'select date_time from "'+data_tbl+'" order by date_time asc limit 1;',order,function(result){
            wsServer.sendData({
                "title": "datatbl_range",
                "datatable": data_tbl,
                "data": result
            },order,true);
            console.log(result);
        })
}
/*function loadAzimuths(db){
    //HARDCODE!!! CHANGE
    db.sendRequest('select pkp_name,azimuth from "04_pkp_position" join "01_system" on "01_system".subsys_id = "04_pkp_position".subsys_id where "01_system".abscissa_tbl = \'orbits\' and "01_system".subsystem = \'v4\' order by azimuth',null,function(result){
        db.setAzimuths(result); 
    });
}

function loadDtAzimuths(db,data_tbl){
    //HARDCODE!!! CHANGE
    db.sendRequest('select pkp_name,azimuth from "'+data_tbl+'" join "01_system" on "01_system".subsys_id = "'+data_tbl+'".subsys_id where "01_system".abscissa_tbl = \''+data_tbl+'\' order by azimuth',null,function(result){
        db.setAzimuths(result); 
    });
}*/

//усреднение данных
/*function averageData(data,y){
    if(!data || data.length==0){
        return [];
    }
    var min = data[0];
    var max = data[0];
    for (var i=0;i<data.length;i++){
        if(min[y]>data[i][y]) min = data[i];
        if(max[y]<data[i][y]) max = data[i];
    }
    if(min[y]==max[y]) min = data[0];
    var result = min.t>max.t? [max,min] : [min,max]
    return(result)
}*/

//фильтр данных - по точке на пиксель
/*function filterData(data,pixels,chname){
    var partsize = data.length/pixels;
    var result = [];
    for (var i=0;i<pixels;i++){
        result = result.concat(averageData(data.slice(i*partsize,(i+1)*partsize-1),chname));
    }
    return(result);
}*/

//we get all channel data for a particular period of time
function getFullChannelData(dbid,datatable,hierarchy,datetime,ordernum,order){
    if(!wsServer.isOrderExist(order)) return;
    console.log("DATETIME",datetime);
    var channel = hierarchy.channel;
    var ss;
    var datatype = channel.datatype==null ? '' : '::'+channel.datatype;
    var db = databases.get(dbid);
    var tree = db.tree;
    if(hierarchy.subsystem && hierarchy.subsystem.ss_id){
        ss = tree.findSS(hierarchy.subsystem.ss_id);
    }
    else if (hierarchy.system && hierarchy.system.ss_id){
        ss = tree.findSS(hierarchy.system.ss_id);
    }
    var subsystem = null;
    var date1 = new Date(datetime[0]+"Z");
    var date2 = new Date(datetime[1]+"Z");
    var hours = Math.abs(date1 - date2) / 36e5;
    var parts = Math.ceil(hours/12.0);
    if (parts == 0) parts = 1;
    var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
    if(datatable.includes(',')){
        var dbs = datatable.split(',',2);
        if(channel.name.endsWith("set")){
            datatable = dbs.find(element=>element.endsWith("cod"));
        }
        else{
            datatable = dbs.find(element=> !(element.endsWith("cod")));
        }
    }
    for(var i=0;i<parts;i++){
        if(i==parts-1){
            dates.push(date2.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
        else{
            dates.push(date1.addHours(12).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
    }
    console.log("DATES",dates);
    if(ss.function && ss.function.startsWith("dispersion")){
        loadFullChannelData(db,datatable,ss.data_tbl_type,channel,subsystem,datetime,ordernum,order,datatype,"dispersion",0);
        return;
    }
    if(channel.orbit){
        loadFullOrbitData(db,datatable,ss.data_tbl_type,channel,ss.azimuths,datetime,ordernum,order);
        return;
    }
    if((db.type == "pickups") || ("system" in hierarchy && hierarchy.system.name=="pickups v4")){    
        if("subsystem" in hierarchy){
            subsystem = hierarchy.subsystem
        }
        else{
            //loadFullOrbitData(db,datatable,channel,azimuths,datetime,ordernum,order);
            return;
        }
    }
    loadFullChannelData(db,datatable,ss.data_tbl_type,channel,subsystem,dates,ordernum,order,datatype,null,0);
}

//we get average channel data for a particular period of time considering mode and chart size
/*function getChannelData(chart,pixels,dbid,datatable,hierarchy,datetime,mode,ordernum,order){
    var channel = hierarchy.channel;
    var datatype = channel.datatype==null ? '' : '::'+channel.datatype;
    var db = databases.get(dbid);
    var subsystem = null;
    var date1 = new Date(datetime[0]+"Z");
    var date2 = new Date(datetime[1]+"Z");
    var hours = Math.abs(date1 - date2) / 36e5;
    var parts = Math.ceil(hours/12.0);
    var dates = [date1.toISOString().replace(/T/, ' ').replace(/\..+/, '')];
    if(datatable == "v4cod,v4-new"){
        if(channel.name.endsWith("set")){
            datatable = "v4cod";
        }
        else{
            datatable = "v4-new";
        }
    }
    for(var i=0;i<parts;i++){
        if(i==parts-1){
            dates.push(date2.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
        else{
            dates.push(date1.addHours(12).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }
    }
    if((db.type == "pickups") || (channel.orbit) || ("system" in hierarchy && hierarchy.system.name=="pickups v4")){    
        if("subsystem" in hierarchy){
            subsystem = hierarchy.subsystem
        }
        else{
            loadOrbitData(chart,db,datatable,channel,null,mode,ordernum,order);
            return;
        }
    }
    loadChannelData(chart,pixels/parts,db,datatable,channel,subsystem,dates,ordernum,order,datatype,mode,0);
}*/


//we get all orbit data for a particular period of time
/*function loadOrbitData(db,datatable,channel,date,ordernum,order){
    var req = 'select date_time,"'+channel.name+'"'+' from "'+datatable+'" ORDER BY date_time DESC LIMIT 1;'
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                console.log("problem")
                wsServer.sendError(result,order)
            }
            else{
                var channel_data = {
                    "title": "orbit_data",
                    "name": channel.name,
                    "data": parseToOrbitData(channel.name,result,db.getAzimuths()),
                    "units": channel.unit,
                    //"chart": chart,
                    //"mode": mode,
                    "dbid": db.id,
                    "ordernum": ordernum
                }
                wsServer.sendData(channel_data,order,true);
            }
        },ordernum);
    }
    catch(e){
        console.log(e);
    }
}*/


//we get all orbit data for a particular period of time
function loadFullOrbitData(db,datatable,data_tbl_type,channel,azimuths,dates,ordernum,order){
    //var req = 'select date_time,"'+channel.name+'"'+' from "'+datatable+'" ORDER BY date_time DESC LIMIT 1;'
    //var parts = dates.length-1;
    if(!wsServer.isOrderExist(order)) return;
    var req = 'select date_time,"'+channel.name+'"'+' from "'+datatable+'" where date_time >=\''+dates[0]+'\' and date_time <= \''+dates[1]+ '\' ORDER BY date_time DESC;';
    if(data_tbl_type == ""){
        req = 'select date_time, value as '+channel.name+' from "'+datatable+'" where date_time >=\''+dates[0]+'\' and date_time <= \''+dates[1]+ '\' and chan_id='+channel.address+' ORDER BY date_time DESC;';
    }
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                console.log("problem")
                wsServer.sendError(result,order)
            }
            else{
                var channel_data = {
                    "title": "orbit_data",
                    //"name": channel.name,
                    "data": parseToOrbitData(channel.name,result,azimuths),
                    //"units": channel.unit,
                    //"chart": chart,
                    //"mode": mode,
                    "nodeId": channel.nodeId,
                    "dbid": db.id,
                    "ordernum": ordernum
                }
                //if(i==parts-1){
                    wsServer.sendData(channel_data,order,true);
                /*}
                else{
                    wsServer.sendData(channel_data,order,false);
                    loadFullOrbitData(db,datatable,channel,dates,ordernum,order,i+1);
                }*/
            }
        },ordernum);
    }
    catch(e){
        console.log(e);
    }
}

//загрузка данных с канала определенного перидоа
function loadFullChannelData(db,datatable,data_tbl_type,channel,subsystem,dates,ordernum,order,datatype,func,i){
    if(!wsServer.isOrderExist(order)) return;
    var parts = dates.length-1;
    var req;
    var chan_name = channel.name;
    var timenow = new Date().getTime();
    if(channel.fullname) chan_name = channel.fullname;
    //var channel_name_quotes = /[A-Z]/.test(channel.name) ? '"'+channel.name+'"' : channel.name;
    var channel_name_quotes = '"'+channel.name+'"';
    //подсистема есть у пикапов
    /*if(subsystem){ 
        if(data_tbl_type == "chan_id"){
            //req = 'select extract(epoch from date_time at time zone \'-07\' at time zone \'utc\')*1000::integer as t,"'+channel.name+'"['+subsystem.id+']'+datatype+' as"'+chan_name+'" from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
        }
        else{
            req = 'select extract(epoch from date_time at time zone \'-07\' at time zone \'utc\')*1000::integer as t,"'+channel.name+'"['+subsystem.id+']'+datatype+' as"'+chan_name+'" from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
        }
    }*/
    //else if(channel.unit == 'text'){
    //if(dates.length <= i+1) return;
    if(channel.datatype == 'char' || channel.datatype == 'stringin'){
        if(data_tbl_type == "chan_id"){
            var prereq = '(select extract(epoch from date_time at time zone \'-07\' at \
            time zone \'utc\')*1000::integer as t, value as "'+chan_name+'", color from \
            "'+datatable+'", \"05_textchan_values\" where date_time <=\''+dates[i]+'\' and \
            chan_id='+channel.address+' \
            and "'+chan_name+'"=value order by date_time desc limit 1) UNION ALL ';
            req = prereq+'(select extract(epoch from date_time at time zone \'-07\' at \
            time zone \'utc\')*1000::integer as t, value as "'+chan_name+'", color from \
            "'+datatable+'", \"05_textchan_values\" where date_time >=\''+dates[i]+'\' and \
            date_time <= \''+dates[i+1]+'\' and chan_id='+channel.address+' \
            and "'+chan_name+'"=value) order by date_time asc;'
        }
        else{
            req = 'select extract(epoch from date_time at time zone \'-07\' at \
            time zone \'utc\')*1000::integer as t,'+ channel_name_quotes +' as \
            "'+chan_name+'", color from "'+datatable+'", \"05_textchan_values\" where \
            date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' \
            and "'+chan_name+'"=value order by date_time asc;'
        }
    }
    else{
        //if(channel.fullname) chan_name = channel.fullname;
        if(data_tbl_type == "chan_id"){
            var prereq = '(select extract(epoch from date_time at time zone \'-07\' at time zone \
            \'utc\')*1000::integer as t, value as "'+chan_name+'" from "'+datatable+'" where \
            date_time <=\''+dates[i]+'\' and \
            chan_id='+channel.address+' order by date_time desc limit 1) UNION ALL ';
            req = prereq + '(select extract(epoch from date_time at time zone \'-07\' at time zone \
            \'utc\')*1000::integer as t, value as "'+chan_name+'" from "'+datatable+'" where \
            date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' and \
            chan_id='+channel.address+') order by t asc;'
        }
        else{
            req = 'select extract(epoch from date_time at time zone \'-07\' at time zone \'utc\')*1000::integer as t,'+channel_name_quotes+''+datatype+' as "'+chan_name+'" from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
        }
    }
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                console.log("problem")
                wsServer.sendError(result,order)
            }
            else{
                /*if(result.length==0){
                    wsServer.sendError({"text":"There is no data on this period"},order)
                }*/
                if((data_tbl_type == "chan_id") && (result.length > 0)){
                    result[0].t = new Date(dates[i]).getTime();
                    var endtime = new Date(dates[i+1]).getTime();
                    result.push({t: (timenow<endtime ? timenow : endtime)});
                    result[result.length-1][chan_name] = result[result.length-2][chan_name];
                }
                if(func){
                    result = applyMath(func,result,chan_name);
                }
                if(channel.unit == 'text'){
                    result = removeSimilar(result,chan_name);
                }                    
                var channel_data = {
                    "title": "full_channel_data",
                    "fullname": chan_name,
                    "nodeId": channel.nodeId,
                    "data": result,
                    //"units": channel.unit,
                    "index": i,
                    "datetime": [dates[i],dates[i+1]],
                    //"chart": chart,
                    "dbid": db.id,
                    "ordernum": ordernum,
                    "parts": parts
                }
                if(i==parts-1){
                    wsServer.sendData(channel_data,order,true);
                }
                else{
                    wsServer.sendData(channel_data,order,false);
                    loadFullChannelData(db,datatable,data_tbl_type,channel,subsystem,dates,ordernum,order,datatype,func,i+1);
                }
            }
        },ordernum);
    }
    catch(e){
        console.log(e);
    }
}

// записываем данные о подключениях и отключениях в базу
function logConnection(ip,status){
    var db = databases.get("db1");
    var now = new Date(Date.now()).toLocaleString();
    var pieces = ip.split(":");
    ip = pieces[pieces.length-1];
    db.sendRequest('insert into "06_web_connection" (date_time,ip,status) values (\''+now+'\',\''+ip+'\','+status+');');
}

//загрузка данных с канала определенного перидоа на определенное число пикселей
/*function loadChannelData(chart,pixels,db,datatable,channel,subsystem,dates,ordernum,order,datatype,mode,i){
    var parts = dates.length-1;
    var req;
    var chan_name = channel.name;
    if(subsystem){
        chan_name = subsystem.name+": "+chan_name;
        req = 'select extract(epoch from date_time)*1000::integer as t,"'+channel.name+'"['+subsystem.id+']'+datatype+' as"'+chan_name+'" from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
    }
    else{
        req = 'select extract(epoch from date_time)*1000::integer as t,"'+channel.name+'"'+datatype+' from "'+datatable+'" where date_time >=\''+dates[i]+'\' and date_time <= \''+dates[i+1]+'\' order by date_time asc;'
    }
    try{
        db.sendRequest(req,order,function(result){
            if(result.type=="err"){
                wsServer.sendError(result,order)
            }
            else{
                var filtered_data = [];
                /*if(result.length==0){
                    wsServer.sendError({"text":"There is no data on this period"},order)
                }*/
                /*filtered_data = filterData(result,pixels,chan_name);
                var channel_data = {
                    "title": "channel_data",
                    "fullname": chan_name,
                    "name": channel.name,
                    "data": parseToChartData(chan_name, filtered_data),
                    "units": channel.unit,
                    "index": i,
                    "chart": chart,
                    "mode": mode,
                    "dbid": db.id,
                    "ordernum": ordernum,
                    "parts": parts
                }
                if(i==parts-1){
                    wsServer.sendData(channel_data,order,true);
                }
                else{
                    wsServer.sendData(channel_data,order,false);
                    loadChannelData(chart,pixels,db,datatable,channel,subsystem,dates,ordernum,order,datatype,mode,i+1)
                }
            }
        },ordernum);
    }
    catch(e){
    }
}*/

/*function getSensors(magnet_name){
    var sensors = systems.find(o => o.name === "Temperature").findAll(magnet_name)
    return sensors
}
*/

function initDatabases(){
    var databases_number = dbc.GetDbNumber();
    for(var i=1;i<=databases_number;i++){
        var db = new dbc.DBConnection("db"+i);
        databases.set(db.id,db);
        //if(db.type=="pickups"){
        //loadAzimuths(db);
        //}
    }
}

function getDatabasesInfo(){
    var result = [];
    databases.forEach(function(db){
        result.push({
            id: db.id,
            name: db.name,
            status: db.status
        })
    });
    return result;
}

initDatabases();

module.exports = {
    loadTreeData: loadTreeData,
    loadV3V4ChanOrbitsStartData: loadV3V4ChanOrbitsStartData,
    loadV3V4ChanDatetimeData: loadV3V4ChanDatetimeData,
    //getSensors: getSensors,
    //getChannelData: getChannelData,
    getFullChannelData: getFullChannelData,
    getDatabasesInfo: getDatabasesInfo,
    logConnection: logConnection,
    loadDatatableRangeData: loadDatatableRangeData
    //loadDtAzimuths: loadDtAzimuths
}

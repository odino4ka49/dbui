$(document).on("activePlotSet",function(event){
    var time = getActivePlotRange();
    timepicker.setDateTime(time[0],time[1]);
    selectChannelsInAllTrees(getActivePlotChanels());
});

$(document).on("channelsUpdated",function(event){
    selectChannelsInAllTrees(getActivePlotChanels());
});

$(document).on("dateTimeApplied",function(event){
    var time = timepicker.getDateTime();
    console.log("dateTimeApplied", time);
    setRange(time);
    $(document).trigger("configIsChanged");
});

$(document).on("addNewChart",function(event){
    addNewChart();
});

//происходит, если выбрано дерево канала 
$(document).on("treeChannelChosen",function(event,node,dbid){
    var [datatable,hierarchy] = getDatatable(node,dbid);
    addChannelToActivePlot(node,hierarchy,datatable,dbid);
});
//происходит, когда человек выбирает систему или подсистему
$(document).on("treeSystemChosen",function(event,node,dbid){
    if(node)
        setSelectedSystemName(node.name);//отобразить название выбранной системы
    else
        setSelectedSystemName(null);
});

$(document).on("asyncronized",function(event){
    var time = getActivePlotRange();
    if(time){
        timepicker.setDateTime(time[0],time[1]);
    }
});

$(document).on("zoomed",function(event){
    var time = getActivePlotRange();
    if(time)
    {
        timepicker.setDateTime(time[0],time[1]);
        $(document).trigger("configIsChanged");
    }
});

$(document).on("configIsChanged",function(event){
    saveCurrentConfig();
});

$(document).on("databasesLoaded",function(event){
    loadCurrentConfig()
});

function saveCurrentConfig(){
    var time_config = JSON.stringify(timepicker.getDateTime());
    var synched_config = JSON.stringify(isSynchedMode());
    var mode_config = JSON.stringify(getMode());
    var db_config = JSON.stringify(getOpenedDbs());
    var charts_config = JSON.stringify(getChartsConfig());
    /*var config_obj = {
        "time": time_config,
        "synched": synched_config,
        "mode": mode_config,
        "dbs": db_config,
        "charts": charts_config
    };*/
    window.location.hash = [time_config,synched_config,mode_config,db_config,charts_config].join('&');
}

function loadCurrentConfig(){
    var config_objects = window.location.hash.substring(1).replaceAll("%22",'"').replaceAll("%20",' ').split('&');
    if(config_objects == "") return;
    var time_config = JSON.parse(config_objects[0]);
    var synched_config = JSON.parse(config_objects[1]);
    var mode_config = JSON.parse(config_objects[2]);
    var db_config = JSON.parse(config_objects[3]);
    var charts_config = JSON.parse(config_objects[4]);
    setRange([time_config[0],time_config[1]]);
    timepicker.setDateTime(time_config[0],time_config[1]);
    presetSynchedMode(synched_config);
    presetLineMode(mode_config);
    preOpenDbs(db_config,charts_config);
    //console.log(time_config,synched_config,mode_config,db_config,charts_config);
}


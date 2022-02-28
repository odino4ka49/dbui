$(document).on("activePlotSet",function(event){
    //console.log("activePlotSet",getActivePlotChanels())
    var time = getActivePlotRange();
    timepicker.setDateTime(time[0],time[1]);
    selectChannelsInAllTrees(getActivePlotChanels());
});

$(document).on("channelsUpdated",function(event){
    selectChannelsInAllTrees(getActivePlotChanels());
});

$(document).on("dateTimeApplied",function(event){
    var time = timepicker.getDateTime();
    setRange(time);
});


//происходит, если выбрано дерево канала 
$(document).on("treeChannelChosen",function(event,node,dbid){
    var [datatable,hierarchy] = getDatatable(node,dbid);
    addChannelToActivePlot(node,hierarchy,datatable,dbid);
});



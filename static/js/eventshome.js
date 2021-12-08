$(document).on("activePlotSet",function(event){
    var time = getActivePlotRange();
    console.log(time);
    timepicker.setDateTime(time[0],time[1]);
    selectChannelsInAllTrees(getActivePlotChanels());
    //добавить выделение каналов в дереве
});


$(document).on("dateTimeApplied",function(event){
    var time = timepicker.getDateTime();
    console.log("time",time);
    setRange(time);
});
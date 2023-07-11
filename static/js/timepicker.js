var timepicker;

function TimePicker(div_id){
    this.datetimerange = [];
    this.div = div_id;
}

TimePicker.prototype.init = function(start=moment().subtract(1, 'days'),end=moment(),firstrec=undefined,lastrec=undefined) {
    console.log(typeof lastrec)
    $(this.div).daterangepicker({   
        showDropdowns: true, 
        autoApply: true,
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        startDate: start,
        endDate: end,
        //minYear: 2017,
        minDate: firstrec,
        //maxDate:  lastrec,
        locale: {
            format: 'YYYY-MM-DD HH:mm:ss'
        }
    });
    this.datetimerange.push($(this.div).data('daterangepicker').startDate.format('YYYY-MM-DD HH:mm:ss'));
    this.datetimerange.push($(this.div).data('daterangepicker').endDate.format('YYYY-MM-DD HH:mm:ss'));
    $(this.div).on('hide.daterangepicker', function(ev, picker) {
        var datetime = timepicker;
        var datetimerange = [];
        if(ev.target.id=="v4dtr"){
            datetime = getTimePicker("v4");
        }
        else if(ev.target.id=="v3v4dtr"){
            datetime = getTimePicker("v3v4");
        }
        if("datetimerange" in datetime) {
            datetimerange = datetime.datetimerange;
            if((datetimerange[0]==picker.startDate.format('YYYY-MM-DD HH:mm:ss'))&&(datetimerange[1]==picker.endDate.format('YYYY-MM-DD HH:mm:ss'))){
                return;
            }
            datetimerange[0] = picker.startDate.format('YYYY-MM-DD HH:mm:ss');
            datetimerange[1] = picker.endDate.format('YYYY-MM-DD HH:mm:ss');
        }
        $(document).trigger("dateTimeApplied");
    });
    $(this.div).on('show.daterangepicker', function(ev, picker) {
        $("div.drp-calendar.left > .calendar-time > .hourselect option[value=9]").prop('selected', true);
        $("div.drp-calendar > .calendar-time > .minuteselect option[value=0]").prop('selected', true);
        $("div.drp-calendar > .calendar-time > .secondselect option[value=0]").prop('selected', true);
        $("div.drp-calendar.right > .calendar-time > .hourselect option[value=21]").prop('selected', true);
        //picker.setStartDate(picker.startDate.format('YYYY-MM-DD ')+'09:00:00');
    });
}


TimePicker.prototype.getDateTime = function() {
    return [this.datetimerange[0].slice(),this.datetimerange[1].slice()];
}

TimePicker.prototype.getDateTimeNotFormated = function() {
    return([$(this.div).data('daterangepicker').startDate._d,$(this.div).data('daterangepicker').endDate._d]);
}

TimePicker.prototype.setDateTime = function(start,end) {
    this.datetimerange = [start,end];
    $(this.div).data('daterangepicker').setStartDate(start);
    $(this.div).data('daterangepicker').setEndDate(end);
}


//линиями или точками
function getMode(){
    return($('input[name="linetype"]:checked').val());
}
function presetLineMode(mode){
    if(mode == "line"){
        $("input[name=linetype][value=line]").prop('checked', true);
        $("input[name=linetype][value=markers]").prop('checked', false);
    }
    else if(mode == "markers"){
        $("input[name=linetype][value=line]").prop('checked', false);
        $("input[name=linetype][value=markers]").prop('checked', true);
    }
}

function getDateTime(){
    return timepicker.getDateTime();
}

function initPicker(div,time=null){
    timepicker = new TimePicker(div);
    timepicker.init();
    if(time!=null){
        timepicker.setDateTime(time[0],time[1]);
    }
    else{
        timepicker.setDateTime(moment().subtract(1, 'days').format('YYYY-MM-DD')+' 09:00:00', moment().format('YYYY-MM-DD HH:mm:ss'));
    }
}

$(document).ready(function(){
})
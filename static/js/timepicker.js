var timepicker;

function TimePicker(div_id){
    this.datetimerange = [];
    this.div = div_id;
}

TimePicker.prototype.init = function(start=moment().subtract(1, 'days'),end=moment(),firstrec=undefined,lastrec=undefined) {
    $(this.div).daterangepicker({
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        startDate: start,
        endDate: end,
        //minYear: 2017,
        minDate: firstrec,
        maxDate: lastrec,
        locale: {
            format: 'YYYY-MM-DD HH:mm:ss'
        }
    });
    this.datetimerange.push($(this.div).data('daterangepicker').startDate.format('YYYY-MM-DD HH:mm:ss'));
    this.datetimerange.push($(this.div).data('daterangepicker').endDate.format('YYYY-MM-DD HH:mm:ss'));
    $(this.div).on('apply.daterangepicker', function(ev, picker) {
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
            datetimerange[0] = picker.startDate.format('YYYY-MM-DD HH:mm:ss');
            datetimerange[1] = picker.endDate.format('YYYY-MM-DD HH:mm:ss');
        }
        $(document).trigger("dateTimeApplied");
    });
}


TimePicker.prototype.getDateTime = function() {
    return [this.datetimerange[0].slice(),this.datetimerange[1].slice()];
}

TimePicker.prototype.getDateTimeNotFormated = function() {
    return([$(this.div).data('daterangepicker').startDate._d,$(this.div).data('daterangepicker').endDate._d]);
}

TimePicker.prototype.setDateTime = function(start,end) {
    $(this.div).data('daterangepicker').setStartDate(start);
    $(this.div).data('daterangepicker').setEndDate(end);
}


//линиями или точками
function getMode(){
    return($('input[name="linetype"]:checked').val());
}

function initPicker(div,time=null){
    timepicker = new TimePicker(div);
    timepicker.init();
    if(time!=null){
        timepicker.setDateTime(time[0],time[1]);
    }
}
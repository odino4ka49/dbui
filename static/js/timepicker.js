var datetimerange = [];

function initPicker() {
    $('#datetimerange').daterangepicker({
        timePicker: true,
        startDate: moment().subtract(1, 'days'),
        endDate: moment(),
        minYear: 2017,
        locale: {
            format: 'YYYY-MM-DD hh:mm:ss'
        }
    });
    datetimerange.push($('#datetimerange').data('daterangepicker').startDate.format('YYYY-MM-DD hh:mm:ss'));
    datetimerange.push($('#datetimerange').data('daterangepicker').endDate.format('YYYY-MM-DD hh:mm:ss'));
    $('#datetimerange').on('apply.daterangepicker', function(ev, picker) {
        datetimerange[0] = picker.startDate.format('YYYY-MM-DD hh:mm:ss');
        datetimerange[1] = picker.endDate.format('YYYY-MM-DD hh:mm:ss');
    });
  }


function getDateTime() {
    return datetimerange;
}
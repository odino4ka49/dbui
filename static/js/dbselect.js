
function changeDB(){
    var db = $("#db-select").val();
    var msg = {
        type: "db_change",
        db: db
    };
    sendMessageToServer(JSON.stringify(msg));
}
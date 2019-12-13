'use strict';

function changeDB(){
    let db = $("#db-select").val();
    let msg = {
        type: "db_change",
        db: db
    };
    sendMessageToServer(JSON.stringify(msg));
}
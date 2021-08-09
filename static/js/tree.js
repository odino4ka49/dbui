var databases;

//приведение данных к виду для отрисовки
function parseTree(data){
    data.forEach(function(node){
        node.text = node.name;
        if('subsystems' in node && node.subsystems.length!=0){
            node.nodes = node.subsystems;
            delete node.subsystems;
            parseTree(node.nodes);
        }
        else if ('groups' in node && node.groups.length!=0){
            node.nodes = node.groups;
            delete node.groups;
            parseTree(node.nodes);
        }
        else if ('channels' in node && node.channels.length!=0 && (node.name!="orbits v3v4chan"&&node.name!="orbits v4")){
            node.nodes = node.channels;
            delete node.channels;
            parseTree(node.nodes);
        }
    });
    return data;
};

//обновить дерево БД
function refreshTree(dbid,data) {
    var db_li = $("#"+dbid);
    db_li.children("ul").remove();
    var db_tree = $("<ul>").attr("id",dbid+"_tree").appendTo(db_li);
    db_tree.treeview(
        {
            data: parseTree(data),
            levels: 1,
            //multiSelect: true,
            onNodeSelected: function(event, node) {
                //console.log(dbid,node);
                if(dbid=="db1"){
                    if(node.name=="orbits v3v4chan"){
                        window.open(window.location.href+"orbits?system=v3v4")
                    }
                    else if(node.name=="orbits v4"){
                        window.open(window.location.href+"orbits?system=v4")
                    }
                }
                if(node.type=="channel"){
                    loadChannelData(node,dbid);
                    $("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                }
            },
            /*onNodeUnselected: function (event, node) {
                if(node.type=="channel"){
                    removePlot(node.text);
                }
            }*/
        });
    db_li.addClass("opened");
    db_li = null;
    db_tree = null;
};

//метаданные о канале
function getDatatable(channel,dbid){
    var db_tree = $("#"+dbid+"_tree");
    var data_tbl;
    var hierarchy = {};
    var parent = channel;
    hierarchy["channel"] = channel;
    while (parent.parentId!=undefined){
        parent = db_tree.treeview('getParent', parent);
        hierarchy[parent.type] = {
            "id": parent.id,
            "name": parent.text
        };
        if("data_tbl" in parent){
            data_tbl = parent["data_tbl"];
        }
    }
    db_tree = null;
    parent = null;
    return [data_tbl,hierarchy];
}

//загрузить данные о выбранном канале
function loadChannelData(channel,dbid){
    loadChannelDataTime(channel,dbid,timepicker.getDateTime());
    setRange(timepicker.getDateTimeNotFormated());
}
//загрузить данные о канале из базы с учетом времени
function loadChannelDataTime(channel,dbid,time){
    var [datatable,hierarchy] = getDatatable(channel,dbid);
    if(!activechart){
        alert("Please choose a canvas to display the data");
        return;
    }
    if(datatable){
        //console.log("datatable",datatable)
        var channel_object = new ChartChannel(channel.name,hierarchy,datatable,dbid);
        addChannelToGraph(channel_object);
        loadChannelDataObject(channel_object,time);
    }
    datatable = null;
    hierarchy = null;
}

//посылает запрос на данные о канале с помощью объекта канал
function loadChannelDataObject(channel_object,time){
    console.log(time);
    var msg = {
        type: "channel_data",
        hierarchy: channel_object.hierarchy,
        datatable: channel_object.datatable,
        datetime: time,
        dbid: channel_object.dbid,
        chart: activechart,
        pixels: getActiveGraphWidth()-10,
        mode: getMode()                                                                      
    };
    document.body.style.cursor='wait';
    sendMessageToServer(JSON.stringify(msg));
    msg = null;
}

//посылает запрос на данные о БД
function loadDatabaseTree(dbid){
    document.body.style.cursor='wait';
    var msg = {
        type: "tree_data", //type of msg: get tree of this
        database: dbid
    };
    sendMessageToServer(JSON.stringify(msg));
    msg = null;
}

//отрисовка дерева БД
function displayDatabases(data){
    databases = data;
    var db_ul = $("#databases");
    data.forEach(function(db){
        var db_li = $('<li>').attr('id',db.id).append("<div class='plus'/><p>"+db.name+"</p>").append("<div title='Refresh DB tree' class='refresh'>").delegate('div.refresh','click',refreshDatabaseTree).appendTo(db_ul);
        if(!db.status){
            db_li.addClass("inactive");
        }
        else{
            db_li.addClass("active");
        }
    });
    refreshTooltips();
    db_ul.children("li").not('.inactive').children(".plus").click(showDatabaseTree);
    data = null;
    db_ul = null;
}

//подсказка
function refreshTooltips(){
    $('.refresh').tooltip({align: 'right'});
}

//открывает деревовыбранной БД
function showDatabaseTree(event){
    console.log("show")
    var db_li = $(event.target).parent();
    var dbid = db_li.attr('id');
    var db_tree = db_li.children("ul")[0];
    if(db_tree){
        if(db_li.hasClass("opened")){
            $(db_tree).hide();
            db_li.removeClass("opened");
        }
        else{
            $(db_tree).show();
            db_li.addClass("opened");
        }
    }

    else{
        loadDatabaseTree(dbid);
    }
    db_li = null;
    dbid = null;
    db_tree = null;
}

//показывает, что БД неактивна
function deactivateDatabase(dbid){
    $("#"+dbid).addClass("inactive").removeClass("active");
}

// connected to refresh db button
function refreshDatabaseTree(event){
    event.stopPropagation();
    var dbid = $(event.target).parent().attr('id');
    //makes db name active
    $(event.target).parent().addClass("active").removeClass("inactive");
    //tries to load db tree
    loadDatabaseTree(dbid);
    dbid = null;
}

function alertError(err){
    alert(err.text);
    deactivateDatabase(err.dbid);
}


var databases;
var search_results = {};

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
    db_li.siblings("#treefor_"+dbid).remove();
    var treedb_tr = $("<tr>").attr("id","treefor_"+dbid).append("<td>");
    var db_tree = $("<ul>").attr("id",dbid+"_tree");
    treedb_tr.children("td").append(db_tree);
    db_li.after(treedb_tr);
    db_tree.treeview(
        {
            data: parseTree(data),
            levels: 1,          
            selectedColor: "white",
            selectedBackColor: "lightblue",
            multiSelect: true,
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
                    $(document).trigger("treeChannelChosen",[node,dbid]);
                    //loadChannelData(node,dbid);
                    //$("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                }
                else{
                    $("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                }
            },
            onNodeUnselected: function (event, node) {
                //db_tree.treeview('selectNode', [ channels[i].nodeid, { silent: true } ]);
                if(node.type=="channel"){
                    $("#"+dbid+"_tree").treeview('selectNode', [ node.nodeId, { silent: true } ]);
                }
            }
        });
    db_li.addClass("opened");
    db_li = null;
    db_tree = null;
};

//выделить нужные каналы во всех деревьях
function selectChannelsByDB(channels,dbid){
    //unselect all trees
    var db_tree = $("#"+dbid+"_tree");
    var selectednodes = db_tree.treeview('getSelected');
    for(var j=0; j<selectednodes.length;j++){
        //console.lo
        db_tree.treeview('unselectNode', [ selectednodes[j], { silent: true } ]);
    }
    for(var i = 0; i < channels.length; i++){
        //console.log(channels[i].nodeid)
        db_tree.treeview('selectNode', [ channels[i].nodeid, { silent: true } ]);
    }
}

function selectChannelsInAllTrees(channels){
    //console.log("channels",channels[0].name)
    for(var i = 0; i < databases.length; i++){
        var dbid = databases[i].id;
        var dbchannels = channels.filter(chan => (chan.dbid==dbid));
        selectChannelsByDB(dbchannels,dbid);
    }
}

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
        if("azimuths" in parent){
            hierarchy[parent.type]["azimuths"] = parent.azimuths;
        }
        if("data_tbl_type" in parent){
            hierarchy[parent.type]["data_tbl_type"] = parent.data_tbl_type;
        }
    }
    db_tree = null;
    parent = null;
    return [data_tbl,hierarchy];
}

//загрузить данные о выбранном канале
/*function loadChannelData(channel,dbid){
    loadChannelDataTime(channel,dbid,timepicker.getDateTime());
    //setRange(timepicker.getDateTimeNotFormated());
}*/
//загрузить данные о канале из базы с учетом времени
/*function addChannelToActivePlot(channel,dbid){
    var [datatable,hierarchy] = getDatatable(channel,dbid);
    /*if(!activeplot){
        alert("Please choose a canvas to display the data");
        return;
    }
    if(datatable){
        addChannelToActivePlot(channel,hierarchy,datatable,dbid)
        //console.log("channel",channel)
        //var channel_object = new ChartChannel(channel.name,hierarchy,datatable,dbid,channel.nodeId);
        //loadChannelDataObject(channel_object,time);
    }
    datatable = null;
    hierarchy = null;
}*/

//посылает запрос на данные о БД
function loadDatabaseTree(dbid){
    //console.log(dbid);
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
    var db_table = $("#databases");
    databases.forEach(function(db){
        var refresh_td = $('<td >').append("<div title='Refresh DB tree' class='refresh'>").delegate('div.refresh','click',refreshDatabaseTree);
        var db_tr = $('<tr>').attr('id',db.id).append("<td><div class='plus'/></td><td>"+db.name+"</td>").append(refresh_td).appendTo(db_table);
        if(!db.status){
            db_tr.addClass("inactive");
        }
        else{
            db_tr.addClass("active");
        }
    });
    refreshTooltips();
    db_table.children("tr").not('.inactive').children("td").children(".plus").click(showDatabaseTree);
    data = null;
    db_table = null;
}

//подсказка
function refreshTooltips(){
    $('.refresh').tooltip({align: 'right'});
}

//открывает дерево выбранной БД
function showDatabaseTree(event){
    var db_tr = $(event.target).parent().parent();
    var dbid = db_tr.attr('id');
    var db_tree = $("#treefor_"+dbid)[0];
    if(db_tree){
        if(db_tr.hasClass("opened")){
            $(db_tree).hide();
            db_tr.removeClass("opened");
        }
        else{
            $(db_tree).show();
            db_tr.addClass("opened");
        }
    }

    else{
        loadDatabaseTree(dbid);
    }
    db_tr = null;
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
    var dbid = $(event.target).parent().parent().attr('id');
    //makes db name active
    $(event.target).parent().parent().addClass("active").removeClass("inactive");
    //tries to load db tree
    loadDatabaseTree(dbid);
    dbid = null;
}

function alertError(err){
    alert(err.text);
    deactivateDatabase(err.dbid);
}

function searchAll(){
    var results = [];
    var isAnyDbOpened = false;
    //search_results = {};
    var results_n = 0;
    var output = "";

    databases.forEach(function(db){
        //var db_tree = $("#"+db.id+"_tree");
        //search(db.id);
        results = search(db.id);
        if(results){
            isAnyDbOpened = true;
            results_n+=results.length;
        }
        //search_results[db.id] = results;
        //console.log(db,results);
        //$.each(results, function (index, result) {
            //var parent = result;
            //var line = parent.text + '</p>';
            //while(parent.type!="system"){
            //    line = parent.text + ': '+line;
            //    parent = db_tree.treeview('getParent', parent);
             //   console.log(parent);
            //}
            //output += "<p>"+db.name+": "+line;
        //});
    })
    
    if(isAnyDbOpened){
        output = '<p>' + results_n + ' matches found</p>';//+output;
    }
    else{
        output = "There are no opened Databases."
    }
    
    $('#search_output').html(output);
}

function search(dbid) {
    var db_tree = $("#"+dbid+"_tree");
    //if(!db_tree.length){
    //console.log(db_tree)
    if((!db_tree.length)||(db_tree.is(":hidden"))){
        return false;
    }
    var pattern = $('#input_search').val();
    var options = {
      ignoreCase: true,
      exactMatch: false,
      revealResults: true
    };
    db_tree.treeview('collapseAll', { silent: true });
    var result = db_tree.treeview('search', [ pattern, options ]);
    //db_tree.treeview('hideAll');
    return (result instanceof Array) ? result : [];
}

$(document).ready(function(){
    $('#input_search').keyup(function(e){
        //console.log("search_keyup")
        if (e.key === 'Enter' || e.which === 13 || (e.keyCode == 13)) {
            searchAll();
        };
    });
});



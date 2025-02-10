
var databases;
var search_results = [];
var dbs_to_open;
var channels_to_open;
var selected_sys;

//приведение данных к виду для отрисовки
function parseTree(data){
    data.forEach(function(node){
        node.text = node.name;
        if(node.fullname){
            node.text = node.fullname;
        }
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
    var is_new_db_tree = !(db_li.siblings("#treefor_"+dbid).length);
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
            highlightSearchResults: false,
            onNodeSelected: function(event, node) {
                //console.log(dbid,node);
                if(dbid=="db1"){
                    /*if(node.name=="orbits v3v4chan"){
                        window.open(window.location.href+"orbits?system=v3v4")
                    }
                    else */
                    var parent = $("#"+dbid+"_tree").treeview('getParent',node);
                    if((node.name=="v3v4chan"&&node.abscissa_tbl=="04_pkp_position")||(parent.name=="v3v4chan"&&parent.abscissa_tbl=="04_pkp_position")){
                        window.open(window.location.origin+"/orbits?system=v3v4");
                    }
                }
                if(node.type=="channel"){
                    $(document).trigger("treeChannelChosen",[node,dbid]);
                    //loadChannelData(node,dbid);
                    //$("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                }
                else if("data_tbl" in node)//(node.type=="system")||(node.type=="subsystem"))
                {
                    unselectCurrentSystemNode(); //развыбрать предыдущую выбранную систему
                    selected_sys = [dbid,node]; //присвоить в переменную новую систему
                    loadSelectedSystemTree();
                    $(document).trigger("treeSystemChosen",[node,dbid]); //посылаем событие - чтобы подсветить календарь
                }
                else{
                    $("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                    $("#"+dbid+"_tree").treeview('toggleNodeExpanded', [ node.nodeId, { silent: true } ]);
                }
            },
            onNodeUnselected: function (event, node) {
                //db_tree.treeview('selectNode', [ channels[i].nodeid, { silent: true } ]);
                if(node.type=="channel"){
                    $("#"+dbid+"_tree").treeview('selectNode', [ node.nodeId, { silent: true } ]);
                }
                else if((node.type=="system")||(node.type=="subsystem"))
                {   
                    selected_sys = null;
                    $(document).trigger("treeSystemChosen",null); //посылаем событие - чтобы подсветить календарь
                }
            }
        });
    db_li.addClass("opened");
    if(is_new_db_tree) checkOutDb(dbid);
};

//выделить нужные каналы во всех деревьях
function selectChannelsByDB(channels,dbid){
    //unselect all trees
    var db_tree = $("#"+dbid+"_tree");
    var selectednodes = db_tree.treeview('getSelected');
    for(var j=0; j<selectednodes.length;j++){
        db_tree.treeview('unselectNode', [ selectednodes[j], { silent: true } ]);
    }
    for(var i = 0; i < channels.length; i++){
        db_tree.treeview('selectNode', [ channels[i].nodeId, { silent: true } ]);
    }
}

//развыделить текущую систему
function unselectCurrentSystemNode()
{
    if(!selected_sys) return;
    var db_tree = $("#"+selected_sys[0]+"_tree");
    db_tree.treeview('unselectNode', [ selected_sys[1].nodeId, { silent: true } ]);
}

//клик на канал
function clickTheChannel(channel){
    var db_tree = $("#"+channel[0]+"_tree");
    db_tree.treeview('selectNode', [ channel[1] ]);
}

function selectChannelsInAllTrees(channels){
    for(var i = 0; i < databases.length; i++){
        var dbid = databases[i].id;
        var dbchannels = channels.filter(chan => (chan.dbid==dbid));
        selectChannelsByDB(dbchannels,dbid);
    }
    selectChannelsInSearch(channels);
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
        if("ss_id" in parent){
            hierarchy[parent.type]["ss_id"] = parent.ss_id;        
        }
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
}*/

//посылает запрос на данные о БД
function loadDatabaseTree(dbid){
    //console.log(dbid);
    //document.body.style.cursor='wait';
    waitCursor();
    var msg = {
        type: "tree_data", //type of msg: get tree of this
        database: dbid
    };
    sendMessageToServer(JSON.stringify(msg));
}
//посылает запрос в БД о доступных данных выбранной системы
function loadSelectedSystemTree(){
    if(!selected_sys) return;
    waitCursor();
    var msg = {
        type: "get_datatbl_range",
        database: selected_sys[0],
        datatable: selected_sys[1].data_tbl
    };
    sendMessageToServer(JSON.stringify(msg));
}

//отрисовка дерева БД
function displayDatabases(data){
    databases = data;
    var db_table = $("#databases");
    db_table.children().remove();
    databases.forEach(function(db){
        var refresh_td = $('<td >').append("<div title='Refresh DB tree' class='refresh'>").delegate('div.refresh','click',refreshDatabaseTree);
        var db_tr = $('<tr>').attr('id',db.id).append("<td><div class='plus'/></td><td class='db_name'>"+db.name+"</td>").append(refresh_td).appendTo(db_table);
        if(!db.status){
            db_tr.addClass("inactive");
        }
        else{
            db_tr.addClass("active");
        }
    });
    refreshTooltips();
    db_table.children("tr").not('.inactive').children("td").children(".plus").click(showDatabaseTree);

    $(document).trigger("databasesLoaded");
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
}

//открывает деревья заранее
function preOpenDbs(db_config,charts_config){
    dbs_to_open = db_config;
    channels_to_open = charts_config;
    for(var i=0;i<db_config.length;i++){
        document.getElementById(db_config[i]).querySelector('.plus').click();
        //dbs_to_open.splice(dbs_to_open.indexOf(dbid), 1);
    }
}
//вычеркивает id загруженной бд, если все загружены - загружет каналы
function checkOutDb(dbid){
    if(!dbs_to_open) return;
    dbs_to_open.splice(dbs_to_open.indexOf(dbid), 1);
    if(dbs_to_open && dbs_to_open.length == 0){
        //dbs_to_open.splice(dbs_to_open.indexOf(dbid), 1);
        preSetChannels(channels_to_open);
    }
}
//кликает по каждому нужному каналу, открывая новые полотна, если нужно
function preSetChannels(charts){
    for(var i=0;i<charts.length;i++){
        for(var j=0;j<charts[i].length;j++){
            var channel = charts[i][j];
            clickTheChannel(channel);
        }
        if((i<charts.length-1) && (charts[i].length != 0)){
            $(document).trigger("addNewChart");
        }
    }
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
}

function alertError(err){
    alertify.error(err.text);
    deactivateDatabase(err.dbid);
}

function searchAll(){
    var results = [];
    var isAnyDbOpened = false;
    //var results_n = 0;
    var output = "";

    databases.forEach(function(db){
        var temp_res = search(db.id);
        if(temp_res){
            isAnyDbOpened = true;
            //results_n+=temp_res.length;
            for(var i=0; i<temp_res.length; i++)
            {
                if(temp_res[i].type == "channel")
                {
                    temp_res[i].trueNodeId = temp_res[i].nodeId;
                    temp_res[i].nodeId = i;
                    temp_res[i].dbid = db.id;
                    results.push(temp_res[i]);
                }
            }
            //results = results.concat(temp_res);
        }
    })

    search_results = results;

    if(isAnyDbOpened){
        //output = '<p>' + results_n + ' matches found</p>';//+output;
        showSearchResults(search_results);
    }
    else{
        output = "There are no loaded Databases."
        $('#search_message').html(output);
    }

}

//обновить дерево БД
function refreshSearchTree(tree_name,data) {
    console.log(data);
    var db_li = $("#"+tree_name);
    var is_new_db_tree = !(db_li.siblings("#treefor_"+tree_name).length);
    db_li.siblings("#treefor_"+tree_name).remove();
    var treedb_tr = $("<tr>").attr("id","treefor_"+tree_name).append("<td>");
    var db_tree = $("<ul>").attr("id",tree_name+"_tree");
    treedb_tr.children("td").append(db_tree);
    db_li.after(treedb_tr);
    var test = db_tree.treeview(
        {
            data: data,//parseTree(data),
            levels: 1,          
            selectedColor: "white",
            selectedBackColor: "lightblue",
            multiSelect: true,
            highlightSearchResults: false,
            onNodeSelected: function(event, node) {
                //кликнуть на канал в начальном дереве
                clickTheChannel([node.dbid,node.trueNodeId]);
                //console.log(dbid,node);
                /*if(dbid=="db1"){
                    /*if(node.name=="orbits v3v4chan"){
                        window.open(window.location.href+"orbits?system=v3v4")
                    }
                    else */
                    /*var parent = $("#"+dbid+"_tree").treeview('getParent',node);
                    if((node.name=="v3v4chan"&&node.abscissa_tbl=="04_pkp_position")||(parent.name=="v3v4chan"&&parent.abscissa_tbl=="04_pkp_position")){
                        window.open(window.location.origin+"/orbits?system=v3v4");
                    }
            }
                if(node.type=="channel"){
                    $(document).trigger("treeChannelChosen",[node,dbid]);
                    //loadChannelData(node,dbid);
                    //$("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                }
                else if("data_tbl" in node)//(node.type=="system")||(node.type=="subsystem"))
                {
                    unselectCurrentSystemNode(); //развыбрать предыдущую выбранную систему
                    selected_sys = [dbid,node]; //присвоить в переменную новую систему
                    loadSelectedSystemTree();
                    $(document).trigger("treeSystemChosen",[node,dbid]); //посылаем событие - чтобы подсветить календарь
                }
                else{
                    $("#"+dbid+"_tree").treeview('unselectNode', [ node.nodeId, { silent: true } ]);
                    $("#"+dbid+"_tree").treeview('toggleNodeExpanded', [ node.nodeId, { silent: true } ]);
                }*/
            },
            //onNodeUnselected: function (event, node) {
              //  clickTheChannel([node.dbid,node.trueNodeId]);
                //db_tree.treeview('selectNode', [ channels[i].nodeid, { silent: true } ]);
                /*if(node.type=="channel"){
                    $("#"+dbid+"_tree").treeview('selectNode', [ node.nodeId, { silent: true } ]);
                }
                else if((node.type=="system")||(node.type=="subsystem"))
                {   
                    selected_sys = null;
                    $(document).trigger("treeSystemChosen",null); //посылаем событие - чтобы подсветить календарь
                }*/
           // }
        });
    db_li.addClass("opened");
};

function showSearchResults(results)
{
    $('#search_message').html(null);
    refreshSearchTree("search_result_tree",results);
    /*$('#search_output').empty();
    for(res of results)
    {
        var newdiv = document.createElement( "div" );
        newdiv.append(res.fullname);
        $('#search_output').append(newdiv);
    }*/
}

//выделить нужные каналы в дереве поиска
function selectChannelsInSearch(channels){
    //найдем нужные каналы в дереве поиска
    var channels_to_select = [];
    console.log(channels);
    for(var i=0; i<search_results.length; i++)
    {
        for(var j=0; j<channels.length; j++)
        {
            if(search_results[i].trueNodeId == channels[j].nodeId && channels[j].dbid == search_results[i].dbid)
            {
                channels_to_select.push(search_results[i].nodeId);
            }
        }
    }
    //console.log(channels,search_results,channels_to_select);
    //отменим выделение на всех выбранных сейчес нодах
    var db_tree = $("#search_result_tree_tree");
    var selectednodes = db_tree.treeview('getSelected');
    for(var j=0; j<selectednodes.length;j++){
        db_tree.treeview('unselectNode', [ selectednodes[j], { silent: true } ]);
    }
    //добавим выделение всем нужным каналам
    console.log(channels_to_select);
    for(var i = 0; i < channels_to_select.length; i++){
        db_tree.treeview('selectNode', [ channels_to_select[i], { silent: true } ]);
    }
}

function getOpenedDbs(){
    var result = []
    for(var i=0;i<databases.length;i++){
        var id = databases[i].id;
        var db_tree = $("#"+id+"_tree");
        if(db_tree.length){
            result.push(id);
        }
    }
    return result;
}

function search(dbid) {
    var db_tree = $("#"+dbid+"_tree");
    //if(!db_tree.length){
    if((!db_tree.length)/*||(db_tree.is(":hidden"))*/){
        return false;
    }
    var pattern = $('#input_search').val();
    var options = {
      ignoreCase: true,
      exactMatch: false,
      revealResults: false
    };
    db_tree.treeview('collapseAll', { silent: true });
    var result = [];
    var temp_res = db_tree.treeview('search', [ pattern, options ]);
    console.log(temp_res);
    if(temp_res instanceof Array)
    {
        result = JSON.parse(JSON.stringify(temp_res));
    }
    //db_tree.treeview('hideAll');
    return result;
}


//переключение между системами
function openNewTab(event){
    $("#dbtree").hide();
    $("#dbtree_search").hide();
    $("#"+event.target).show();
    /*$('#'+event.target).show();
    $('#'+event.target+'_graphset').show();
    $('#'+event.target+'dtr').show();
    if(event.target=="v3v4"){
        $("#v4").hide();
        $("#v4_graphset").hide();
        $("#v4dtr").hide();
    }
    else {
        $("#v3v4").hide();
        $("#v3v4_graphset").hide();
        $("#v3v4dtr").hide();
    }
    if(v3v4basicdata[event.target].loaded==false){
        loadStartSystemTable(event.target);
        //v3v4basicdata[event.target].loaded==true;
    }*/
}

function setActiveTab(id){
    w2ui['tree_tabs'].click(id);
}

//создание табов для систем
function setTabs() {
    $('#tree_tabs').w2tabs({
        name: 'tree_tabs',
        active: "dbtree",
        tabs: [
            { id: 'dbtree', text: 'DBTree' },
            { id: 'dbtree_search', text: 'Search' }
        ],
        onClick: function (event) {
            openNewTab(event)
        }
    });
    $("#dbtree_search").hide();
}

$(document).ready(function(){
    $('#input_search').keyup(function(e){
        //console.log("search_keyup")
        if (e.key === 'Enter' || e.which === 13 || (e.keyCode == 13)) {
            searchAll();
        };
    });
    setTabs();
});



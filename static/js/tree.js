
function parseTree(data){
    data.forEach(function(node){
        node.text = node.name;
        if('subsystems' in node && node.subsystems.length!=0){
            node.nodes = node.subsystems;
            parseTree(node.nodes);
        }
        else if ('groups' in node && node.groups.length!=0){
            node.nodes = node.groups;
            parseTree(node.nodes);
        }
        else if ('channels' in node && node.channels.length!=0){
            node.nodes = node.channels;
            parseTree(node.nodes);
        }
    });
    return data;
};

function refreshTree(dbid,data) {
    var db_li = $("#"+dbid);
    db_li.children("ul").remove();
    var db_tree = $("<ul>").attr("id",dbid+"_tree").appendTo(db_li);
    db_tree.treeview(
        {
            data: parseTree(data),
            levels: 1,
            multiSelect: true,
            onNodeSelected: function(event, node) {
                if(node.type=="channel"){
                    loadChannelData(node,dbid);
                }
            },
            onNodeUnselected: function (event, node) {
                if(node.type=="channel"){
                    removePlot(node.name);
                }                    
            }
        });
    document.body.style.cursor='default';
    db_li.addClass("opened");
};

function getDatatable(channel,dbid){
    var db_tree = $("#"+dbid+"_tree");
    var parent = channel;
    while (!("data_tbl" in parent)&&parent.parentId){
        parent = db_tree.treeview('getParent', parent);
    }
    return parent.data_tbl;
}

function loadChannelData(channel,dbid){
    var datatable = getDatatable(channel,dbid);
    if(datatable){
        var msg = {
            type: "channel_data",
            channel: channel,
            datatable: datatable,
            dbid: dbid,
            datetime: getDateTime(),
            chart: activechart
        };
        document.body.style.cursor='wait';
        sendMessageToServer(JSON.stringify(msg));
    }
}

function loadDatabaseTree(dbid){
    document.body.style.cursor='wait';
    var msg = {
        type: "tree_data",
        database: dbid
    };
    sendMessageToServer(JSON.stringify(msg));
}

function displayDatabases(data){
    var db_ul = $("#databases");
    data.forEach(function(db){
        db_ul.append($('<li>').attr('id',db.id).append("<p>"+db.name+"</p>").append("<button class='refresh'>").delegate('button','click',refreshDatabaseTree));
    });
    db_ul.children("li").children("p").click(showDatabaseTree);
}

function showDatabaseTree(event){
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
}

function refreshDatabaseTree(event){
    event.stopPropagation();
    var dbid = $(event.target).parent().attr('id');
    loadDatabaseTree(dbid);
}

function alertError(text){
    alert(text);
    console.log(text);
    document.body.style.cursor='default';
}


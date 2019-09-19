
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

function refreshTree(data) {
    $('#dbtree').treeview(
        {
            data: parseTree(data),
            levels: 1,
            multiSelect: true,
            //showCheckbox: true,
            onNodeSelected: function(event, node) {
                if(node.type=="channel"){
                    loadChannelData(node);
                }
            },
            onNodeUnselected: function (event, node) {
                if(node.type=="channel"){
                    removePlot(node.name);
                }                    }
            /*onNodeUnchecked: function (event, node) {
                if(node.type=="channel"){
                    removePlot(data);
                }            
            },
            onNodeSelected: function(event,data){
            }*/
        });
};

/*function getSubsystem(channel){
    var parent = channel;
    while(parent.type!="subsystem" && parent.type!="system"){
        parent = $('#dbtree').treeview('getParent', parent);
        console.log(parent);
    }
    return parent;
}*/

function getDatatable(channel){
    var parent = channel;
    while (!("data_tbl" in parent)){
        parent = $('#dbtree').treeview('getParent', parent);
    }
    return parent.data_tbl;
}

function loadChannelData(channel){
    document.body.style.cursor='wait';
    var datatable = getDatatable(channel); //.data_tbl;
    var msg = {
        type: "channel_data",
        channel: channel,
        datatable: datatable,
        datetime: getDateTime()
    };
    sendMessageToServer(JSON.stringify(msg));
    
    /*$.ajax({
        type: 'POST',
        url: '/get_channel_data/'+channel.name,
        datatype: 'json',
        data: {'datatable': datatable}
    })*/
}


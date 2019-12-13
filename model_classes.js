class SystemTree {
    constructor(dbname){
        this.dbname = dbname;
        this.systems = [];
        this.subsystems = [];
    }

    findSS(ss_id){
        var res = this.systems.find(o => o.ss_id === ss_id);
        if(res){
            return res;
        }
        res = this.subsystems.find(o => o.ss_id === ss_id);
        if(res){
            return res;
        }
        return null;
    }

    parseSystems(data) {
        var sys_ids = [];
        var sys, subsys;
        for(var i=0;i<data.length;i++){
            var ss = data[i];
            //if(!("status" in ss) || ss.status){
                if(sys_ids.includes(ss.sys_id)){
                    sys = this.systems.find(o => o.id === ss.sys_id);
                }
                else{
                    sys = new System(ss.sys_id,ss.system,ss.status);
                    sys_ids.push(ss.sys_id);
                    this.systems.push(sys);
                }
                if(ss.subsys_id){
                    subsys = new Subsystem(ss.subsys_id,ss.id,ss.subsystem,ss.data_tbl,ss.status);
                    sys.appendSubsystem(subsys);
                    this.subsystems.push(subsys);
                }
                else{
                    sys.setDatatable(ss.data_tbl);
                    sys.status = ss.status;
                    sys.ss_id = ss.id; 
                }
            //}
        }
    }

    setOneDatatable(data_tbl){
        for(var i=0;i<this.systems.length;i++){
            this.systems[i].setDatatable(data_tbl);
        }
    }

    parseGroups(data){
        for(var i=0;i<data.length;i++){
            var gr = data[i];
            //if(!("status" in gr) || gr.status){
                var group = new Group(gr.group_id,gr.name,gr.status);
                var ss = this.findSS(gr.ss_id);
                if(ss){
                    ss.appendGroup(group);
                }
            //}
        }
    }

    parseChannels(data){
        for(var i=0;i<data.length;i++){
            var ch = data[i];
            //if(!("status" in ch) || ch.status){
                var channel = new Channel(ch.name,ch.fullname,ch.address,ch._type,ch.unit,ch.divider,ch.status);
                var ss = this.findSS(ch.ss_id);
                if(ss&&ch.gr_id){
                    var group = ss.groups.find(o => o.id === ch.gr_id);
                    if(group){
                        group.appendChannel(channel);
                    }
                }
                else if(ss){
                    ss.appendChannel(channel);
                }
            //}
        }
    }
    
}
class System {
    constructor(id,name,status){
        this.id = id;
        this.name = name;
        this.type = "system";
        this.status = status;
        /*if(!this.status){
            this.state = {
                disabled: true
            }
        }*/
    }
    appendSubsystem(item){
        if(!this.subsystems){
            this.subsystems = [];
        }
        this.subsystems.push(item);
    }
    appendGroup(item){
        if(!this.groups){
            this.groups = [];
        }
        this.groups.push(item);
    }
    appendChannel(item){
        if(!this.channels){
            this.channels = [];
        }
        this.channels.push(item);
    }
    setDatatable(data_tbl){
        this.data_tbl = data_tbl;
    }
    findAll(regex){
        var result = [];
        this.subsystems.forEach(function(ss){
            result = result.concat(ss.findAll(regex));
        });
        this.groups.forEach(function(g){
            result = result.concat(g.findAll(regex));
        });
        this.channels.forEach(function(ch){
            if(ch.check(regex))
                result.push(ch);
        });
        return result;
    }
}
class Subsystem {
    constructor(id,ssid,name,data_tbl,status){
        this.id = id;
        this.ss_id = ssid;
        this.name = name;
        this.status = status;
        this.data_tbl = data_tbl;
        this.type = "subsystem";
        if(!this.status){
            this.state = {
                disabled: true
            }
        }
    }
    appendGroup(item){
        if(!this.groups){
            this.groups = [];
        }
        this.groups.push(item);
    }
    appendChannel(item){
        if(!this.channels){
            this.channels = [];
        }
        this.channels.push(item);
    }
    findAll(regex){
        var result = [];
        this.groups.forEach(function(g){
            result = result.concat(g.findAll(regex));
        });
        this.channels.forEach(function(ch){
            if(ch.check(regex))
                result.push(ch);
        });
        return result;
    }
}
class Group {
    constructor(id,name,status){
        this.id = id;
        this.name = name;
        this.status = status;
        this.channels = [];
        this.type = "group";
        if(!this.status){
            this.state = {
                disabled: true
            }
        }
    }
    appendChannel(item){
        this.channels.push(item);
    }
    findAll(regex){
        var result = [];
        this.channels.forEach(function(ch){
            if(ch.check(regex))
                result.push(ch);
        });
        return result;
    }
}
class Channel {
    constructor(name,fullname,address,type,unit,divider,status){
        this.name = name;
        this.fullname = fullname;
        this.address = address;
        this.datatype = type;
        this.unit = unit;
        this.divider = divider;
        this.status = status;
        this.type = "channel";
        if(!this.status){
            this.state = {
                disabled: true
            }
        }
    }
    check(regex){
        if(this.name.startsWith(regex)){
            return true;
        }
        return false;
    }
}

module.exports = {
    System: System,
    Subsystem: Subsystem,
    Group: Group,
    Channel: Channel,
    SystemTree: SystemTree
}
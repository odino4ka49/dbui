class System {
    constructor(id,name){
        this.id = id;
        this.name = name;
        this.subsystems = [];
        this.groups = [];
        this.channels = [];
        this.type = "system";
    }
    appendSubsystem(item){
        this.subsystems.push(item);
    }
    appendGroup(item){
        this.groups.push(item);
    }
    appendChannel(item){
        this.channels.push(item);
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
        this.groups = [];
        this.channels = [];
        this.type = "subsystem";
    }
    appendGroup(item){
        this.groups.push(item);
    }
    appendChannel(item){
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
    Channel: Channel
}
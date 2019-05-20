class System {
    constructor(id,name){
        this.id = id;
        this.name = name;
        this.subsystems = [];
        this.groups = [];
        this.channels = [];
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
    }
    appendGroup(item){
        this.groups.push(item);
    }
    appendChannel(item){
        this.channels.push(item);
    }
}
class Group {
    constructor(id,name,status){
        this.id = id;
        this.name = name;
        this.status = status;
        this.channels = [];
    }
    appendChannel(item){
        this.channels.push(item);
    }
}
class Channel {
    constructor(name,fullname,address,type,unit,divider,status){
        this.name = name;
        this.fullname = fullname;
        this.address = address;
        this.type = type;
        this.unit = unit;
        this.divider = divider;
        this.status = status;
    }
}

module.exports = {
    System: System,
    Subsystem: Subsystem,
    Group: Group,
    Channel: Channel
}
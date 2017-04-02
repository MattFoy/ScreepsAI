const utilities = require('utilities');
//const roles = require('roles');
let roles = '';

module.exports = function() {
  Room.prototype.getFreeSpawn = function() {
    let thisSpawns = _.filter(Game.spawns, (s) => (s.this.name === this.name));
    let spawn = thisSpawns[0];
    for (let i = 0; i < thisSpawns.length; i++) {
      if (!thisSpawns[i].spawning) {
        spawn = thisSpawns[i];
        break;
      }
    }
    return spawn;
  }

  Room.prototype.getTempStorage = function() {
    let flag = Game.flags[this.name + '_temp_storage'];
    if (flag && flag.pos.roomName === this.name) {
      let container = _.filter(flag.pos.lookFor(LOOK_STRUCTURES), (s) => s.structureType !== STRUCTURE_ROAD);
      if (container.length > 0 && container[0].structureType === STRUCTURE_CONTAINER) {
        //console.log('Found')
        return container[0];
      } else {
        //console.log("No container found.");
        return;
      }
    }
  }

  Room.prototype.drawFlowField = function(exitRoom) {
    let rv = new RoomVisual(this.name).clear();

    if (!this.memory.flowFields || !this.memory.flowFields[exitRoom]) {
      return;
    }
    
    for (let x = 1; x <= 48; x++) {
      if (!this.memory.flowFields[exitRoom][x]) { continue; }

      for (let y = 1; y <= 48; y++) {
        //console.log(x + ', ' + y);
        let text = '';
        let style = {color: 'green', font: 0.7};
        text = utilities.getVisualDirection(this.memory.flowFields[exitRoom][x][y]);
        if (text === 'x' || text === '?' ) {
          style.color = 'red';
        }
        rv.text(text, x, y, style);
      }
    }
    //console.log(rv.getSize())
  }

  Room.prototype.calculateFlowfield = function(exitRoom, exitDirection) {
    //let benchmarkStart = Game.cpu.getUsed();
    //console.log('Starting at ' + benchmarkStart + ' used.');
    let cpu_threshold = 400;

    if (!this.memory.flowFieldCacheExpiration) { this.memory.flowFieldCacheExpiration = {} };
    if (this.memory.flowFieldCacheExpiration[exitRoom] 
        && this.memory.flowFieldCacheExpiration[exitRoom].expiresOn >= Game.time) {
      //console.log(this.name + ':' + exitRoom + ', This flowfield has not expired yet.')
      return;
    }

    if (Game.cpu.bucket <= 8500 
      || Game.cpu.getUsed() > cpu_threshold) { 
      //console.log('CPU too low. Aborting.');
      return; 
    }

    console.log(this.name + ':' + exitRoom);
    
    if (!this.memory.flowFields) { this.memory.flowFields = {}; }
    if (!this.memory.flowFields[exitRoom] || this.memory.flowFields[exitRoom].length < 50) { 
      this.memory.flowFields[exitRoom] = [];
      for (let x = 0; x < 50; x++) {
        this.memory.flowFields[exitRoom][x] = [];
        for (let y = 0; y < 50; y++) {
          this.memory.flowFields[exitRoom][x][y] = 0;
        }
      }
    }

    if (!this.memory.flowFieldCacheExpiration) { this.memory.flowFieldCacheExpiration = {}; }
    if (!this.memory.flowFieldCacheExpiration[exitRoom]) { this.memory.flowFieldCacheExpiration[exitRoom] = {}; }

    
    let xy = 0;
    if (this.memory.flowFieldCacheExpiration[exitRoom].currentXY) {
      xy = this.memory.flowFieldCacheExpiration[exitRoom].currentXY;
    }

    console.log('calculating flowfield for ' + this.name + ' for exit: ' + exitRoom + ' starting at ' + xy);

    while (Game.cpu.getUsed() < cpu_threshold && xy < 2500) {
      let y = (xy % 50);
      let x = Math.floor(xy / 50);
      //console.log(x + ',' + y);
      let pos = this.getPositionAt(x,y);
      if (!pos) { console.log(xy + ', ' + JSON.stringify(pos)); continue; }
      let walkable = pos.isPathable(true);
      if (walkable) {
        let direction = pos.getDirectionOfTravel(this.find(exitDirection));
        if (direction === undefined) { direction = 0; }          
        this.memory.flowFields[exitRoom][x][y] = direction;
      } else {              
        this.memory.flowFields[exitRoom][x][y] = 0;
      }
      xy++;
      this.memory.flowFieldCacheExpiration[exitRoom].currentXY = xy;
    }

    if (this.memory.flowFieldCacheExpiration[exitRoom].currentXY == 2500) {
      this.memory.flowFieldCacheExpiration[exitRoom].expiresOn = Game.time + 10000;
      this.memory.flowFieldCacheExpiration[exitRoom].currentXY = 1;
      console.log('Completed ' + exitRoom + ' for ' + this.name);
    }
    //timeUsed = Game.cpu.getUsed() - benchmarkStart;
    //console.log('Used ' + timeUsed + ' calculating flowField');
  }

  Room.prototype.getHostilesDetails = function(GameState) {
    let ret = [];

    let hostiles = this.find(FIND_HOSTILE_CREEPS, { filter: function(c) { return (!c.owner 
      || GameState.allies.indexOf(c.owner.username) === -1 
      && (c.getActiveBodyparts(ATTACK) > 0 
        || c.getActiveBodyparts(RANGED_ATTACK) > 0
        || c.getActiveBodyparts(HEAL) > 0
        //|| c.getActiveBodyparts(WORK) > 0
        //|| c.getActiveBodyparts(CARRY) > 0
        )
    )}});

    for (let i = 0; i < hostiles.length; i++) {

      let parts = _.groupBy(hostiles[i].body, 'type');

      let attackPower = _.sum(_.map(parts[ATTACK], function(part) {
        return ATTACK_POWER * (part.boost ? BOOSTS[part.type][part.boost].attack : 1);
      }));

      let rangedPower = _.sum(_.map(parts[RANGED_ATTACK], function(part) {
        return RANGED_ATTACK_POWER * (part.boost ? BOOSTS[part.type][part.boost].rangedAttack : 1);
      }));

      let healPower = _.sum(_.map(parts[HEAL], function(part) {
        return HEAL_POWER * (part.boost ? BOOSTS[part.type][part.boost].heal : 1);
      }));

      let toughness = _.sum(_.map(hostiles[i].body, function(part) {
        return 100 / ((part.type === TOUGH && part.boost) ? BOOSTS[TOUGH][part.boost].damage : 1);
      }));

      let detail = {
        id: hostiles[i].id,
        owner: (hostiles[i].owner && hostiles[i].owner.username ? hostiles[i].owner.username : ''),
        attackPower: attackPower,
        rangedPower: rangedPower,
        healPower: healPower,
        toughness: toughness
      };
      //console.log(JSON.stringify(detail));

      ret.push(detail);
    }

    return ret;
  }

  Room.prototype.getUnreservedReservable = function(roleName, filterCallBack) {
    if (!this.memory.roleReservables || !this.memory.roleReservables[roleName] || this.memory.roleReservables[roleName].length <= 0) {
      return;
    }

    if (!filterCallBack) {
      filterCallBack = function() { return true; };
    }

    let reservables = _.filter(this.memory.roleReservables[roleName], filterCallBack);
    let otherCreeps = _.filter(Game.creeps, (c) => c.memory.role === roleName 
      && c.memory.origin === this.name 
      && (!c.ticksToLive 
        || !c.memory.replaceBefore
        || c.ticksToLive > c.memory.replaceBefore));

    for (let i = 0; i < reservables.length; i++) {
      let consider = reservables[i];
      let unreserved = true;
      otherCreeps.forEach(function(c) {
        if (c.memory.roleSpecificFlag === consider) {
          unreserved = false;
        }
      });
      if (unreserved) { return consider; }
    }
    return;
  }

  Room.getType = function(roomName) {
    let res = /[EeWw](\d+)[NnSs](\d+)/.exec(roomName)
    let EW = res[1];
    let NS = res[2];
    
    if (EW % 10 == 0 || NS % 10 == 0) {
        return 'Highway'
    } else if (EW % 10 == 5 && NS % 10 == 5) {
        return 'Center'
    } else if (EW % 10 >= 4 && EW % 10 <= 6 && NS % 10 >= 4 && NS % 10 <= 6) {
        return 'SourceKeeper'
    } else {
        return 'Room'
    }
  }
}
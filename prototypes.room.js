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

  Room.prototype.getDistanceTo = function(roomName) {
    let thisRoom = this.name;
    return Game.map.findRoute(thisRoom, Game.rooms[roomName], {
      routeCallback: (roomName) => {
        if (Game.map.getRoomLinearDistance(thisRoom, roomName) > 8) {
          return false;
        }
        let parsed;
        if (!parsed) {
          parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
        }
        let fMod = parsed[1] % 10;
        let sMod = parsed[2] % 10;
        let isSK = !(fMod === 5 && sMod === 5) &&
          ((fMod >= 4) && (fMod <= 6)) &&
          ((sMod >= 4) && (sMod <= 6));
        if (isSK) {
          return 10;
        } else {
          return 1;
        }
      }
    }).length;
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
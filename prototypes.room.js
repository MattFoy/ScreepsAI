const utilities = require('utilities');
require('prototypes.structureTerminal')();

module.exports = function() {
  Room.prototype.requestResource = function(resourceType, amount, buyIfMising) {
    console.log('[' + this.name + '] requesting ' + amount + ' ' + resourceType);
    let amountNeeded = amount;
    for (const roomName in Game.rooms) {
      let room = Game.rooms[roomName];
      if (amountNeeded <= 0) { break; }
      if (room.controller && room.controller.my && room.terminal) {
        if (room.terminal.store[resourceType] && room.terminal.store[resourceType] > 1000) {
          let amountToSend = Math.min(room.terminal.store[resourceType], amountNeeded);
          if (OK === room.terminal.send(resourceType, amountToSend, this.name)) {
            amountNeeded -= amountToSend;
            console.log(room.name + ' sent ' + resourceType + ' x' + amountToSend + ' to ' + this.name);
          }
        }
      }
    }

    if (amountNeeded > 0 && buyIfMising) {
      this.terminal.buy(resourceType, amountNeeded);
      console.log('Buying the remainder. ' + resourceType + ' x' + amountNeeded);
    }
  }

  Room.prototype.remoteMine = function(targetRoomName) {
    if (!this.controller || !this.controller.my) {
      console.log('Not my room');
      return ERR_INVALID_ARGS;
    }

    let targetRoom = Game.rooms[targetRoomName];
    if (!targetRoom) { 
      console.log('Invalid target')
      return ERR_INVALID_ARGS; 
    }

    if (targetRoom.controller 
      && ((targetRoom.controller.owner 
        && targetRoom.controller.owner.username 
        && !targetRoom.controller.my)
      || (targetRoom.controller.reservation 
        && targetRoom.controller.reservation.username !== GameState.username))) {
      console.log('Cannot mine this room');
      return ERR_INVALID_ARGS;
    }

    let target;
    if (this.storage) {
      target = this.storage;
    } else {
      let spawns = this.find(FIND_MY_SPAWNS);
      if (spawns.length > 0) {
        target = spawns[0];
      }
    }

    if (!target) { 
      console.log('No target for pathing');
      return ERR_INVALID_ARGS; 
    }

    let sources = targetRoom.find(FIND_SOURCES);
    let minerals = targetRoom.find(FIND_MINERALS, { filter: 
      (mineral) => _.filter(mineral.pos.lookFor(LOOK_STRUCTURES), 
        (s) => s.structureType === STRUCTURE_EXTRACTOR).length > 0 });

    let destinations = _.map(sources, (source) => {
      return {
        pos: source.pos,
        id: source.id,
        roleReservable: 'miner'
      };
    }).concat(_.map(minerals, (mineral) => {
      return {
        pos: mineral.pos,
        id: mineral.id,
        roleReservable: 'mineralExtractor'
      };
    }));

    let plannedRoads = [];
    let plannedContainers = [];

    for (let i = 0; i < destinations.length; i++) {
      let destination = destinations[i];

      let result = PathFinder.search(
        target.pos, 
        { pos: destination.pos, range: 1},
        {
          plainCost: 2,
          swampCost: 10,
          roomCallback: function(roomName) {
            //console.log('callback: ' + roomName);
            let room = Game.rooms[roomName];
            if (!room) { return; }

            let costs = new PathFinder.CostMatrix;

            let structs = room.find(FIND_STRUCTURES);

            structs.forEach(function(struct) {
              if (struct.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(struct.pos.x, struct.pos.y, 1);
              } else if (OBSTACLE_OBJECT_TYPES.indexOf(struct.structureType) > -1
                || (struct.structureType === STRUCTURE_RAMPART && !struct.my)) {
                // Can't walk through non-walkable buildings
                costs.set(struct.pos.x, struct.pos.y, 0xff);
              }
            });

            _.filter(Game.constructionSites, 
              (cs) => cs.pos.roomName === roomName 
                && cs.structureType === STRUCTURE_ROAD
            ).forEach((cs) =>
              costs.set(cs.pos.x, cs.pos.y, 1)
            );

            // treat planned roads like roads
            _.filter(plannedRoads, 
              (pos) => pos.roomName === roomName
            ).forEach((pos) =>
              costs.set(pos.x, pos.y, 1)
            );

            return costs;
          },
          maxOps: 20000000,
          maxRooms: 4
        }
      );

      if (result && result.path && result.path.length > 0) {
        for (var j = 0; j < result.path.length - 1; j++) {
          plannedRoads.push(result.path[j]);
        }
        plannedContainers.push(result.path[result.path.length - 1]);
        let flagName = destination.pos.roomName + '_' + destination.id.slice(-4);
        
        targetRoom.createFlag(
          result.path[result.path.length - 1].x,
          result.path[result.path.length - 1].y,
          flagName);

        if (this.memory.roleReservables[destination.roleReservable].indexOf(flagName) === -1) {
          this.memory.roleReservables[destination.roleReservable].push(flagName);
        }
      }
    }

    for (var i = 0; i < plannedRoads.length; i++) {
      Game.rooms[plannedRoads[i].roomName].visual.text('o', plannedRoads[i].x, plannedRoads[i].y);
      Game.rooms[plannedRoads[i].roomName].createConstructionSite(
        plannedRoads[i].x, 
        plannedRoads[i].y, 
        STRUCTURE_ROAD);
    }
    for (var i = 0; i < plannedContainers.length; i++) {
      Game.rooms[plannedContainers[i].roomName].visual.text('X', plannedContainers[i].x, plannedContainers[i].y); 
      Game.rooms[plannedContainers[i].roomName].createConstructionSite(
        plannedContainers[i].x, 
        plannedContainers[i].y, 
        STRUCTURE_CONTAINER);
    }

    if (this.memory.responsibleForRooms.indexOf(targetRoomName) === -1) {
      this.memory.responsibleForRooms.push(targetRoomName);
    }

    function configureControllerFlag(targetRoom) {
      if (targetRoom.controller) {
        for (var x = targetRoom.controller.pos.x - 1;
          x <= targetRoom.controller.pos.x + 1; x++) {
          for (var y = targetRoom.controller.pos.y - 1;
            y <= targetRoom.controller.pos.y + 1; y++) {
            targetRoom.visual.text('o',x,y);
            let roomPos = targetRoom.getPositionAt(x, y);
            if (roomPos.isPathable()) {
              if (roomPos.lookFor(LOOK_STRUCTURES).length === 0) {
                let res = targetRoom.createFlag(x, y, 'reserve_' + targetRoom.name);
                console.log(res);
                if (typeof(res) === 'string') {
                  return 'reserve_' + targetRoom.name;
                }
              }
            }
          }
        }
      }
    }

    let reserveFlagName = configureControllerFlag(targetRoom);
    console.log('reserve flag: ' + reserveFlagName);
    if (reserveFlagName && this.memory.roleReservables['roomReserver'].indexOf(reserveFlagName) === -1) {
      this.memory.roleReservables['roomReserver'].push(reserveFlagName);
    }

    return OK;

  }

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
    return Game.map.findRoute(thisRoom, roomName, {
      routeCallback: (roomName) => {
        if (Game.map.getRoomLinearDistance(thisRoom, roomName) > 20) {
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
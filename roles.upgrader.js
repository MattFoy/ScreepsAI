require('prototypes')();
const profiler = require('screeps-profiler');

let roleUpgrader = {

  spawnType: 'quota',
  recycleOnWound: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    if(creep.memory.upgrading && creep.carry.energy == 0) {
      creep.memory.upgrading = false;
    }
    if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
      creep.memory.upgrading = true;
    }

    if(creep.memory.upgrading) {
      creep.goUpgrade();
    } else {
      if (creep.room.memory.sweetUpgrades) {
        creep.goUpgrade();
      } else {
        creep.goGetEnergy(false, true);
      }
    }
    if (!Game.rooms[creep.memory.origin].controller.sign 
      || Game.rooms[creep.memory.origin].controller.sign.text !== GameState.signMessages['upgrader']) {
      if (creep.signController(Game.rooms[creep.memory.origin].controller, GameState.signMessages['upgrader'])) {
        creep.moveTo(Game.rooms[creep.memory.origin].controller);
      }
    }
  }, 'run:upgrader'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;
    if (room.controller.level === 8) {
      return [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY];
    } else {
      if (room.memory.sweetUpgrades) {
        let maxEnergy = room.energyCapacityAvailable;
        
        if (room.storage && room.storage.store[RESOURCE_ENERGY] < 200000) {
            maxEnergy = Math.min(2050, maxEnergy);
        }

        var segment = [WORK,WORK,MOVE];
        var body = [CARRY];
        maxEnergy -= BODYPART_COST[CARRY];
        var segmentCost = _.sum(segment, (p) => BODYPART_COST[p]);

        do {
          body = segment.concat(body);
          maxEnergy -= segmentCost;
        } while (maxEnergy - segmentCost > 0 && (body.length + segment.length) <= MAX_CREEP_SIZE)

        return body;
      } else {
        if (maxEnergy >= 2300) {
          // Work * 11 Carry * 1 Move * 3
          //return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY];
          return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY];
        } else if (maxEnergy >= 1550) {
          return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY];
        } else if (maxEnergy >= 1300) {
          return [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE];
        } else if (maxEnergy >= 800) {
          return [WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE];
        } else if (maxEnergy >= 550) {
          return [WORK, WORK, WORK, MOVE, CARRY, MOVE, CARRY, MOVE];
        } else {
          return [WORK,MOVE,CARRY,MOVE];
        }
      }
    }
  },

  getQuota: function(room, rolesInRoom) {
    if (room.controller.level === 8) {
      return 1;
    } else {
      if (room.find(FIND_CONSTRUCTION_SITES, { filter: (cs) => cs.structureType === STRUCTURE_EXTENSION }).length > 0) {
        return 1;
      } else {
        if (room.storage && room.storage.store[RESOURCE_ENERGY] > 200000) {
          return 3;
        } else if (room.storage && room.storage.store[RESOURCE_ENERGY] > 100000) {
          return 2;
        } else if (room.storage && room.storage.store[RESOURCE_ENERGY] > 50000) {
          return 1;
        } else if (room.storage && room.storage.store[RESOURCE_ENERGY] <= 50000) {
          return 0;
        } else {
          return 2;
        }
      }
    }
  },

  determinePriority: function(room, rolesInRoom) {
    return 45;  
  }
};

module.exports = roleUpgrader;
require('prototypes')();
const profiler = require('screeps-profiler');

let roleTrucker = {

  spawnType: 'quota',
  recycleOnWound: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let task = "";

    if (!creep.memory.targetStorageId) { 
      _.filter(Game.rooms, (r) => r.storage).forEach(function (room) {
        if (room.storage && room.storage.store[RESOURCE_ENERGY] < 300000) {
          if (_.filter(Game.creeps, (c) => 
              c.memory.origin === creep.memory.origin 
              && c.memory.targetStorageId === room.storage.id
            ).length <= 2) {
            creep.memory.targetStorageId = room.storage.id;
            //break;
          }
        }
      });
    }

    if(creep.memory.delivering && creep.carry.energy == 0) {
      creep.memory.delivering = false;
    }
    if(!creep.memory.delivering && creep.carry.energy == creep.carryCapacity) {
      creep.memory.delivering = true;
    }

    if(creep.memory.delivering) {
      let target = Game.getObjectById(creep.memory.targetStorageId);

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.travelTo(target, { range: 1 });
        }
      } else {
        // uh oh...
      }

    } else {
      let target = Game.rooms[creep.memory.origin].storage;
      if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.travelTo(target, { range: 1 });
        }
      } else {
        // uh oh...
      }
    }

    //creep.say();
  }, 'run:trucker'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

    var segment = [CARRY,MOVE];
    var body = [];
    var segmentCost = _.sum(segment, (p) => BODYPART_COST[p]);

    do {
      body = body.concat(segment);
      maxEnergy -= segmentCost;
    } while (maxEnergy - segmentCost > 0 && (body.length + segment.length) <= MAX_CREEP_SIZE)

    return body;
  },

  getQuota: function(room, rolesInRoom) {
    let quota = 0;
    if (room.storage && room.storage.store[RESOURCE_ENERGY] > 600000) {      
      _.filter(Game.rooms, (r) => r.storage).forEach(function (room) {
        if (room.storage && room.storage.store[RESOURCE_ENERGY] < 300000) {
          quota += 3;
        }
      });
    }
    return quota;
  },

  determinePriority: function(room, rolesInRoom) {
    return 31;  
  }
};

module.exports = roleTrucker;
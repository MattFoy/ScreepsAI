require('prototypes')();
const profiler = require('screeps-profiler');

let roleTrucker = {

  spawnType: 'quota',
  recycleOnWound: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let task = "";

    if(creep.memory.delivering && creep.carry.energy == 0) {
      creep.memory.delivering = false;
      if (creep.memory.distanceToTarget && creep.memory.distanceToTarget > 1) {
        if (creep.memory.distanceToTarget * 2 + 20 < creep.ticksToLive) {
          creep.memory.role = 'suicide';
          console.log('Trucker has ' + creep.ticksToLive + ' TTL. Cannot make it there and back again.'
            + ' Distance: ' + creep.memory.distanceToTarget);
        }
      }
    }
    if(!creep.memory.delivering && creep.carry.energy == creep.carryCapacity) {
      creep.memory.delivering = true;
    }

    if (creep.memory.travelTimer) {
      creep.memory.distanceToTarget++;
    }

    if(creep.memory.delivering) {
      let storage = Game.rooms[creep.memory.origin].storage;

      if (storage) {
        for (let res in creep.carry) {
          if (creep.transfer(storage, res) === ERR_NOT_IN_RANGE) {
            creep.travelTo(storage, { range: 1 });
          } else {
            if (creep.memory.travelTimer) {
              delete creep.memory.travelTimer;
            }
          }
          break;
        }
      } else {
        // uh oh...
      }

    } else {
      let targetRoom = Game.rooms[creep.memory.targetRoom];
      if (!targetRoom) {
        creep.travelTo({x:25, y:25, roomName:creep.memory.targetRoom});
      } else {
        let targetStorage;
        if (targetRoom.terminal) {
          targetStorage = targetRoom.terminal
        } if (targetRoom.storage) {
          targetStorage = targetRoom.storage;
        } else {
          // look for containers?
        }

        if (targetStorage) {
          if (targetStorage.store) {
            for (let res in targetStorage.store) {
              if (creep.withdraw(targetStorage, res) === ERR_NOT_IN_RANGE) {
                creep.travelTo(targetStorage, { range: 1 });
              } else {
                if (!creep.memory.distanceToTarget) {
                  creep.memory.distanceToTarget = 1;
                  creep.memory.travelTimer = true;
                }
              }
              break;
            }
          }
        }
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

    return quota;
  },

  determinePriority: function(room, rolesInRoom) {
    return 31;  
  }
};

module.exports = roleTrucker;
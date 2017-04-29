require('prototypes')();
const profiler = require('screeps-profiler');

let roleTrucker = {

  spawnType: 'quota',
  recycleOnWound: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let task = "";

    if(creep.memory.delivering && _.sum(creep.carry) == 0) {
      creep.memory.delivering = false;
      if (creep.memory.distanceToTarget && creep.memory.distanceToTarget > 1) {
        if (creep.memory.distanceToTarget * 2 + 20 > creep.ticksToLive) {
          creep.memory.role = 'suicide';
          console.log('Trucker has ' + creep.ticksToLive + ' TTL. Cannot make it there and back again.'
            + ' Distance: ' + creep.memory.distanceToTarget);
        }
      }
    }
    if(!creep.memory.delivering && _.sum(creep.carry) == creep.carryCapacity) {
      creep.memory.delivering = true;
    }

    if (creep.memory.travelTimer) {
      creep.memory.distanceToTarget++;
    }

    if(creep.memory.delivering) {
      let storage = Game.rooms[creep.memory.origin].storage;

      if (storage) {
        for (let res in creep.carry) {
          if (!creep.carry[res]) { continue; }
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
        if (!creep.memory.travelToTarget) {
          creep.memory.travelToTarget = {x:25, y:25, roomName:creep.memory.targetRoom};
        }
        creep.travelTo(creep.memory.travelToTarget);
      } else {
        let targetStorage;
        if (targetRoom.terminal) {
          targetStorage = targetRoom.terminal
        } else if (targetRoom.storage) {
          targetStorage = targetRoom.storage;
        } else {
          // look for containers?
        }
        if (!creep.memory.travelToTarget) {
          creep.memory.travelToTarget = targetStorage.pos;
        } else if (targetStorage.pos.getRangeTo2(creep.memory.travelToTarget) > 1) {
          creep.memory.travelToTarget = targetStorage.pos;
        }

        if (targetStorage) {
          if (targetStorage.store) {
            for (let res in targetStorage.store) {
              if (!targetStorage.store[res]) { continue; }

              if (creep.withdraw(targetStorage, res) === ERR_NOT_IN_RANGE) {
                creep.travelTo(creep.memory.travelToTarget, { range: 1 });
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

    creep.say('$$$', true);
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
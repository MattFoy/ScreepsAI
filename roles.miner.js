require('prototypes')();
const profiler = require('screeps-profiler');

let roleMiner = {

  spawnType: 'reservation',
  recycleOnWound: true,
  flees: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    if (!creep.memory.roleSpecificFlag) {
      creep.reserveRoleSpecificFlag(Game.rooms[creep.memory.origin].memory.roleReservables['miner']);
    }
    
    if (creep.memory.roleSpecificFlag && creep.ticksToLive) {

      let flag = Game.flags[creep.memory.roleSpecificFlag];
      if (!flag) {
        console.log(creep.memory.roleSpecificFlag + "")
        return;
      }

      if (creep.room.name === flag.pos.roomName && creep.pos.getRangeTo(flag) < 2) {
        if (!creep.memory.sourceReached) {
          creep.memory.sourceReached = true;
          creep.memory.replaceBefore = (creep.body.length * 3) + creep.memory.ticksToSource;
          //console.log(creep.memory.replaceBefore);
        }
      }

      if (!(creep.room.name === flag.pos.roomName && creep.pos.x === flag.pos.x && creep.pos.y === flag.pos.y)) {
        creep.memory.atDestination = false;
      } else {
        creep.memory.atDestination = true;
      }

      //console.log(creep.name + ': ' + creep.memory.replaceBefore);

      if (!creep.memory.atDestination) {
        creep.travelTo(flag, { range: 0 });
                
        if (creep.ticksToLive !== undefined) {
          if (!creep.memory.sourceReached) {
            if (!creep.memory.ticksToSource) { 
              creep.memory.ticksToSource = 1;
            } else {
              creep.memory.ticksToSource++;
            }
          }
        }
      } else {
        if (creep.harvest(creep.pos.findClosestByRange(FIND_SOURCES, 1)) == ERR_NOT_ENOUGH_RESOURCES) {
          if (creep.carry.energy === 0) {
            creep.tryToPickUp();
          }
          
          let repairTargets = creep.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: function(structure) {
              return structure.hits < structure.hitsMax
                && structure.hitsMax - structure.hits > REPAIR_POWER
                && structure.hits < 15e+5;
            }
          });
          repairTargets.sort(function (a,b) {return (a.hits - b.hits)});
          if (repairTargets.length > 0) {
            creep.repair(repairTargets[0]);
          } else {
            let target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, 3);
            if(target) {
              creep.build(target);    
            }
          }
        }
      }
    }
  }, 'run:miner'),

  determineBodyParts: function(room, reservable) {
    let maxEnergy = room.energyCapacityAvailable;
    let flag = Game.flags[reservable];
    if (flag) {
      if (flag.pos.roomName !== room.name) {
        if (flag.room && flag.room.controller) {
          if (flag.room.controller.reservation || flag.room.controller.my) {
            if (maxEnergy >= 1300) {
              return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE];
            } else if (maxEnergy >= 800) {
              return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
            } else if (maxEnergy >= 550) {
              return [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
            } else {
              return [WORK, WORK, MOVE];
            }
          } else {
            if (maxEnergy >= 550) {
              return [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
            } else {
              // this should not occur...
              return [WORK, WORK, MOVE];
            }
          }
        } else {
          // a SK room?

          // todo: check this case...

          if (maxEnergy >= 3000) {
            return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
          } if (maxEnergy >= 1300) {
            return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE];
          } else if (maxEnergy >= 800) {
            return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
          }
        }
      } else {
        // a claimed room, so don't go up to the "3000" energy case, 
        // just 1300 since containers decay less rapidly
        if (maxEnergy >= 1300) {
          return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE];
        } else if (maxEnergy >= 800) {
          return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
        }
      }
    } 

    if (maxEnergy >= 550) {
      return [WORK, WORK, WORK, WORK, WORK, MOVE];  
    } else {
      return [WORK, WORK, MOVE];
    }    
  },

  reservableFilter: function(reservable) {
    let flag = Game.flags[reservable];
    if (!flag || !flag.room) { return false; } // just assume the mineral is on cooldown in rooms we don't have vision on...
    
    if (flag.room.controller && flag.room.controller.my && flag.room.energyCapacityAvailable < 550) { 
      return false;
    } else {
      return true;
    }
  },

  determinePriority: function(room, rolesInRoom) {
    return 40 + (rolesInRoom['miner'] ? rolesInRoom['miner'].length * 3 : 0);  
  }
};

module.exports = roleMiner;
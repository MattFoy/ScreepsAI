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

      if (!creep.memory.sourceReached && creep.room.name === flag.pos.roomName && creep.pos.getRangeTo(flag) < 2) {
        creep.memory.sourceReached = true;
        creep.memory.replaceBefore = (creep.body.length * 3) + creep.memory.ticksToSource;
      }

      if (!(creep.room.name === flag.pos.roomName && creep.pos.x === flag.pos.x && creep.pos.y === flag.pos.y)) {
        creep.memory.atDestination = false;
      } else {
        creep.memory.atDestination = true;
      }

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
        if (!creep.memory.sourceId) {
          if (flag.room) {
            let source = flag.pos.findClosestByRange(FIND_SOURCES);
            if (source) {
              creep.memory.sourceId = source.id;
            }
          }
        }

        if (creep.memory.sourceId) {
          let source = Game.getObjectById(creep.memory.sourceId);
          if (source.energy > 0) {
            //creep.say('Mining');
            creep.harvest(source); 
            if (creep.memory.interimBuild) {
              delete creep.memory.interimBuild;
            }
          } else {
            //creep.say('Repair');
            if (!creep.memory.interimBuild || (creep.memory.interimBuild.sleepUntil 
              && Game.time - creep.memory.sleepUntil > 0 )) {
              creep.memory.interimBuild = {}

              let target;
              let constructionSites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3);
              if (constructionSites.length > 0) { target = constructionSites[0]; }

              if(target) {
                creep.memory.interimBuild.target = target.id;
                creep.memory.interimBuild.mode = 'b';
              } else {
                let repairTargets = creep.pos.findInRange(FIND_STRUCTURES, 3, {
                  filter: function(structure) {
                    return structure.hits < structure.hitsMax
                      && structure.hitsMax - structure.hits > REPAIR_POWER
                      && structure.hits < 15e+5;
                  }
                });
                repairTargets.sort(function (a,b) {return (a.hits - b.hits)});
                if (repairTargets.length > 0) {
                  creep.memory.interimBuild.target = repairTargets[0].id;
                  creep.memory.interimBuild.mode = 'r';
                }
              }

              if (!creep.memory.interimBuild.target) {
                creep.memory.interimBuild.sleepUntil = Game.time + source.ticksToRegeneration + 1;
              } 
            }

            if (creep.carry.energy < creep.carryCapacity) {
              creep.tryToPickUp();
            }

            if (creep.memory.interimBuild 
              && creep.memory.interimBuild.target
              && creep.memory.interimBuild.mode) {
              let target = Game.getObjectById(creep.memory.interimBuild.target);
              if (target) {
                if (creep.memory.interimBuild.mode === 'b') {
                  creep.build(target);
                } else if (creep.memory.interimBuild.mode === 'r') {
                  creep.repair(target);
                } else {
                  console.log("Invalid interimBuild mode: " + creep.memory.interimBuild.mode);
                  delete creep.memory.interimBuild;
                  return;
                }
              } else {
                delete creep.memory.interimBuild;
                return;
              }
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
              return Array(8).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(4).fill(MOVE));
            } else if (maxEnergy >= 800) {
              return Array(6).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(3).fill(MOVE));
            } else if (maxEnergy >= 550) {
              return Array(4).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(2).fill(MOVE));
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
            return Array(12).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(6).fill(MOVE));
          } if (maxEnergy >= 1300) {
            return Array(8).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(4).fill(MOVE));
          } else if (maxEnergy >= 800) {
            return Array(6).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(3).fill(MOVE));
          }
        }
      } else {
        // a claimed room, so don't go up to the "3000" energy case, 
        // just 1300 since containers decay less rapidly
        if (maxEnergy >= 1300) {
          return Array(8).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(4).fill(MOVE));
        } else if (maxEnergy >= 800) {
          return Array(6).fill(WORK).concat(Array(1).fill(CARRY)).concat(Array(3).fill(MOVE));
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
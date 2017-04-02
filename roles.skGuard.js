require('prototypes')();
const profiler = require('screeps-profiler');

let roleSKGuard = {

  spawnType: 'reservation',
  recycleOnWound: false,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {

    creep.memory.replaceBefore = 400;

    if (!creep.memory.roleSpecificFlag) {
      let room = Game.rooms[creep.memory.origin];
      if (room.memory.skMines) {
        creep.reserveRoleSpecificFlag(room.memory.skMines);
      }
    }

    let heal = true;
    if (creep.memory.roleSpecificFlag) {
      let flag = Game.flags[creep.memory.roleSpecificFlag];
      if (flag) {
        if (creep.room.name !== flag.pos.roomName) {
          creep.travelTo(flag);
        } else {
          let target = null;
          if (creep.memory.targetSK) {
            target = Game.getObjectById(creep.memory.targetSK);
            if (!target) {
              creep.memory.targetSK = null;
            }
          }

          if (!creep.memory.targetSK) {
            let targets = creep.room.find(FIND_HOSTILE_CREEPS);
            if (targets.length > 0) {
              target = creep.pos.findClosestByPath(targets);
              creep.memory.targetSK = target.id;
            }
          }
          
          target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

          if (target) {
            if (creep.memory.targetSKLair) {
              creep.memory.targetSKLair = null;
            }
            let result = creep.attack(target);
            if (result === ERR_NOT_IN_RANGE) {
              creep.moveTo(target);
            } else if (result === OK) {
              heal = false;
            } else {
              console.log("Uh Oh: " + result);
            }
          } else {
            let lair = null;
            if (creep.memory.targetSKLair) {
              lair = Game.getObjectById(creep.memory.targetSKLair);
              if (!lair) {
                creep.memory.targetSKLair = null;
              }
            }

            if (!creep.memory.targetSKLair) {
              let skLairs = creep.room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR });
              skLairs.sort((a,b) => a.ticksToSpawn - b.ticksToSpawn);
              lair = skLairs[0];
              creep.memory.targetSKLair = lair.id;
            }

            if (lair && creep.pos.getRangeTo(lair) > 1) {
              creep.travelTo(lair, {range: 1});
            } else {
              // just wait, I guess?
              creep.memory.targetSKLair = null;
            }
          }      
        }
      }
    }    

    if (heal) {
      if (creep.hits < creep.hitsMax) {
        creep.heal(creep);
      } else {
        // heal nearby miners / other guards?
        let woundedCreeps = creep.room.find(FIND_MY_CREEPS, { filter: function(c) {
          return c.hits < c.hitsMax 
            && c.pos.getRangeTo(creep) <= 3;
        }});
        woundedCreeps.sort((a,b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
        if (woundedCreeps.length > 0) {
          if (creep.heal(woundedCreeps[0]) === ERR_NOT_IN_RANGE) {
            creep.rangedHeal(woundedCreeps[0]);
          }
        }
      }
    }
  }, 'run:skGuard'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

    let body = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];

    return body;
  },

  determinePriority: function(room, rolesInRoom) {
    return 9;  
  }
};

module.exports = roleSKGuard;
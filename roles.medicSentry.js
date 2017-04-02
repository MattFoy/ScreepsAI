require('prototypes')();
const profiler = require('screeps-profiler');

let roleMedicSentry = {

  spawnType: 'reservation',
  recycleOnWound: false,
  flees: false,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {

    if (!creep.memory.roleSpecificFlag) {
      let room = Game.rooms[creep.memory.origin];
      if (room.memory.skMines) {
        creep.reserveRoleSpecificFlag(room.memory.skMines);
      }
    }

    if (!creep.memory.replaceBefore && creep.memory.reachedRoom) {
      creep.memory.replaceBefore = Math.round(((creep.body.length * 3) + creep.memory.ticksToRoom) * 1.10);
    }

    if (creep.memory.roleSpecificFlag) {
      let flag = Game.flags[creep.memory.roleSpecificFlag];
      if (flag) {
        if (creep.room.name !== flag.pos.roomName) {
          creep.travelTo(flag, { range: 1 });
          if (!creep.memory.reachedRoom) {
            if (!creep.memory.ticksToRoom) {
              creep.memory.ticksToRoom = 1;
            } else {
              creep.memory.ticksToRoom++;
            }
          }
          if (creep.hits < creep.hitsMax) {
            creep.heal(creep);
          } else {
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
        } else {
          creep.memory.reachedRoom = true;

          let woundedCreeps = creep.room.find(FIND_MY_CREEPS, { filter: function(c) {
            return c.hits < c.hitsMax 
              && c.pos.getRangeTo(creep) <= 8;
          }});
          let moving = false;
          woundedCreeps.sort((a,b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
          if (woundedCreeps.length > 0) {
            if (creep.heal(woundedCreeps[0]) === ERR_NOT_IN_RANGE) {
              creep.rangedHeal(woundedCreeps[0]);
              if (woundedCreeps[0].name !== creep.name) {
                creep.travelTo(woundedCreeps[0], {range: 1 });
                moving = true;
              }
            }
          }
          if (!moving) {
            let sentry = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (c) => c.memory.role === 'skSentry' });
            //console.log(sentry);
            if (sentry) {
              if (creep.pos.getRangeTo(sentry) > 1) {
                creep.moveTo(sentry);  
              }
            } else {
              if (creep.pos.getRangeTo(flag) > 1) {
                creep.travelTo(flag, {range: 1});  
              }
            }
          }
        }
      }
    }
  }, 'run:medicSentry'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

    let body = [TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];

    return body;
  },

  determinePriority: function(room, rolesInRoom) {
    return 12;  
  }
};

module.exports = roleMedicSentry;
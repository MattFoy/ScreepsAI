require('prototypes')();
const profiler = require('screeps-profiler');

let roleRangedSentry = {

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
      let shooting = false;

      if (flag) {
        if (creep.room.name !== flag.pos.roomName) {
          creep.travelTo(flag);
          if (!creep.memory.reachedRoom) {
            if (!creep.memory.ticksToRoom) {
              creep.memory.ticksToRoom = 1;
            } else {
              creep.memory.ticksToRoom++;
            }
          }
        } else {
          creep.memory.reachedRoom = true;

          let target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function(c) { 
            return c.owner.username !== 'Source Keeper'
          }});

          if (target) {
            Game.notify("Invasion detected in SK room: " + creep.room.name + ", tick: " + Game.time, 5);

            let dist = creep.pos.getRangeTo(target);
            if (dist <= 3) { 
              creep.rangedAttack(target);
              shooting = true;
            }

            if (dist < 3) {
              creep.fleeFrom([target], 3);
            } else if (dist > 3) {
              creep.moveTo(target);
            }
          } else {
            creep.travelTo(flag, {range: 2});
          }
        }
        if (!shooting) {
          let target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function(c) { 
            return true; //c.owner.username !== 'an ally...'
          }});
          if (target && creep.pos.getRangeTo(target)) {
            creep.rangedAttack(target);
          }
        }
      }
    }
  }, 'run:rangedSentry'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

    let body = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK];

    return body;
  },

  determinePriority: function(room, rolesInRoom) {
    return 11;  
  }
};

module.exports = roleRangedSentry;
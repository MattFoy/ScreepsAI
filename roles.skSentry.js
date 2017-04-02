require('prototypes')();
const profiler = require('screeps-profiler');

let roleSKSentry = {

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

          let targets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: function(c) { 
            return c.owner.username !== 'Source Keeper'
          }});

          let rangedTargets = _.filter(targets, (c) => _.sum(c.body, { type: RANGED_ATTACK }) > 0);
          let meleeTargets = _.filter(targets, (c) => _.sum(c.body, { type: ATTACK }) > 0);

          if (targets.length > 0) {
            let targetsInRange = _.reduce(targets, (memo,c) => memo + (creep.pos.getRangeTo(c) <= 3 ? 1 : 0), 0);

            let target;
            if (rangedTargets.length > 0) {
             target = creep.pos.findClosestByRange(rangedTargets); 
            } else if (meleeTargets.length > 0) {
              target = creep.pos.findClosestByRange(meleeTargets);
            } else {
              //target = creep.pos.findClosestByRange(targets);
            }

            if (target) {
              creep.moveTo(target);

              if (creep.pos.getRangeTo(target) <= 1) {
                creep.attack(target);
              } else {
                creep.attack(creep.pos.findClosestByRange(targets));
              }

              if (targetsInRange > 1) {
                creep.rangedMassAttack();
              } else if (targetsInRange === 1) {
                creep.rangedAttack(target);
              }
            }

          } else {
            if (creep.pos.getRangeTo(flag) > 0) {
              creep.travelTo(flag, {range: 0});  
            }            
          }
        }
      }
    }
  }, 'run:skSentry'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

    let body = [ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE];
    
    return body;
  },

  determinePriority: function(room, rolesInRoom) {
    return 11;  
  }
};

module.exports = roleSKSentry;
require('prototypes')();
const profiler = require('screeps-profiler');

let roleRoomReserver = {

  spawnType: 'reservation',

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    if (!creep.memory.replaceBefore) {
      creep.memory.replaceBefore = creep.body.length * 3;
    }
    if (!creep.memory.roleSpecificFlag) {
      creep.reserveRoleSpecificFlag(_.filter(Game.rooms[creep.memory.origin].memory.reservedRooms, function(flagName) {
        let flag = Game.flags[flagName];
        if (!flag || !flag.room) { return true; } // just assume the controller is degraded in rooms we don't have vision on...
        
        let controller = flag.room.controller;
        if (!controller) { return false; } // it's a highway? Why would a claim flag be in a highway?
        return (!controller.reservation || controller.reservation.ticksToEnd < 2000);
      }));
    }

    if (creep.memory.roleSpecificFlag) {
      let flag = Game.flags[creep.memory.roleSpecificFlag];
      if (flag) {
        if (flag.pos.roomName !== creep.room.name) {
          creep.travelTo(flag, {range: 0});
        } else {
          let controller = flag.room.controller;
          creep.reserveController(controller);
          if (creep.pos.x !== flag.pos.x || creep.pos.y !== flag.pos.y) {
            creep.travelTo(flag, {range: 0});
          }
        }
      }
    }
  }, 'run:roomReserver'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;
    if (maxEnergy >= 4000) {
      return [CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE];
    } else if (maxEnergy >= 1300) {
      return [CLAIM, CLAIM, MOVE, MOVE];
    }
  },

  reservableFilter: function(reservable) {
    let flag = Game.flags[reservable];
    if (!flag || !flag.room) { return true; } // just assume the controller is degraded in rooms we don't have vision on...
    
    let controller = flag.room.controller;
    if (!controller) { return false; } // it's a highway? Why would a claim flag be in a highway?
    return (!controller.reservation || controller.reservation.ticksToEnd < 2500);
  },

  determinePriority: function(room, rolesInRoom) {
    return 30;  
  }
};

module.exports = roleRoomReserver;
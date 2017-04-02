require('prototypes')();
const profiler = require('screeps-profiler');

let roleRoomClaimer = {

  spawnType: 'global',

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    
    let flag = Game.flags['CLAIM'];
    if (flag) {
      if (flag.pos.roomName !== creep.room.name) {
        creep.travelTo(flag, {range: 0});
      } else {
        let controller = flag.room.controller;
        if (creep.claimController(controller) == ERR_NOT_IN_RANGE) {
          
        }
        creep.travelTo(controller, {range: 1});
      }
    }
  }, 'run:roomClaimer'),

  spawnCondition: function(room) {
    let flag = Game.flags['CLAIM'];
    if (flag && _.filter(Game.creeps, (c) => c.memory.role === 'roomClaimer').length <= 0
      && Game.map.getRoomLinearDistance(room.name, flag.pos.roomName) <= 7
      && (!flag.room || flag.room.controller.my)) {
      return true;
    } else {
      return false;
    }
  },

  determineSpawnParams: function(room) {
    return {
      memory: { origin: room.name, role: 'roomClaimer' },
      body: [CLAIM,MOVE]
    }
  },

  determinePriority: function(room, rolesInRoom) {
    return 35;  
  }
};

module.exports = roleRoomClaimer;
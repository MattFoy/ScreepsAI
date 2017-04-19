require('prototypes')();
const profiler = require('screeps-profiler');

let roleBanksy = {

  spawnType: 'global',

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let flag = Game.flags[creep.memory.flag];
    if (flag) {
      if (flag.pos.roomName !== creep.room.name) {
        creep.travelTo(flag, {range: 0});
      } else {
        let controller = flag.room.controller;
        if (creep.signController(controller, GameState.signMessages['banksy']) == ERR_NOT_IN_RANGE) {
          creep.travelTo(controller, {range: 1});
        } else {
          // delete the flag and commit sucide
          if (controller.sign && controller.sign.text === GameState.signMessages['banksy']) {
            flag.remove();
            creep.suicide();
          } else {
            // what went wrong?
            console.log("SAD DAY FOR BANKSY");
          }
        }        
      }
    }
  }, 'run:banksy'),

  spawnCondition: function(room) {
    for (let name in Game.flags) {
      if (name.startsWith('sign')) {
        let flag = Game.flags[name];
        if (_.filter(Game.creeps, (c) => c.memory.role === 'banksy' && c.memory.flag === name).length <= 0
          && Game.map.getRoomLinearDistance(room.name, flag.pos.roomName) <= 20) {
          return true;
        }
      }
    }
    return false;
  },

  determineSpawnParams: function(room) {
    let flagName;
    for (let name in Game.flags) {
      if (name.startsWith('sign')) {
        let flag = Game.flags[name];
        if (_.filter(Game.creeps, (c) => c.memory.role === 'banksy' && c.memory.flag === name).length <= 0
          && Game.map.getRoomLinearDistance(room.name, flag.pos.roomName) <= 20) {
          flagName = name;
          break;
        }
      }
    }
    return {
      memory: { origin: room.name, role: 'banksy', flag: flagName },
      body: [MOVE]
    }
  },

  determinePriority: function(room, rolesInRoom) {
    return 7;  
  }
};

module.exports = roleBanksy;
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
          creep.travelTo(controller, {range: 1});
        } else {
          // delete the flag and commit sucide
          if (controller && controller.my) {
            flag.remove();
            creep.suicide();
          } else {
            // what went wrong?
            console.log("SAD DAY FOR CLAIMER");
          }
        }        
      }
    }
  }, 'run:roomClaimer'),

  spawnCondition: function(room) {
    let flag = Game.flags['CLAIM'];
    if (flag && _.filter(Game.creeps, (c) => c.memory.role === 'roomClaimer').length <= 0
      && Game.map.getRoomLinearDistance(room.name, flag.pos.roomName) <= 7
      && (!flag.room || flag.room.controller.my)) {
      let ret = Game.map.findRoute(flag.pos.roomName, room.name, {
        routeCallback: (roomName) => {
          if (Game.map.getRoomLinearDistance(room.name, roomName) > 8) {
            return false;
          }
          let parsed;
          if (!parsed) {
            parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
          }
          let fMod = parsed[1] % 10;
          let sMod = parsed[2] % 10;
          let isSK = !(fMod === 5 && sMod === 5) &&
            ((fMod >= 4) && (fMod <= 6)) &&
            ((sMod >= 4) && (sMod <= 6));
          if (isSK) {
            return 10;
          } else {
            return 1;
          }
        }
      });
      if (ret && ret.length <= 9) {
        return true; 
      } else {
        return false;
      }
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
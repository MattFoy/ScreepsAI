require('prototypes')();
let roleScout = {

  spawnType: 'reservation',

  /** @param {Creep} creep **/
  run: function(creep) {    
    creep.reserveRoleSpecificFlag(creep.room.memory.scoutingFlags);
    if (creep.memory.roleSpecificFlag) {
      //If not in the correct room, move towards it
      let flag = Game.flags[creep.memory.roleSpecificFlag];
      if (!creep.pos.equals(flag.pos)) {
        creep.travelTo(flag, { range: 0 });
      }
    }
  },

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;
    return [MOVE];
  },

  determinePriority: function(room, rolesInRoom) {
    return 15;  
  }
};

module.exports = roleScout;
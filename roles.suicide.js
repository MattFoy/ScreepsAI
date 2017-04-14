require('prototypes')();
let roleSuicide = {

  /** @param {Creep} creep **/
  run: function(creep) {
    //creep.memory.role = 'smartHauler';
    
    if (creep.carry.energy > 0 && creep.room.storage) {
      if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.travelTo(creep.room.storage, {range: 1});
      }
    } else if (creep.getActiveBodyparts(MOVE) === 0) {
        creep.suicide();
    } else {
      if (creep.memory.previousRole 
        && creep.memory.reason === 'wounded' 
        && creep.hits >= creep.hitsMax) {
        creep.memory.role = creep.memory.previousRole;
      }
            
      if (creep.room.name !== creep.memory.origin) {
        creep.travelTo(Game.rooms[creep.memory.origin].controller);
      } else {
        var spawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
        if (spawn) {
          if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
            creep.travelTo(spawn, {range: 1});
          }
        }
      }
    }

    creep.say("recycling");
  },

  determineBodyParts: function(maxEnergy) {
    return [MOVE];
  },

  getQuota: function(room) {
    return 0;
  }
};

module.exports = roleSuicide;
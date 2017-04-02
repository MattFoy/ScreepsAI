require('prototypes')();
const profiler = require('screeps-profiler');

let roleLabourer = {

  spawnType: 'quota',
  recycleOnWound: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let task = "";
    
    if (!creep.memory.replaceBefore) {
      creep.memory.replaceBefore = creep.body.length * 3;
    }

    if(creep.memory.delivering && creep.carry.energy == 0) {
      creep.memory.delivering = false;
    }
    if(!creep.memory.delivering && creep.carry.energy == creep.carryCapacity) {
      creep.memory.delivering = true;
    }

    if(!creep.memory.delivering) {
      task = "Hrv";
      creep.goGetEnergy();
    }
    else {
      let targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) 
              && structure.energy < structure.energyCapacity;
        }
      });
      if(targets.length > 0) {
        task = "Deliv"
        let target = creep.pos.findClosestByRange(targets);
        if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.travelTo(target, {range: 1});
        }
      } else {
        // no empty containers
        targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (structure.structureType == STRUCTURE_TOWER 
                && structure.energy <= structure.energyCapacity - creep.carry.energy);
          }
        });
        if(targets.length > 0) {
          task = "Deliv"
          let target = creep.pos.findClosestByRange(targets);
          if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.travelTo(target, {range: 1});
          }
        } else {
          if (!creep.goConstruct()) {
            task = "Upgr";
            creep.goUpgrade();
          } else {
            task = "Bldg";
          }
        }
      }
    }

    creep.say("L-" + creep.body.length + ":" + task);
  }, 'run:labourer'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyAvailable;
    
    if (maxEnergy >= 800) {
      // Work * 3 Carry * 5 Move * 4
      return [WORK,WORK,MOVE,MOVE,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE];
    } else if (maxEnergy >= 450) {
      // Work * 2 Carry * 2 Move * 3
      return [WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE];
    } else if (maxEnergy >= 350) {
      return [WORK,CARRY,CARRY,MOVE,MOVE,MOVE];
    } else {
      return [WORK,MOVE,CARRY,MOVE];
    }
  },

  getQuota: function(room, rolesInRoom) {
    if (rolesInRoom['bellhop'] && rolesInRoom['bellhop'].length > 0) {
      return 0;
    } else {
      return 2;
    }
  },

  determinePriority: function(room, rolesInRoom) {
    return 25;  
  }
};

module.exports = roleLabourer;
require('prototypes')();
const profiler = require('screeps-profiler');

let roleChemist = {

  spawnType: 'quota',
  recycleOnWound: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    if (!creep.memory.replaceBefore) {
      creep.memory.replaceBefore = creep.body.length * 3;
    }

    if(!creep.memory.carrying && _.sum(creep.carry) == creep.carryCapacity) {
      creep.memory.carrying = true;
    }

    if(creep.carry.energy == 0) {
      creep.memory.carrying = false;
    }

    let lab1NeedsFilling = false;
    let lab2NeedsFilling = false;
    let resource1 = null; //creep.room.memory.science.resource1;
    let resource2 = null; //creep.room.memory.science.resource2;
    let labsNeedClearing = false;
    let labs = [];

    if (creep.room.memory.science 
      && creep.room.memory.science.inputLabs 
      && creep.room.memory.science.inputLabs.length > 0) {
      resource1 = creep.room.memory.science.resource1;
      resource2 = creep.room.memory.science.resource2;

      let lab1 = Game.getObjectById(creep.room.memory.science.inputLabs[0]);        
      if (lab1 && lab1.mineralAmount < lab1.mineralCapacity / 2) {
        lab1NeedsFilling = true;
      }

      let lab2 = Game.getObjectById(creep.room.memory.science.inputLabs[1]);
      if (lab2 && lab2.mineralAmount < lab2.mineralCapacity / 2) {
        lab2NeedsFilling = true;
      }

      let labs = creep.room.find(FIND_STRUCTURES, { 
        filter: function(structure) {
          return (structure.structureType === STRUCTURE_LAB)
        } 
      });
      _.map(labs, (lab) => labsNeedClearing = labsNeedClearing || (
        creep.room.memory.science.inputLabs.indexOf(lab.id) === -1
        && lab.mineralAmount > (lab.mineralCapacity / 2)
      ));
    }
    
  }, 'run:chemist'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;
    if (maxEnergy >= 1500) {
      return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY];
    } else {
      return [CARRY,CARRY,MOVE,CARRY,CARRY,MOVE];  
    }    
  },

  getQuota: function(room) {
    return (creep.room.memory.science 
      && creep.room.memory.science.inputLabs 
      && creep.room.memory.science.inputLabs.length > 0)
      ? 1 
      : 0;
  },

  determinePriority: function(room, rolesInRoom) {
    return 10;  
  }
};

module.exports = roleChemist;
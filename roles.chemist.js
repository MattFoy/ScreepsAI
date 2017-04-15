require('prototypes')();
const profiler = require('screeps-profiler');

let roleChemist = {

  spawnType: 'quota',
  recycleOnWound: true,
  flees: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    if (!creep.memory.replaceBefore) {
      creep.memory.replaceBefore = creep.body.length * 3;
    }

    if (creep.room.name !== creep.memory.origin) {
      creep.memory.returnToOrigin = true;
    } else {
      // if(!creep.memory.carrying && _.sum(creep.carry) == creep.carryCapacity) {
      //   creep.memory.carrying = true;
      // }

      // if(creep.carry.energy == 0) {
      //   creep.memory.carrying = false;
      // }


      if (!creep.memory.chemistTask || creep.memory.chemistTask === 'idle') {
        getChemistTask(creep);
      }

      // get task if unset

      // run task
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
    return 0;

    return ((creep.room.memory.science 
      && ((creep.room.memory.science.inputLabs && creep.room.memory.science.inputLabs.length > 0)
        || (creep.room.memory.science.boosts)))
      ? 1 
      : 0);
  },

  determinePriority: function(room, rolesInRoom) {
    return 10;  
  }
};

// priority and tasks are as follows:
// 1. Keep boost labs filled with energy (at least half full)
// 2. Remove minerals from boost labs if they aren't the right type.
// 3. Keep boost labs filled with minerals for boosting (at least half full)
// 4. Remove minerals from Input lab 1 if wrong type
// 5. Keep Input lab 1 filled with mineral #1
// 6. Remove minerals from Input lab 2 if wrong type
// 7. Keep Input lab 2 filled with mineral #2
// 8. Remove all minerals from Output labs if wrong type
// 9. Keep output labs under half resources
function getChemistTask(creep) {
  if (creep.room.memory.science) {

    if (creep.room.memory.science.boosts) {

      // 1. Keep boost labs filled with energy (at least half full)
      for(let bodyPart in creep.room.memory.science.boosts) {
        let lab = Game.getObjectById(creep.room.memory.science.boosts[bodyPart]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistTask = 'idle';
          return;
        } else {
          if (lab.energy < (lab.energyCapacity / 2)) {
            creep.memory.targetLabId = lab.id;
            creep.memory.chemistTask = 'load';
            creep.memory.mineral = RESOURCE_ENERGY;
            creep.memory.amount = Math.min(creep.carryCapacity, lab.energyCapacity - lab.energy);
            return;
          }
        }
      }

      // 2. Remove minerals from boost labs if they aren't the right type.
      for(let bodyPart in creep.room.memory.science.boosts) {
        let lab = Game.getObjectById(creep.room.memory.science.boosts[bodyPart]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistTask = 'idle';
          return;
        } else {
          if (lab.mineralAmount && lab.mineralAmount > 0 
            && lab.mineralType && lab.mineralType !== creep.room.memory.science.boostMinerals[bodyPart]) {
            creep.memory.targetLabId = lab.id;
            creep.memory.chemistTask = 'unload';
            creep.memory.mineral = lab.mineralType;
            creep.memory.amount = Math.min(creep.carryCapacity, lab.mineralAmount);
            return;
          }
        }
      }

      // 3. Keep boost labs filled with minerals for boosting (at least half full)
      for(let bodyPart in creep.room.memory.science.boosts) {
        let lab = Game.getObjectById(creep.room.memory.science.boosts[bodyPart]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistTask = 'idle';
          return;
        } else {
          if (lab.mineralAmount && lab.mineralAmount < (lab.mineralCapacity / 2)
            && (!lab.mineralType || lab.mineralType === creep.room.memory.science.boostMinerals[bodyPart])
            && (creep.room.storage 
              && creep.room.storage.store[creep.room.memory.science.boostMinerals[bodyPart]]
              && creep.room.storage.store[creep.room.memory.science.boostMinerals[bodyPart]] 
                >= Math.min(creep.carryCapacity, lab.mineralCapacity - lab.mineralAmount) )) {
            creep.memory.targetLabId = lab.id;
            creep.memory.chemistTask = 'load';
            creep.memory.mineral = creep.room.memory.science.boostMinerals[bodyPart];
            creep.memory.amount = Math.min(creep.carryCapacity, lab.mineralCapacity - lab.mineralAmount);
            return;
          }
        }
      }      
    }

    if (creep.room.memory.science.inputLabs && creep.room.memory.science.inputLabs.length === 2) {
      
      for (var i = 0; i < creep.room.memory.science.inputLabs.length; i++) {
        let lab = Game.getObjectById(creep.room.memory.science.inputLabs[i]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistTask = 'idle';
          return;
        } else {
          let res;
          if (i === 0) {
            res = creep.room.memory.science.resource1;
          } else if (i === 1) {
            res = creep.room.memory.science.resource2;
          } else {
            res = undefined;
            console.log("Error, more than two input labs?");
            break;
          }

          // 4. Remove minerals from Input lab 1 if wrong type
          if (lab.mineralAmount && lab.mineralAmount > 0 
            && lab.mineralType && lab.mineralType !== res) {
            creep.memory.targetLabId = lab.id;
            creep.memory.chemistTask = 'unload';
            creep.memory.mineral = lab.mineralType;
            creep.memory.amount = Math.min(creep.carryCapacity, lab.mineralAmount);
            return;
          }

          // 5. Keep Input lab 1 filled with mineral #1
          if (lab.mineralAmount && lab.mineralAmount < (lab.mineralCapacity / 2)
            && (!lab.mineralType || lab.mineralType === res)
            && (creep.room.storage
              && creep.room.storage.store[res]
              && creep.room.storage.store[res] 
                >= Math.min(creep.carryCapacity, lab.mineralCapacity - lab.mineralAmount))) {
            creep.memory.targetLabId = lab.id;
            creep.memory.chemistTask = 'load';
            creep.memory.mineral = res;
            creep.memory.amount = Math.min(creep.carryCapacity, lab.mineralCapacity - lab.mineralAmount);
            return;
          }
        }
      }
    }

    
    let outputLabs = [];

    creep.room.find(FIND_STRUCTURES, { 
      filter: function(structure) {
        return (structure.structureType === STRUCTURE_LAB)
      } 
    }).forEach(function(lab) {
      if (room.memory.science.boosts) {
        if (_.filter(room.memory.science.boosts, (id) => id === lab.id).length > 0) {
          // B
          return;
        }
      }
      if (room.memory.science.inputLabs.indexOf(lab.id) > -1) {
        // I
      } else { 
        // O
        outputLabs.push(lab);
      }
    });

    if (outputLabs.length > 0) {
      // 8. Remove all minerals from Output labs if wrong type


      // 9. Keep output labs under half resources
    }
  }

  // else...
  creep.memory.chemistTask = 'idle';
  return;
}

module.exports = roleChemist;
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
      if (creep.memory.sleepUntil && creep.memory.sleepUntil - Game.time >= 0) {
        creep.say('Zzz');
        creep.fleeFrom(creep.room.find(FIND_STRUCTURES), 1); 
        return;
      } else {
        delete creep.memory.sleepUntil;
      }

      if (creep.memory.chemistry && (!creep.memory.chemistry.tick || Game.time - creep.memory.chemistry.tick > 30)) {
        delete creep.memory.chemistry;
      }

      if (!creep.memory.chemistry || !creep.memory.chemistry.task || creep.memory.chemistry.task === 'idle') {
        getChemistTask(creep);
      }

      runChemistTask(creep);

      creep.say('chem');
    }    
  }, 'run:chemist'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;
    if (maxEnergy >= 900) {
      return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY];
    } else {
      return [CARRY,CARRY,MOVE,CARRY,CARRY,MOVE];  
    }    
  },

  getQuota: function(room) {
    return ((room.memory.science 
      && ((room.memory.science.inputLabs && room.memory.science.inputLabs.length > 0)
        || (room.memory.science.boosts)))
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
// 10. Load up the Nuker
function getChemistTask(creep) {
  console.log("[Chemist " + creep.name + '] getting task');
  if (creep.room.memory.science) {
    if (!creep.memory.chemistry) { 
      creep.memory.chemistry = {}; 
      creep.memory.chemistry.tick = Game.time;
    }
    if (creep.room.memory.science.boosts) {
      // 1. Keep boost labs filled with energy (at least half full)
      for(let bodyPart in creep.room.memory.science.boosts) {
        let lab = Game.getObjectById(creep.room.memory.science.boosts[bodyPart]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistry.task = 'idle';
          return;
        } else {
          if (creep.room.storage 
            && creep.room.storage.store[RESOURCE_ENERGY] > 20000
            && lab.energy < (lab.energyCapacity / 2)) {
            creep.memory.chemistry.targetLabId = lab.id;
            creep.memory.chemistry.task = 'load';
            creep.memory.chemistry.mineralType = RESOURCE_ENERGY;
            creep.memory.chemistry.amount = Math.min(creep.carryCapacity, lab.energyCapacity - lab.energy);
            return;
          }
        }
      }

      // 2. Remove minerals from boost labs if they aren't the right type.
      for(let bodyPart in creep.room.memory.science.boosts) {
        let lab = Game.getObjectById(creep.room.memory.science.boosts[bodyPart]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistry.task = 'idle';
          return;
        } else {
          if (lab.mineralAmount && lab.mineralAmount > 0 
            && lab.mineralType && lab.mineralType !== creep.room.memory.science.boostMinerals[bodyPart]) {
            creep.memory.chemistry.targetLabId = lab.id;
            creep.memory.chemistry.task = 'unload';
            creep.memory.chemistry.mineralType = lab.mineralType;
            creep.memory.chemistry.amount = Math.min(creep.carryCapacity, lab.mineralAmount);
            return;
          }
        }
      }

      // 3. Keep boost labs filled with minerals for boosting (at least half full)
      for(let bodyPart in creep.room.memory.science.boosts) {
        let lab = Game.getObjectById(creep.room.memory.science.boosts[bodyPart]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistry.task = 'idle';
          return;
        } else {
          let mineralsAvailable = 0;
          if (creep.room.storage && creep.room.storage.store[creep.room.memory.science.boostMinerals[bodyPart]]) {
            mineralsAvailable += creep.room.storage.store[creep.room.memory.science.boostMinerals[bodyPart]]
          }
          if (creep.room.terminal && creep.room.terminal.store[creep.room.memory.science.boostMinerals[bodyPart]]) {
            mineralsAvailable += creep.room.terminal.store[creep.room.memory.science.boostMinerals[bodyPart]]
          }
          let mineralsRequired = Math.min(creep.carryCapacity, lab.mineralCapacity - lab.mineralAmount);
          if ((lab.mineralAmount === 0 || lab.mineralAmount && lab.mineralAmount < (lab.mineralCapacity / 2))
            && (!lab.mineralType || lab.mineralType === creep.room.memory.science.boostMinerals[bodyPart])) {
            if (mineralsAvailable >= mineralsRequired) {
              creep.memory.chemistry.targetLabId = lab.id;
              creep.memory.chemistry.task = 'load';
              creep.memory.chemistry.mineralType = creep.room.memory.science.boostMinerals[bodyPart];
              creep.memory.chemistry.amount = mineralsRequired;
              return;
            } else if (mineralsAvailable < mineralsRequired) {
              // need to buy more!
              let amount = (mineralsRequired - mineralsAvailable);
              let resType = creep.room.memory.science.boostMinerals[bodyPart];
              console.log('Gotta buy ' + amount + ' more ' + resType + ' in ' + creep.room.name);
              if (creep.room.terminal) {
                //creep.room.terminal.getBestOrders(ORDER_SELL, resType);
                if (Game.cpu.bucket > 5000) {
                  creep.room.terminal.buy(resType, amount);
                }
              }
            }
          }
        }
      }
    }

    if (creep.room.memory.science.inputLabs && creep.room.memory.science.inputLabs.length === 2) {
      
      for (var i = 0; i < creep.room.memory.science.inputLabs.length; i++) {
        let lab = Game.getObjectById(creep.room.memory.science.inputLabs[i]);
        if (!lab) {
          delete creep.room.memory.science;
          creep.memory.chemistry.task = 'idle';
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
            creep.memory.chemistry.targetLabId = lab.id;
            creep.memory.chemistry.task = 'unload';
            creep.memory.chemistry.mineralType = lab.mineralType;
            creep.memory.chemistry.amount = Math.min(creep.carryCapacity, lab.mineralAmount);
            return;
          }

          // 5. Keep Input lab 1 filled with mineral #1
          let mineralsAvailable = 0;
          if (creep.room.storage && creep.room.storage.store[res]) {
            mineralsAvailable += creep.room.storage.store[res];
          }
          if (creep.room.terminal && creep.room.terminal.store[res]) {
            mineralsAvailable += creep.room.terminal.store[res];
          }
          let mineralsRequired = Math.min(creep.carryCapacity, lab.mineralCapacity - lab.mineralAmount);
          if ((lab.mineralAmount === 0 || (lab.mineralAmount > 0 && lab.mineralAmount < (lab.mineralCapacity / 2)))
            && (!lab.mineralType || lab.mineralType === res)
            && mineralsAvailable >= mineralsRequired) {
            creep.memory.chemistry.targetLabId = lab.id;
            creep.memory.chemistry.task = 'load';
            creep.memory.chemistry.mineralType = res;
            creep.memory.chemistry.amount = mineralsRequired;
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
      if (creep.room.memory.science.boosts) {
        if (_.filter(creep.room.memory.science.boosts, (id) => id === lab.id).length > 0) {
          // B
          return;
        }
      }
      if (creep.room.memory.science.inputLabs.indexOf(lab.id) > -1) {
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

  // 10. Load up the Nuker


  // else...
  creep.memory.chemistry.task = 'idle';
  creep.memory.sleepUntil = Game.time + 17;
  return;
}

function runChemistTask(creep) {
  // clear partial chemist tasks (shouldn't happen... right?)
  if (!creep.memory.chemistry 
    || !creep.memory.chemistry.targetLabId 
    || !creep.memory.chemistry.task 
    || !creep.memory.chemistry.mineralType
    || !creep.memory.chemistry.amount) {
    delete creep.memory.chemistry;
  }
  // clear task details if lab is missing
  let lab = null;
  if (creep.memory.chemistry && creep.memory.chemistry.targetLabId) {
    lab = Game.getObjectById(creep.memory.chemistry.targetLabId);
  }
  if (!lab) {
    if (creep.memory.chemistry) {
      console.log(JSON.stringify(creep.memory.chemistry));
    }
    delete creep.memory.chemistry; 
  }

  if (creep.memory.chemistry && creep.memory.chemistry.task && creep.memory.chemistry.task === 'load') {
    delete creep.memory.carrying;
    if (creep.memory.chemistry.amount > creep.carryCapacity) {
      creep.memory.chemistry.amount = creep.carryCapacity;
    }

    if (creep.carry[creep.memory.chemistry.mineralType] 
      && creep.carry[creep.memory.chemistry.mineralType] >= creep.memory.chemistry.amount) {
      creep.memory.carryState = 'full';
    } else {
      let amountCarried = (creep.carry[creep.memory.chemistry.mineralType] 
          && creep.carry[creep.memory.chemistry.mineralType] > 0) 
        ? creep.carry[creep.memory.chemistry.mineralType] 
        : 0;
      let freeSpace = creep.carryCapacity - _.sum(creep.carry);
      if (freeSpace >= creep.memory.chemistry.amount - amountCarried) {
        creep.memory.carryState = 'get'
      } else if (_.sum(creep.carry) > 0) {
        creep.memory.carryState = 'store';
      } else {
        creep.memory.carryState = 'UNKNOWN';
        console.log("Chemist error... invalid inventory state");
      }
    }

    if (creep.memory.carryState === 'full') {
      if (creep.transfer(lab, creep.memory.chemistry.mineralType) === ERR_NOT_IN_RANGE) {
        creep.travelTo(lab);
      } else {
        delete creep.memory.chemistry;
      }
    } else if (creep.memory.carryState === 'get') {
      let storageAmount = creep.room.storage.store[creep.memory.chemistry.mineralType];
      let terminalAmount = creep.room.terminal.store[creep.memory.chemistry.mineralType];
      if (storageAmount > 0) {
        let withdrawAmount = Math.min(creep.memory.chemistry.amount - (creep.carry[creep.memory.chemistry.mineralType] ? creep.carry[creep.memory.chemistry.mineralType] : 0), storageAmount);
        if (creep.withdraw(creep.room.storage, creep.memory.chemistry.mineralType, withdrawAmount) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.storage);
        }  
      } else if (terminalAmount > 0) {
        let withdrawAmount = Math.min(creep.memory.chemistry.amount - (creep.carry[creep.memory.chemistry.mineralType] ? creep.carry[creep.memory.chemistry.mineralType] : 0), terminalAmount);
        if (creep.withdraw(creep.room.terminal, creep.memory.chemistry.mineralType, withdrawAmount) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.terminal);
        }
      }
    } else if (creep.memory.carryState === 'store') {
      for (let res in creep.carry) {
        if (creep.transfer(creep.room.storage, res) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.storage);
        }
      }
    }
  } else if (creep.memory.chemistry && creep.memory.chemistry.task && creep.memory.chemistry.task === 'unload') {
    delete creep.memory.carryState;
    if (!creep.memory.carrying && _.sum(creep.carry) >= 0) {
      creep.memory.carrying = true;
    } else if (creep.memory.carrying && _.sum(creep.carry) === 0) {
      creep.memory.carrying = false;
    }

    if (creep.memory.carrying) {
      for (let res in creep.carry) {
        if (creep.transfer(creep.room.storage, res) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.storage);
        }
      }
    } else {
      if (creep.withdraw(lab, creep.memory.chemistry.mineralType) === ERR_NOT_IN_RANGE) {
        creep.travelTo(lab);
      } else {
        delete creep.memory.chemistry;
      }
    }
  } else {
    creep.fleeFrom(creep.room.find(FIND_STRUCTURES), 2);  
    creep.say('idle');  
  }
}

module.exports = roleChemist;
require('prototypes')();
const profiler = require('screeps-profiler');

let roleBellhop = {

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

    if(creep.memory.carrying && _.sum(creep.carry) == 0) {
      creep.memory.carrying = false;
    }
    
    if (!creep.room.storage) {
        console.log('Bellhop, no storage: ' + creep.name + ': ' + JSON.stringify(creep.pos));
        creep.memory.returnToOrigin = true;
        return;
    }

    let linkNeedsTending = false;
    let linkNeedsFilling = false;
    if (creep.room.memory.receivingLink) {
      let link = Game.getObjectById(creep.room.memory.receivingLink);
      let controllerLink = Game.getObjectById(creep.room.memory.controllerLink);
      if (controllerLink) {
        let links = creep.room.find(FIND_MY_STRUCTURES, {
          filter: function(object) {
            return object.structureType === STRUCTURE_LINK;
          }
        });

        for (let i = 0; i < links.length; i++) {
          if (links[i].id !== link.id && links[i].id !== controllerLink.id) {
            if (links[i].cooldown === 0 && links[i].energy > 0 && link.energy > 0)  {
              linkNeedsTending = true;
            }
          }
        }
        if (!linkNeedsTending && controllerLink.energy < 400 && link.energy < 600) {
          linkNeedsFilling = true;
        }
      } else {
        if (link && link.energy > 0) {
          linkNeedsTending = true;
        }
      }
    }

    let upgradersNeedEnergy = false;
    let upgradeFlag = Game.flags[creep.room.name + '_Upgrade'];
    let upgradeContainer = null;
    if (upgradeFlag) {
      upgradeContainer = upgradeFlag.pos.findClosestByRange(FIND_STRUCTURES, 
        { maxOps: 1, filter: (s) => s.structureType == STRUCTURE_CONTAINER });
      if (upgradeContainer && (upgradeContainer.store[RESOURCE_ENERGY] + 200) < (upgradeContainer.storeCapacity)) {
        upgradersNeedEnergy = true;
      }
    }

    if (!creep.memory.bellhopTask 
      || (creep.memory.bellhopTask === "idle" 
        && (!creep.memory.idleTimeout || Game.time - creep.memory.idleTimeout > 0))) {
      let x = (creep.room.find(FIND_STRUCTURES, {
        filter: function(structure) {
          return ((structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN ||
              (structure.structureType == STRUCTURE_TOWER 
                && structure.energy <= 800)) 
              && structure.energy < structure.energyCapacity);
        }
      }));
      let energyNeedsHauling = x.length > 0;


      let terminalNeedsEnergyStocking = false;
      let terminalNeedsResourceStocking = false;
      // TODO: expand to also look at the trading plan and move in the resources for sale / take out the resources purchased
      if (creep.room.storage && creep.room.terminal && creep.room.memory.tradingPlan) {
        if (creep.room.terminal.store[RESOURCE_ENERGY] + 2000 < creep.room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY]
          && creep.room.storage.store[RESOURCE_ENERGY] > 50000) {
          terminalNeedsEnergyStocking = true;
        }

        for (var resourceIdx in RESOURCES_ALL) {
          let resource = RESOURCES_ALL[resourceIdx];
          if (resource === RESOURCE_ENERGY) { continue; }

          let quotaAmount = (creep.room.memory.tradingPlan.resourceQuantities[resource] ? creep.room.memory.tradingPlan.resourceQuantities[resource] : 0);
          let terminalAmount = (creep.room.terminal.store[resource] ? creep.room.terminal.store[resource] : 0);

          if (creep.room.memory.tradingPlan.resourceQuantities[resource]
            && terminalAmount < quotaAmount) {
            //console.log('stock! ' + resource + ': ' + creep.room.terminal.store[resource] + ', < ' + creep.room.memory.tradingPlan.resourceQuantities[resource]);
            terminalNeedsResourceStocking = true;
          }
        }
      }

      let terminalNeedsEnergyDraining = false;
      let terminalNeedsResourceDraining = false;
      if (creep.room.storage && creep.room.terminal && creep.room.memory.tradingPlan) {
        if (creep.room.terminal.store[RESOURCE_ENERGY] - 1600 
          > creep.room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY]) {
          terminalNeedsEnergyDraining = true;
        }

        for (var resource in creep.room.terminal.store) {
          if (resource === RESOURCE_ENERGY) { continue; }
          if (creep.room.terminal.store[resource] 
            && creep.room.memory.tradingPlan.resourceQuantities[resource] 
            && (creep.room.terminal.store[resource] - 1600)
              > creep.room.memory.tradingPlan.resourceQuantities[resource]) {
            //console.log(resource + ': ' + creep.room.terminal.store[resource] + ', > ' + creep.room.memory.tradingPlan.resourceQuantities[resource]);
            terminalNeedsResourceDraining = true;
          }
        }
      }

      if (linkNeedsTending && !_.filter(Game.creeps, (c) => 
          (c.id !== creep.id
          && c.room.name === creep.room.name 
          && c.memory.bellhopTask === "lnk_o")).length) {
        creep.memory.bellhopTask = "lnk_o";
      } else if (linkNeedsFilling && !_.filter(Game.creeps, (c) => 
          (c.id !== creep.id
          && c.room.name === creep.room.name 
          && c.memory.bellhopTask === "lnk_i")).length) {
        creep.memory.bellhopTask = 'lnk_i';
      } else if (energyNeedsHauling) {
        creep.memory.bellhopTask = 'en';
      } else if (terminalNeedsEnergyDraining) {
        creep.memory.bellhopTask = 'term_out_e'
      } else if (terminalNeedsResourceDraining) {
        creep.memory.bellhopTask = 'term_out_r'
      } else if (terminalNeedsEnergyStocking) {
        creep.memory.bellhopTask = 'term_in_e'
      } else if (terminalNeedsResourceStocking) {
        creep.memory.bellhopTask = 'term_in_r';
      } else if (upgradersNeedEnergy) {
        creep.memory.bellhopTask = 'upgraders';
      } else {
        creep.memory.bellhopTask = 'idle';
        console.log('bellhop nothing to do');
        creep.memory.idleTimeout = Game.time + 10;
      }
    }

    if (creep.memory.bellhopTask === "lnk_i") {
      let link = Game.getObjectById(creep.room.memory.receivingLink);
      if (!link) { 
          creep.memory.bellhopTask = 'idle';
          creep.room.memory.receivingLink = undefined;
          return;
      }
      if (creep.memory.carrying) {
        if (creep.transfer(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.getPositionAt(creep.room.memory.linkSweetSpot.x, creep.room.memory.linkSweetSpot.y), {range: 0});
        }
      } else {
        creep.goGetEnergy(true, true);
      }
      if (link.energy >= link.energyCapacity) { creep.memory.bellhopTask = "idle"; }
      if (_.sum(creep.carry) > creep.carry.energy) {
        for (var resourceType in creep.carry) {
          if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          }
        }
      }
    } else if (creep.memory.bellhopTask === "lnk_o") {
      let link = Game.getObjectById(creep.room.memory.receivingLink);
      if (!link) { 
        creep.room.memory.receivingLink = undefined; 
        creep.memory.bellhopTask = 'idle'; 
      } else {
        if (creep.memory.carrying) {
          if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            //console.log('bellhop: ' + JSON.stringify(creep.room.memory.linkSweetSpot));
            let roomPos = creep.room.getPositionAt(creep.room.memory.linkSweetSpot.x, creep.room.memory.linkSweetSpot.y);
            //console.log(JSON.stringify(roomPos));
            creep.travelTo(roomPos, {range: 0});
          }
        } else {
          if (creep.withdraw(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            //console.log('bellhop: ' + JSON.stringify(creep.room.memory.linkSweetSpot));
            let roomPos = creep.room.getPositionAt(creep.room.memory.linkSweetSpot.x, creep.room.memory.linkSweetSpot.y);
            //console.log(JSON.stringify(roomPos));
            creep.travelTo(roomPos, {range: 0});
          }
        }
        if (link.energy == 0) { creep.memory.bellhopTask = "idle"; }
        if (_.sum(creep.carry) > creep.carry.energy) {
          for (var resourceType in creep.carry) {
            if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
              creep.travelTo(creep.room.storage, {range: 1});
            }
          }
        }
      }
    } else if (creep.memory.bellhopTask === 'en') {
      if (creep.memory.carrying) {
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
              return (structure.structureType == STRUCTURE_EXTENSION ||
                  structure.structureType == STRUCTURE_SPAWN ||
                  (structure.structureType == STRUCTURE_TOWER && structure.energy <= 800)) 
                && structure.energy < structure.energyCapacity
                //&& (structure.energyCapacity - structure.energy) <= creep.carry.energy
            }
        });
        if(targets.length > 0) {
          let target = creep.pos.findClosestByRange(targets);
          if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.travelTo(target, {range: 1});
          }
        } else {
          creep.memory.bellhopTask = 'idle';
        }
      } else {
        if (linkNeedsFilling
          && !_.filter(Game.creeps, (c) => 
            (c.id !== creep.id 
            && c.memory.role === creep.memory.role
            && c.room.name === creep.room.name 
            && c.memory.bellhopTask === "lnk_i")).length) { 
          creep.memory.bellhopTask = 'lnk_i'; 
        } else if (linkNeedsTending 
          && !_.filter(Game.creeps, (c) => 
            (c.id !== creep.id 
            && c.memory.role === creep.memory.role
            && c.room.name === creep.room.name 
            && c.memory.bellhopTask === "lnk_o")).length) { 
          creep.memory.bellhopTask = 'lnk_o'; 
        } else {
          creep.goGetEnergy(true, true);  
        }        
      }
      if (_.sum(creep.carry) > creep.carry.energy) {
        for (var resourceType in creep.carry) {
          if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          }
        }
      }
    } else if (creep.memory.bellhopTask === "upgraders") {
      if (upgradeContainer.store[RESOURCE_ENERGY] >= upgradeContainer.storeCapacity * 0.9) {
        creep.memory.bellhopTask = 'idle';
      }
      if (creep.memory.carrying) {
        if (upgradeContainer) {
          if (creep.transfer(upgradeContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.travelTo(upgradeContainer, {range: 1});
          } else {
            creep.memory.bellhopTask = 'idle';
          }
        }
      } else {
        creep.goGetEnergy(true);
      }     
      if (_.sum(creep.carry) > creep.carry.energy) {
        for (var resourceType in creep.carry) {
          if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          }
        }
      }  
    } else if (creep.memory.bellhopTask === "term_out_e") {
      if ((creep.room.terminal.store[RESOURCE_ENERGY] - 2000) <= creep.room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY]) {
        creep.memory.bellhopTask = 'idle';
      }
      if (creep.memory.carrying) {
        if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.storage, {range: 1});
        } else {
          creep.memory.bellhopTask = 'idle';
        }
      } else {
        if (creep.withdraw(creep.room.terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.terminal, {range: 1});
        }
      } 
      if (_.sum(creep.carry) > creep.carry.energy) {
        for (var resourceType in creep.carry) {
          if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          }
        }
      }
    } else if (creep.memory.bellhopTask === "term_out_r") {
      if (creep.memory.carrying) {
        for (var resource in creep.carry) {
          if (creep.transfer(creep.room.storage, resource) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          } else {
            //console.log('dumped');
            creep.memory.bellhopTask = 'idle';
          }
        }        
      } else {
        let excessExists = false;
        for (var resourceIdx in RESOURCES_ALL) {
          let resource = RESOURCES_ALL[resourceIdx];
          if (resource === RESOURCE_ENERGY) { continue; }

          let delta = (creep.room.terminal.store[resource] 
              ? creep.room.terminal.store[resource]
              : 0)
            - (creep.room.memory.tradingPlan.resourceQuantities[resource] 
              ? creep.room.memory.tradingPlan.resourceQuantities[resource]
              : 0);
          let carry = _.sum(creep.carry);
          if (delta > 0) {
            excessExists = true;
            let withdrawAmount = Math.min(delta, creep.carryCapacity - carry);
            if (withdrawAmount > 0) {
              let result = creep.withdraw(creep.room.terminal, resource, withdrawAmount);
              if (result === ERR_NOT_IN_RANGE) {
                creep.travelTo(creep.room.terminal, {range: 1});
              } else if (result === OK) {
                creep.memory.carrying = true;
              }
            } else {
              //console.log('wat')
            }
          }
        }
        if (!excessExists) {
          creep.memory.bellhopTask = 'idle';
        }
      } 
    } else if (creep.memory.bellhopTask === "term_in_e") {
      if (creep.room.terminal.store[RESOURCE_ENERGY] >= creep.room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY]) {
        creep.memory.bellhopTask = 'idle';
      }
      if (creep.memory.carrying) {
        if (creep.transfer(creep.room.terminal, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.travelTo(creep.room.terminal, {range: 1});
        } else {
          creep.memory.bellhopTask = 'idle';
        }
      } else {
        creep.goGetEnergy(true);
      } 
      if (_.sum(creep.carry) > creep.carry.energy) {
        for (var resourceType in creep.carry) {
          if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          }
        }
      }
    } else if (creep.memory.bellhopTask === "term_in_r") {
      if (creep.memory.carrying) {
        for (var resource in creep.carry) {
          if (creep.transfer(creep.room.terminal, resource) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.terminal, {range: 1});
          } else {
            creep.memory.bellhopTask = 'idle';
          }
        }        
      } else {
        let deficitExists = false;
        for (var resourceIdx in RESOURCES_ALL) {
          let resource = RESOURCES_ALL[resourceIdx];
          if (resource === RESOURCE_ENERGY) { continue; }

          let quotaAmount = (creep.room.memory.tradingPlan.resourceQuantities[resource] ? creep.room.memory.tradingPlan.resourceQuantities[resource] : 0);
          let terminalAmount = (creep.room.terminal.store[resource] ? creep.room.terminal.store[resource] : 0);

          let delta = quotaAmount - terminalAmount;
          let carry = _.sum(creep.carry);
          if (delta > 0) {
            deficitExists = true;
            let withdrawAmount = Math.min(delta, creep.carryCapacity - carry);
            if (withdrawAmount > 0) {
              let result = creep.withdraw(creep.room.storage, resource, withdrawAmount);
              if (result === ERR_NOT_IN_RANGE) {
                creep.travelTo(creep.room.storage, {range: 1});
              } else if (result === OK) {
                creep.memory.carrying = true;
              }
            }
          }
        }        
        if (!deficitExists) {
          creep.memory.bellhopTask = 'idle';
        }
      } 
    } else if (creep.memory.bellhopTask === "idle") {
      if (creep.memory.carrying) {
        for (let resourceType in creep.carry) {
          if (creep.transfer(creep.room.storage, resourceType) === ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.storage, {range: 1});
          }
        }
      } else {
        let droppedEnergy = creep.room.storage.pos.findInRange(FIND_DROPPED_ENERGY, 15, (e) => e.amount > 100);
        if (droppedEnergy.length > 0) {
          if (creep.pickup(droppedEnergy[0]) === ERR_NOT_IN_RANGE) {
            creep.travelTo(droppedEnergy[0], { range: 1 });
          }
        } else {
          creep.getOutOfTheWay();
        }        
      } 
    }

    creep.say(creep.memory.bellhopTask);
  }, 'run:bellhop'),

  determineBodyParts: function(room, rolesInRoom) {
    let maxEnergy = room.energyCapacityAvailable;
    if (rolesInRoom !== undefined 
      && (!rolesInRoom['bellhop'] || rolesInRoom['bellhop'].length <= 0)
      && (!rolesInRoom['labourer'] || rolesInRoom['labourer'].length <= 0)) {
      maxEnergy = room.energyAvailable;
    }

    var segment = [CARRY,CARRY,MOVE];
    var body = [];
    var segmentCost = _.sum(segment, (p) => BODYPART_COST[p]);

    do {
      body = body.concat(segment);
      maxEnergy -= segmentCost;
    } while (maxEnergy - segmentCost > 0 && (body.length + segment.length) <= MAX_CREEP_SIZE)

    return body;    
  },

  getQuota: function(room) {
    let extensions = room.find(FIND_MY_STRUCTURES, (s) => s.structureType === STRUCTURE_EXTENSION).length;
    if ((
      (room.storage ? room.storage.store[RESOURCE_ENERGY] : 0) 
      + (room.terminal ? room.terminal.store[RESOURCE_ENERGY] : 0)
      ) > 4000
      && extensions > 10) {
      return 2;
    } else {
      return 0;
    }
  },

  determinePriority: function(room, rolesInRoom) {
    return 10;  
  }
};

module.exports = roleBellhop;
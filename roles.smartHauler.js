require('prototypes')();
const profiler = require('screeps-profiler');

let roleMineralExtractor = require('roles.mineralExtractor')

let roleSmartHauler = {

  spawnType: 'quota',
  recycleOnWound: true,
  flees: true,

  forget: function(creep) {
    creep.memory.intendedSource = null;
    creep.memory.haulingResources = null;
  },

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let task = "";

    if (!creep.memory.replaceBefore) {
      creep.memory.replaceBefore = creep.body.length * 3;
    }

    if (creep.memory.storing && creep.carry.energy > 0 && creep.room.name === creep.memory.origin) {
      opportunisticLinkDump(creep);
    }

    // Toggle states
    if(creep.memory.storing && _.sum(creep.carry) == 0) {
      creep.memory.storing = false;
      creep.memory.destinationStorage = null;
    }
    if(!creep.memory.storing && _.sum(creep.carry) >= creep.carryCapacity) {
      creep.memory.storing = true;
      creep.memory.intendedSource = null;
    }

    // Find storage
    if (creep.memory.storing) {
      if (Game.rooms[creep.memory.origin].storage && !creep.memory.destinationStorageId) {
        creep.memory.destinationStorage = Game.rooms[creep.memory.origin].storage.id;
      }

      if (!creep.room.storage) {
        let container = Game.rooms[creep.memory.origin].getTempStorage();
        if (container) {
          creep.memory.destinationStorage = container.id;
        }
      }
    }

    if (creep.ticksToLive !== undefined) {
      if(creep.memory.storing) {
        storeLoad(creep);
      } else {
        if (!creep.memory.intendedSource && !creep.memory.haulingResources) {
          findHaulingTargets(creep);
        }
        
        if (creep.memory.haulingResources) {
          retrieveResources(creep);
        } else if (creep.memory.intendedSource) {
          retrieveEnergy(creep);
        } else {
          task = 'wat';
        }
      }
    } else {
      //creep.memory.role = 'suicide';
    }

    //creep.say("SH-" + creep.body.length + ":" + task);
  }, 'run:smartHauler'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

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
    if (!room.storage && !room.getTempStorage()) {
      return 0;
    }

    let carryRequiredForExtractor = 0;

    if (room.storage) {
      let targets = room.find(FIND_STRUCTURES, { filter: (s) => (s.structureType === STRUCTURE_EXTRACTOR) });
      if (targets.length > 0) {
        let extractor = targets[0];
        //console.log(extractor.pos)
        let mineral = room.find(FIND_MINERALS)[0];
        if (mineral) {
          if (mineral.mineralAmount > 0 
            || !mineral.ticksToRegeneration) {
            let mineralDistance = mineral.pos.getRangeTo(room.storage);
            let workParts = _.groupBy(roleMineralExtractor.determineBodyParts(room))[WORK].length;
            carryRequiredForExtractor = Math.ceil((workParts * mineralDistance * 2.5) / 5);
          }
        }
      }
      
      for (var i = 0; i < room.memory.responsibleForRooms.length; i++) {
        let rRoom = Game.rooms[room.memory.responsibleForRooms[i]];
        if (rRoom) {
          let targets = rRoom.find(FIND_STRUCTURES, { filter: (s) => (s.structureType === STRUCTURE_EXTRACTOR) });
          if (targets.length > 0) {
            let extractor = targets[0];
            //console.log(extractor.pos)
            let mineral = rRoom.find(FIND_MINERALS)[0];
            if (mineral) {
              if (mineral.mineralAmount > 0 
                || !mineral.ticksToRegeneration) {
                let mineralDistance = Math.min(150, mineral.pos.getRangeTo(room.storage));
                let workParts = _.groupBy(roleMineralExtractor.determineBodyParts(room))[WORK].length;
                carryRequiredForExtractor += Math.ceil((workParts * mineralDistance * 2.5) / 5);
              }
            }
          }
        }
      }
      //console.log(carryRequiredForExtractor);
    }

    let totalCarryRequired = _.sum(room.memory.hauling.sourceDetails, 'carryRequired') + carryRequiredForExtractor;
    if (room.memory.hauling && room.memory.hauling.carryAdjustment !== undefined) {
      let maxAdjustment = Math.round(totalCarryRequired / 3);
      room.memory.hauling.carryAdjustment = Math.max(-1 * maxAdjustment, Math.min(room.memory.hauling.carryAdjustment, 300));
      totalCarryRequired += room.memory.hauling.carryAdjustment;
      
      // console.log('`-- > [' + room.name + '] -> carry required: ' + totalCarryRequired 
      //   + ', adj:' + room.memory.hauling.carryAdjustment 
      //   + ', maxEnergy: ' + room.memory.hauling.maxContainerEnergy);
    }

    return (Math.round(totalCarryRequired / (_.groupBy(this.determineBodyParts(room))[CARRY].length * 50)));
  },

  determinePriority: function(room, rolesInRoom) {
    let energyFactor = 0;
    if ((rolesInRoom['builder'] && rolesInRoom['builder'].length >= 1)
       && (rolesInRoom['upgrader'] && rolesInRoom['upgrader'].length >= 1)) {
      // subtract 2 from the priority for every thousand energy (rounded up) at the 'worst' energy source
      // up to a maximum of 16, so we only supersede miners at the most.
      energyFactor = Math.min(16, (2 * Math.max(0, Math.ceil((_.max(room.memory.hauling.sourceDetails, 'energy').energy - 2000) / 1000))));
    }
    return 55 - energyFactor;
  }
};

function findHaulingTargets(creep) {
  //console.log('considering target sources...')
  let origin = Game.rooms[creep.memory.origin];

  if (origin.controller.level >= 6) {
    let resourceContainers = [];
    
    if (!GameState.cachedResourceContainers) { GameState.cachedResourceContainers = {}; }
    
    if (!GameState.cachedResourceContainers[creep.memory.origin]) {
      resourceContainers = resourceContainers.concat(origin.find(FIND_STRUCTURES, { filter: (s) => (
        s.structureType === STRUCTURE_CONTAINER
        && (_.sum(s.store) > Math.min(creep.carryCapacity, 1000))
        && (_.filter(Game.creeps, (c) => c.memory.haulingResources === s.id).length === 0)
      ) }));

      for (var i = 0; i < origin.memory.responsibleForRooms.length; i++) {
        let rRoom = Game.rooms[origin.memory.responsibleForRooms[i]];
        if (rRoom) {
          resourceContainers = resourceContainers.concat(rRoom.find(FIND_STRUCTURES, { filter: (s) => (
            s.structureType === STRUCTURE_CONTAINER
            && ((_.sum(s.store) - s.store[RESOURCE_ENERGY]) > Math.min(creep.carryCapacity, 1000))
            && (_.filter(Game.creeps, (c) => c.memory.haulingResources === s.id).length === 0)
          ) }));
        }
      }
      GameState.cachedResourceContainers[creep.memory.origin] = resourceContainers;
    } else {
      resourceContainers = GameState.cachedResourceContainers[creep.memory.origin];
    }

    if (resourceContainers && resourceContainers.length > 0 && creep.ticksToLive > 400) {
      let target = resourceContainers[0];
      if (target) {
        if (target) {
          creep.memory.haulingResources = target.id;
        }
      }
    }
  }

  if (!creep.memory.haulingResources) {
    // this is the tricky part, choose a source...
    var sourceDetails = origin.memory.hauling.sourceDetails;
    var targets = _.filter(sourceDetails, 
      (srcDet) => (
        origin.memory.defend.indexOf(srcDet.room) === -1
        && (srcDet.energy + (srcDet.pathCost * srcDet.energyPerTick) > Math.min(creep.carryCapacity - creep.carry.energy, 500))
      ));
    
    targets = targets.sort((a,b) => b.energy - a.energy);

    if (targets.length > 0) {
      creep.memory.intendedSource = targets[0].name;
      //console.log("Retrieving energy from : " + creep.memory.intendedSource);

      Game.rooms[creep.memory.origin].memory.hauling.sourceDetails[creep.memory.intendedSource]['energy'] = 
        Game.rooms[creep.memory.origin].memory.hauling.sourceDetails[creep.memory.intendedSource]['energy'] 
        - (creep.carryCapacity - creep.carry.energy);
    } else {
      //console.log("no energy to haul...")
      creep.getOutOfTheWay();
    }
  }        
}
findHaulingTargets = profiler.registerFN(findHaulingTargets, 'hauler:findHaulingTargets');

function opportunisticLinkDump(creep) {
  if (creep.room.memory.links.inputs && creep.room.memory.links.inputs.length > 0) {
    let links = _.filter(_.map(creep.room.memory.links.inputs, (linkId) => Game.getObjectById(linkId)),
      (link) => link && link.energy < link.energyCapacity && creep.pos.getRangeTo(link) <= 1);
    if (links.length > 0) {
      links.sort((a,b) => a.energy - b.energy);
      let link = links[0];
      let linkCapacity = (link.energyCapacity - link.energy);
      if (linkCapacity + (link.cooldown < 5 ? link.energyCapacity : 0) + link.energyCapacity >= creep.carry.energy) {
        if (creep.transfer(link, RESOURCE_ENERGY) == 0) {
          creep.memory.storing = creep.carry.energy > 0;
        }
      }
    }  
  }
}
opportunisticLinkDump = profiler.registerFN(opportunisticLinkDump, 'hauler:opportunisticLinkDump');

function retrieveResources(creep) {
  //console.log(creep.name + ' getting resources from ' + creep.memory.haulingResources)
  let container = Game.getObjectById(creep.memory.haulingResources);
  //console.log(JSON.stringify(container))
  if (container) {
    if (_.sum(container.store) <= 0 || _.sum(creep.carry) === creep.carryCapacity) {
      creep.memory.haulingResources = undefined;
      if (_.sum(creep.carry) > 0) {
        creep.memory.storing = true;
      }
    } else {
      let res;
      for(var type in container.store) {
        res = creep.withdraw(container, type);
      }
      //console.log(res);
      if (res === ERR_NOT_IN_RANGE) {
        creep.travelTo(container, {range: 1, ignoreTerrain: _.sum(creep.carry) === 0 });
      }
    }
  } else {
    creep.memory.haulingResources = undefined;
  }
}
retrieveResources = profiler.registerFN(retrieveResources, 'hauler:retrieveResources');

function retrieveEnergy(creep) {
  let target = Game.flags[creep.memory.intendedSource];
  if (creep.memory.waiting === undefined) { creep.memory.waiting = 0; }
  
  if (!target) { 
    console.log('Derp? ');
    creep.memory.intendedSource = undefined; 
    creep.tryToPickUp(); 
    return; 
  }

  if (creep.carry.energy > creep.carryCapacity * 0.75 && creep.memory.waiting >= 3) {
    creep.tryToPickUp(); 
    creep.memory.storing = true;
    creep.memory.intendedSource = null;
    creep.memory.waiting = 0;
  } else if (creep.pos.getRangeTo(target) > 1) {
    creep.travelTo(target, { range: 1, ignoreTerrain: _.sum(creep.carry) === 0 });
    creep.memory.waiting = 0;
  } else {
    creep.tryToPickUp();
    if (creep.memory.waiting++ >= 5) {
      creep.memory.intendedSource = null;
    }
  }

  if (creep.memory.travelTo && creep.memory.travelTo.path) {
    if ((creep.memory.travelTo.path.length * 2) > (creep.ticksToLive - 15)) {
      console.log(creep.name + " should abort pickup. TTL:" + creep.ticksToLive + ', dist:' + creep.memory.travelTo.path.length)
      creep.memory.role = 'suicide';
    }
  }
}
retrieveEnergy = profiler.registerFN(retrieveEnergy, 'hauler:retrieveEnergy');

function storeLoad(creep) {
  let storage = Game.getObjectById(creep.memory.destinationStorage);
  if (!storage) {
    console.log(creep.name + ' has no storage? ' + creep.memory.origin);
    creep.memory.role = 'suicide';
  } else {
    for(var resourceType in creep.carry) {
      if (!creep.carry[resourceType]) { continue; }
      let result = creep.transfer(storage, resourceType);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(storage, {range: 1});
      }
      if (result === ERR_FULL || _.sum(storage.store) >= storage.storeCapacity) {
        for (var res in creep.carry) {
          if (!creep.carry[res]) { continue; }
          creep.drop(res);
        }
      }
      break;
    }
    task = "Stor";
  }
}
storeLoad = profiler.registerFN(storeLoad, 'hauler:storeLoad');

module.exports = roleSmartHauler;
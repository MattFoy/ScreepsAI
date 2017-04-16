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

    if (creep.memory.storing && creep.carry.energy > 0) {
      let links = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, { filter: function(s) { return s.structureType === STRUCTURE_LINK && s.energy < s.energyCapacity }});
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
        let storage = Game.getObjectById(creep.memory.destinationStorage);
        if (!storage) {
          console.log(creep.name + ' has no storage? ' + creep.memory.origin);
          creep.memory.role = 'suicide';
        } else {
          if (creep.room.name === storage.pos.roomName && creep.pos.getRangeTo(storage) <= 1) {
            for(var resourceType in creep.carry) {
              if (creep.transfer(storage, resourceType) === ERR_FULL || _.sum(storage.store) + _.sum(creep.carry) > storage.storeCapacity) {
                for (var res in creep.carry) {
                  creep.drop(res);
                }
              }
            }
          } else {
            creep.travelTo(storage, {range: 1});
          }
          task = "Stor";
        }
      }
      else {
        if (!creep.memory.intendedSource && !creep.memory.haulingResources) {
          //console.log('considering target sources...')
          let origin = Game.rooms[creep.memory.origin];

          let resourceContainers = origin.find(FIND_STRUCTURES, { filter: (s) => (
            s.structureType === STRUCTURE_CONTAINER
            && ((_.sum(s.store) - s.store[RESOURCE_ENERGY]) > Math.min(creep.carryCapacity, 1000))
            && (_.filter(Game.creeps, (c) => c.memory.haulingResources === s.id).length === 0)
          ) });
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

          // crude magic number hack for now... should probably get a better linear distance calculator...
          if (resourceContainers.length > 0 && creep.ticksToLive > 400) {
            //console.log('resources waiting...');
            let target = resourceContainers[0];
            JSON.stringify(resourceContainers);
            if (target) {
              //console.log("Resources found in " + JSON.stringify(target) + " in container " + target.id);
              if (target) {
                creep.memory.haulingResources = target.id;
              }
            }
          }

          if (!creep.memory.haulingResources) {
            // this is the tricky part, choose a source...
            var sourceDetails = origin.memory.energySourceFlags_details;
            var targets = _.filter(sourceDetails, 
              (srcDet) => (
                origin.memory.defend.indexOf(srcDet.room) === -1
                && (srcDet.energy + (srcDet.pathCost * srcDet.energyPerTick) > Math.min(creep.carryCapacity - creep.carry.energy, 500))
              ));
            
            targets = targets.sort((a,b) => b.energy - a.energy);

            if (targets.length > 0) {
              creep.memory.intendedSource = targets[0].name;
              //console.log("Retrieving energy from : " + creep.memory.intendedSource);

              Game.rooms[creep.memory.origin].memory.energySourceFlags_details[creep.memory.intendedSource]['energy'] = 
                Game.rooms[creep.memory.origin].memory.energySourceFlags_details[creep.memory.intendedSource]['energy'] 
                - (creep.carryCapacity - creep.carry.energy);
            } else {
              //console.log("no energy to haul...")
              creep.say("lame");
              creep.fleeFrom(creep.room.find(FIND_STRUCTURES), 2);
            }
          }
        }
        
        if (creep.memory.haulingResources) {
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
                creep.travelTo(container, {range: 1});
              }
            }
          } else {
            creep.memory.haulingResources = undefined;
          }
        } else if (creep.memory.intendedSource) {
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
            creep.travelTo(target, { range: 1 });
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

    let totalCarryRequired = _.sum(room.memory.energySourceFlags_details, 'carryRequired') + carryRequiredForExtractor;

    if (room.controller.level >= 8) {
      totalCarryRequired *= 0.9;
    }

    return (Math.ceil(totalCarryRequired / (_.groupBy(this.determineBodyParts(room))[CARRY].length * 50)));
  },

  determinePriority: function(room, rolesInRoom) {
    let energyFactor = 0;
    if ((rolesInRoom['builder'] && rolesInRoom['builder'].length >= 1)
       && (rolesInRoom['upgrader'] && rolesInRoom['upgrader'].length >= 1)) {
      // subtract 2 from the priority for every thousand energy (rounded up) at the 'worst' energy source
      // up to a maximum of 16, so we only supersede miners at the most.
      energyFactor = Math.min(16, (2 * Math.max(0, Math.ceil((_.max(room.memory.energySourceFlags_details, 'energy').energy - 2000) / 1000))));
    }
    return 55 - energyFactor;
  }
};

module.exports = roleSmartHauler;
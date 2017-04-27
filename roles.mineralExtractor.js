require('prototypes')();
const profiler = require('screeps-profiler');

let roleMineralExtractor = {

  spawnType: 'reservation',
  recycleOnWound: false,
  flees: true,

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    if (!creep.memory.roleSpecificFlag) {
      creep.reserveRoleSpecificFlag(Game.rooms[creep.memory.origin].memory.roleReservables['mineralExtractor']);
    }

    let flag = Game.flags[creep.memory.roleSpecificFlag];

    if (flag && creep.room.name !== flag.pos.roomName) {
      creep.travelTo(flag);
    } else {
      if (flag && flag.room) {
        if (!creep.memory.extractorId) {
          let extractor = flag.room.find(FIND_STRUCTURES, { filter: (s) => (s.structureType === STRUCTURE_EXTRACTOR) })[0];
          creep.memory.extractorId = extractor.id;
        }

        if (!creep.memory.mineralId) {
          let mineral = flag.room.find(FIND_MINERALS)[0];
          creep.memory.mineralId = mineral.id;
        }
      }

      if(creep.memory.delivering && _.sum(creep.carry) == 0) {
        creep.memory.delivering = false;
      }
      if(!creep.memory.delivering && _.sum(creep.carry) >= 5) {
        creep.memory.delivering = true;
      }

      if(!creep.memory.delivering) {
        let extractor = Game.getObjectById(creep.memory.extractorId);
        let mineral = Game.getObjectById(creep.memory.mineralId);
        if (mineral.mineralAmount <= 0) {
          creep.memory.role = 'suicide';
        } else if (extractor.cooldown <= 0) {          
          if (creep.harvest(mineral) === ERR_NOT_IN_RANGE) {
            creep.travelTo(flag, {range: 0});
          }
        } else {
          let droppedResources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
          if (droppedResources.length > 0) {
            creep.pickup(droppedResources[0]);
          }
        }
      } else {
        let targets = creep.pos.findInRange(FIND_STRUCTURES, 3, {
          filter: (structure) => {
            return ((structure.structureType === STRUCTURE_TERMINAL 
              || structure.structureType === STRUCTURE_STORAGE 
              || structure.structureType === STRUCTURE_CONTAINER)
              && _.sum(structure.store) < structure.storeCapacity);
          }
        });
        if(targets.length > 0) {
          let target = creep.pos.findClosestByRange(targets);
          if (target) {
            if (creep.pos.getRangeTo(target) <= 1) {
              for(var resourceType in creep.carry) {
                creep.transfer(target, resourceType);
              }
            } else {
              creep.travelTo(target, {range: 1});
            }
          }
        } else {
          for(var resourceType in creep.carry) {
            creep.drop(resourceType);
          }
        }
      }
    }
  }, 'run:mineralExtractor'),

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;

    var segment = [WORK,WORK,MOVE];
    var body = [CARRY];
    maxEnergy -= BODYPART_COST[CARRY];
    var segmentCost = _.sum(segment, (p) => BODYPART_COST[p]);

    do {
      body = segment.concat(body);
      maxEnergy -= segmentCost;
    } while (maxEnergy - segmentCost > 0 && (body.length + segment.length) <= MAX_CREEP_SIZE)

    return body;
  },

  reservableFilter: function(reservable) {
    let flag = Game.flags[reservable];
    if (!flag || !flag.room) { return false; } // just assume the mineral is on cooldown in rooms we don't have vision on...
    
    if (flag.pos.findInRange(FIND_STRUCTURES, 1, 
      { filter: (s) => s.structureType === STRUCTURE_CONTAINER }).length <= 0) {
      return false;
    }

    let targets = flag.room.find(FIND_STRUCTURES, { filter: (s) => (s.structureType === STRUCTURE_EXTRACTOR) });
    if (targets.length > 0) {
      let extractor = targets[0];
      //console.log(extractor.pos)
      let mineral = flag.room.find(FIND_MINERALS)[0];
      if (mineral) {
        if (mineral.mineralAmount > 0 
          || mineral.ticksToRegeneration < 30) {
          return true;
        }
      }
    }

    return false;

  },

  determinePriority: function(room, rolesInRoom) {
    return 20;  
  }
};

module.exports = roleMineralExtractor;
require('prototypes')();
const profiler = require('screeps-profiler');

let roleBuilder = {

  spawnType: 'quota',
  recycleOnWound: true,
  flees: true,

  forget: function(creep) {
    creep.memory.buildOrRepairId = null;
  },

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let task = "";

    if (!creep.memory.replaceBefore) {
      creep.memory.replaceBefore = creep.body.length * 3;
    }

    if (_.sum(creep.carry) > creep.carry.energy) {
      for (let resourceType in creep.carry) {
        if (resourceType !== RESOURCE_ENERGY) {
          creep.drop(resourceType);
        }
      }
    }

    if(creep.memory.building && creep.carry.energy == 0) {
      creep.memory.building = false;
    }
    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
      creep.memory.building = true;
    }


    if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 5000) {
      // abort! abort!
    }

    if(creep.memory.building) {
      // Find something to either repair or build
      if (!creep.memory.buildOrRepair) {
        if (Memory.empire && Memory.empire.buildQueues 
          && Memory.empire.buildQueues[creep.memory.origin] && Memory.empire.buildQueues[creep.memory.origin].length > 0) {
          
          if (!Memory.empire.buildQueueAssignments) {
            Memory.empire.buildQueueAssignments = {};
          }

          for (var i = 0; i < Memory.empire.buildQueues[creep.memory.origin].length; i++) {            
            if (!Memory.empire.buildQueueAssignments[Memory.empire.buildQueues[creep.memory.origin][i].id] 
              && !Memory.empire.buildQueues[creep.memory.origin][i].assigned) {
              creep.memory.buildOrRepair = Memory.empire.buildQueues[creep.memory.origin][i];
              Memory.empire.buildQueueAssignments[Memory.empire.buildQueues[creep.memory.origin][i].id] = creep.name;
              Memory.empire.buildQueues[creep.memory.origin][i].assigned = true;
              break;
            }
          }
        }
      }
      
      if (creep.memory.buildOrRepair) {
        task = "W";
        let target = Game.getObjectById(creep.memory.buildOrRepair.id);
        if (target) {
          if (!target.room) { 
            creep.travelTo({x: 25, y: 25, roomName: target.pos.roomName});
          } else if (creep.room.name !== target.room.name) {
            creep.travelTo(target, { range: 1 });
            task += "-T";
          } else {
            if (target instanceof ConstructionSite) {
              task += "-B";
              if(creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.travelTo(target, { range: 3 });
              }
            } else if (target instanceof Structure) {
              task += "-R";
              if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                creep.travelTo(target, { range: 3 });
              }
              if (target.hits >= target.hitsMax || target.hits >= creep.memory.buildOrRepair.amountTotal) {
                creep.memory.buildOrRepair = null;
              }
            }

            if (creep.pos.x === 0) {
              creep.move(RIGHT);
            } else if (creep.pos.x === 49) {
              creep.move(LEFT);
            } else if (creep.pos.y === 0) {
              creep.move(BOTTOM);
            } else if (creep.pos.y === 49) {
              creep.move(TOP);
            }
          } 
        } else {
          creep.memory.buildOrRepair = null;
          task += '-X';
        }
      } else {
        if (creep.room.name !== creep.memory.origin) {
          creep.travelTo(Game.rooms[creep.memory.origin].controller, {range: 1});
        } else {
          if (Game.rooms[creep.memory.origin].controller.level === 8) {
            creep.goReinforce();
            task = "Ref";
          } else {
            creep.goUpgrade();
            task = "U";  
          }          
        }
      }
    } else {
      task = "Get";
      creep.goGetEnergy();
    }
    creep.say("B-" + creep.body.length + ":" + task);
  }, 'run:builder'),

  determineBodyParts: function(room) {
    let maxEnergy = Math.min(room.energyCapacityAvailable, 2000);
    
    var segment = [WORK,CARRY,MOVE];
    var body = [];
    var segmentCost = _.sum(segment, (p) => BODYPART_COST[p]);

    do {
      body = body.concat(segment);
      maxEnergy -= segmentCost;
    } while (maxEnergy - segmentCost > 0 && (body.length + segment.length) <= MAX_CREEP_SIZE)

    return body;
  },

  getQuota: function(room) {
    //let extensionBlueprints = room.find(FIND_CONSTRUCTION_SITES, { filter: (cs) => cs.structureType === STRUCTURE_EXTENSION });
    //console.log(extensionBlueprints.length)
    return 2;
  },

  determinePriority: function(room, rolesInRoom) {
    return 50 + ((rolesInRoom['builder'] && rolesInRoom['builder'].length > 2) ? 10 : 0);  
  }
};

module.exports = roleBuilder;
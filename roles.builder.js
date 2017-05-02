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
        getBuilderJob(creep);
      }
      
      if (creep.memory.buildOrRepair) {
        task = "W";
        let target = Game.getObjectById(creep.memory.buildOrRepair.id);
        if (target) {
          if (!target.room) { 
            creep.travelTo({x: 25, y: 25, roomName: target.pos.roomName}, { range: 3 });
          } else if (creep.room.name !== target.room.name) {
            creep.travelTo(target, { range: 1 });
            task += "-T";
          } else {
            if (target instanceof ConstructionSite) {
              task += "-B";
              if(creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.travelTo(target, { range: 3 });
              } else {
                creep.getOutOfTheWay(target);
              }
            } else if (target instanceof Structure) {
              task += "-R";
              if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                creep.travelTo(target, { range: 3 });
              } else {
                creep.getOutOfTheWay(target);
              }
              if (target.hits >= target.hitsMax 
                || target.hits >= creep.memory.buildOrRepair.amountTotal) {
                creep.memory.buildOrRepair = null;
              }
            }

            // if (creep.pos.x === 0) {
            //   creep.move(RIGHT);
            // } else if (creep.pos.x === 49) {
            //   creep.move(LEFT);
            // } else if (creep.pos.y === 0) {
            //   creep.move(BOTTOM);
            // } else if (creep.pos.y === 49) {
            //   creep.move(TOP);
            // }
          } 
        } else {
          delete creep.memory.buildOrRepair;
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
    //let maxEnergy = Math.min(room.energyCapacityAvailable, 2200);
    let maxEnergy = room.energyCapacityAvailable;
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
    let min = 1;
    let max = 4;
    if (room.controller.level >= 7) { 
      min = 2;
      max = 7; 
    }

    let repairJobs = _.filter(Memory.empire.buildQueues[room.name], (q) => q.type === 'repair' && !q.assigned);
    let buildJobs = _.filter(Memory.empire.buildQueues[room.name], (q) => q.type === 'build' && !q.assigned);

    let workBodyParts = _.filter(this.determineBodyParts(room), (b) => b === WORK).length;
    
    let totalRepairNeeded = _.sum(repairJobs, 'amountTotal') - _.sum(repairJobs, 'amount');
    let totalBuildNeeded = _.sum(buildJobs, 'amountTotal') - _.sum(buildJobs, 'amount');

    let sprawlFactor = Math.floor(room.memory.responsibleForRooms.length / 2);
    let queueFactor = Math.round(Memory.empire.buildQueues[room.name].length / 20);

    let repairNeeded = Math.round(totalRepairNeeded / (REPAIR_POWER * workBodyParts));
    let buildNeeded = Math.round(totalBuildNeeded / (BUILD_POWER * workBodyParts));

    let quota = Math.ceil(((repairNeeded + buildNeeded) * sprawlFactor * queueFactor) / 1000);

    // console.log(room.name + ', sprawlFactor: ' + sprawlFactor 
    //   + ', queueFactor: ' + queueFactor 
    //   + ', builder quota: ' + quota);
    return Math.min(max, Math.max(min, quota));
  },

  determinePriority: function(room, rolesInRoom) {
    return 50 + ((rolesInRoom['builder'] && rolesInRoom['builder'].length > 2) ? 10 : 0);  
  }
};


function getBuilderJob(creep) {
    if (Memory.empire && Memory.empire.buildQueues 
      && Memory.empire.buildQueues[creep.memory.origin] 
      && Memory.empire.buildQueues[creep.memory.origin].length > 0) {
      
      if (!Memory.empire.buildQueueAssignments) {
        Memory.empire.buildQueueAssignments = {};
      }

      for (var i = 0; i < Memory.empire.buildQueues[creep.memory.origin].length; i++) {
        if (!Memory.empire.buildQueueAssignments[Memory.empire.buildQueues[creep.memory.origin][i].id] 
          && !Memory.empire.buildQueues[creep.memory.origin][i].assigned) {
          
          if (Memory.empire.buildQueues[creep.memory.origin][i].type === 'repair' 
            && Memory.empire.buildQueues[creep.memory.origin][i].structureType === STRUCTURE_ROAD) {

            var j = i;
            let closestRoadIdx = i;
            let distanceToClosestRoad = 100;
            let currentJob;
            do {
              currentJob = Memory.empire.buildQueues[creep.memory.origin][j];

              if (creep.pos.getRangeTo2(currentJob.pos) < distanceToClosestRoad) {
                closestRoadIdx = j;
                distanceToClosestRoad = creep.pos.getRangeTo2(currentJob.pos);
              }

              j++;
            } while (currentJob.type === 'repair' 
              && currentJob.structureType === STRUCTURE_ROAD
              && j < Memory.empire.buildQueues[creep.memory.origin].length
              && !Memory.empire.buildQueueAssignments[Memory.empire.buildQueues[creep.memory.origin][j].id] 
              && !Memory.empire.buildQueues[creep.memory.origin][j].assigned
              && distanceToClosestRoad >= 10);

            // console.log('Creep: ' + creep.name + ', pos: ' + JSON.stringify(creep.pos));
            // console.log('Start idx: ' + i); 
            // console.log('Pos: ' + JSON.stringify(Memory.empire.buildQueues[creep.memory.origin][i].pos));
            // console.log('Final idx: ' + closestRoadIdx);
            // console.log('Pos: ' + JSON.stringify(Memory.empire.buildQueues[creep.memory.origin][closestRoadIdx].pos));

            creep.memory.buildOrRepair = Memory.empire.buildQueues[creep.memory.origin][closestRoadIdx];
            Memory.empire.buildQueueAssignments[Memory.empire.buildQueues[creep.memory.origin][closestRoadIdx].id] = creep.name;
            Memory.empire.buildQueues[creep.memory.origin][closestRoadIdx].assigned = true;
            return;

          } else {
            creep.memory.buildOrRepair = Memory.empire.buildQueues[creep.memory.origin][i];
            Memory.empire.buildQueueAssignments[Memory.empire.buildQueues[creep.memory.origin][i].id] = creep.name;
            Memory.empire.buildQueues[creep.memory.origin][i].assigned = true;
            return;
          }
        }
      }

      if (!creep.memory.buildOrRepair) {
        let buildQueue = _.filter(Memory.empire.buildQueues[creep.memory.origin], 
          (q) => q.type === 'build');

        if (buildQueue.length > 0) {
          creep.memory.buildOrRepair = buildQueue[0];
        }
      }
    }
}
getBuilderJob = profiler.registerFN(getBuilderJob, 'getBuilderJob');

module.exports = roleBuilder;
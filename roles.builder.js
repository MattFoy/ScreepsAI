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
    if (Game.time % 3 === 1) { return; }
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

    /*if (creep.room.name !== creep.memory.origin 
      && Game.rooms[creep.memory.origin].memory.defend.indexOf(creep.room.name) > -1) {
      creep.memory.returnToOrigin = true;
      creep.memory.buildOrRepairId = null;
    }*/

    if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 5000) {
      creep.memory.buildOrRepairId = null;          
    }
    if(creep.memory.building) {
      // Find something to either repair or build
      if (!creep.memory.buildOrRepairId) {
        // check for any repair targets (structures less than half health)
        let targets = creep.room.find(FIND_CONSTRUCTION_SITES, {
          filter: (structure) => (structure.structureType === STRUCTURE_EXTENSION)
        });
        if (targets.length > 0) {
          let target = creep.pos.findClosestByPath(targets);
          if (target) { creep.memory.buildOrRepairId = target.id; }
        } else {
          targets = creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: (structure) => (structure.structureType === STRUCTURE_CONTAINER 
              || structure.structureType === STRUCTURE_STORAGE)
          });

          if (targets.length > 0) {
            creep.memory.buildOrRepairId = creep.pos.findClosestByRange(targets).id;
          }
        }

        if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 5000) {
          creep.memory.buildOrRepairId = null;          
        }

        if (!creep.memory.buildOrRepairId && Game.time % 10 === 7) {

          let targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => (
              ((structure.structureType != STRUCTURE_WALL 
                && structure.structureType != STRUCTURE_RAMPART
                && structure.hits < (structure.hitsMax * 0.4))
                || 
                ((structure.structureType == STRUCTURE_WALL
                || structure.structureType == STRUCTURE_RAMPART)
                && structure.hits < 200000 
                && structure.hits > 0 
                && creep.room.controller.level >= 4))
            )
          });
          targets = _.filter(targets, function(t) {
            let x = _.filter(Game.creeps, (c) => c.memory.buildOrRepairId === t.id && c.id !== creep.id);
            //console.log(JSON.stringify(x));
            return (x.length < 1) 
          });

          if (targets.length > 0) {
            let closestDamagedStructure = creep.pos.findClosestByPath(targets);
            if (closestDamagedStructure) {
              creep.memory.buildOrRepairId = closestDamagedStructure.id;
            }
          }
          
          if (!creep.memory.buildOrRepairId) {          
            let targets = [];
            for (let i = 0; i < Game.rooms[creep.memory.origin].memory.responsibleForRooms.length; i++) {
              let roomName = Game.rooms[creep.memory.origin].memory.responsibleForRooms[i];
              let considerRoom = Game.rooms[roomName];
              if (considerRoom) {
                targets = considerRoom.find(FIND_STRUCTURES, {
                  filter: (structure) => (
                    ((structure.structureType != STRUCTURE_WALL 
                    && structure.structureType != STRUCTURE_RAMPART
                    && structure.hits < (structure.hitsMax * 0.4))
                    || 
                    ((structure.structureType == STRUCTURE_WALL
                    || structure.structureType == STRUCTURE_RAMPART)
                    && structure.hits < 200000 
                    && structure.hits > 0 
                    && creep.room.controller.level >= 4))
                  )
                });
                targets = _.filter(targets, function(t) {
                  let x = _.filter(Game.creeps, (c) => c.memory.buildOrRepairId === t.id && c.id !== creep.id);
                  return (x.length < 1) 
                });
                if (targets.length > 0) {
                  //console.log("Repairing: " + targets[0])
                  creep.memory.buildOrRepairId = targets[0].id;
                  break;
                }

              } else {
                //console.log("Lost vision on " + roomName);
              }
            }

            if (!creep.memory.buildOrRepairId) {

              // try finding some local blueprints
              let targets = creep.room.find(FIND_CONSTRUCTION_SITES);        
              //targets = _.filter(targets, function(t) {
              //  let x = _.filter(Game.creeps, (c) => c.memory.buildOrRepairId === t.id && c.id !== creep.id);
              //  return (x.length < 1) 
              //});
              if(targets.length) {
                //let target = Game.rooms[creep.memory.origin].controller.pos.findClosestByPath(targets);
                let target = creep.pos.findClosestByPath(targets);
                if (target) {
                  creep.memory.buildOrRepairId = target.id;
                }
              }

              if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 5000) {
                creep.memory.buildOrRepairId = null;          
              }
              
              if (!creep.memory.buildOrRepairId) {
                // check for foreign build sites then
                let targets = _.filter(Game.constructionSites,
                  (cs) => (Game.rooms[creep.memory.origin].memory.responsibleForRooms.indexOf(cs.pos.roomName) >= 0));

                targets = _.filter(targets, function(t) {
                  let x = _.filter(Game.creeps, (c) => c.memory.buildOrRepairId === t.id && c.id !== creep.id);
                  return (x.length < 1) 
                });
                 
                for (let i in targets) {
                  //console.log('Creep: ' + creep.name + ', site: ' + targets[i] + ', room: ' + targets[i].pos.roomName);
                }
                
                if (targets.length > 0) {
                  creep.memory.buildOrRepairId = targets[0].id;
                }
              }
            }
          }
        }
      }
      
      if (creep.memory.buildOrRepairId) {
        task = "W";
        let target = Game.getObjectById(creep.memory.buildOrRepairId);
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
              // clear repair order if over 90% durability
              if ((target.structureType != STRUCTURE_WALL
                && target.structureType != STRUCTURE_RAMPART
                && target.hits > (target.hitsMax - REPAIR_POWER))
                || 
                ((target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_RAMPART))
                && (creep.room.controller.level < 4 || target.hits >= 200000)) {
                creep.memory.buildOrRepairId = null;
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
          creep.memory.buildOrRepairId = null;
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
            task = "Upgr";  
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
    let maxEnergy = Math.min(room.energyCapacityAvailable, 1800);
    
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
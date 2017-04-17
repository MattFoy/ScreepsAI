require('prototypes')();
const profiler = require('screeps-profiler');

let roleRemoteDefender = {

  spawnType: 'global',
  
  // _.map(_.filter(Game.creeps, (c) => c.memory.role === 'attacker'), function(c) { console.log(c.name); c.memory.rallyPointFlag = 'RallyPoint1'; })
  
  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {    
    let movePathStyle = {visualizePathStyle: {stroke: '#0000bb', strokeWidth: .2, opacity: 0.5, lineStyle: 'dashed'}};
    
    if (!creep.memory.roomToDefend) {
      for (var i = 0; i < Game.rooms[creep.memory.origin].memory.defend.length; i++) {
        if (_.filter(Game.creeps, (c) => (c.memory.origin === creep.room.name
              && c.memory.role === 'remoteDefender'
              && c.memory.roomToDefend === Game.rooms[creep.memory.origin].memory.defend[i])).length < 1) {
          creep.memory.roomToDefend = Game.rooms[creep.memory.origin].memory.defend[i];
          break;
        }        
      }
    }
    
    if (creep.memory.roomToDefend && Game.rooms[creep.memory.origin].memory.defend.indexOf(creep.memory.roomToDefend) === -1) {
      creep.memory.roomToDefend = undefined;
    } else if (!creep.memory.roomToDefend && creep.room.find(FIND_HOSTILE_CREEPS).length > 0) {
      creep.memory.roomToDefend = creep.room;
    }

    if (creep.memory.roomToDefend) {

      if(creep.room.name !== creep.memory.roomToDefend) {
        if (creep.getActiveBodyparts(MOVE) === 0) {
          creep.suicide();
        }
        if (Game.rooms[creep.memory.roomToDefend]) {
          creep.travelTo(Game.rooms[creep.memory.roomToDefend].controller, {range: 1});
        } else {
          creep.travelTo({x:25, y:25, roomName: creep.memory.roomToDefend});
        }
      } else {
        var targets = creep.room.find(FIND_HOSTILE_CREEPS, { filter: (c) => c.owner.username !== 'Source Keeper' });
        
        let target;
        if (creep.memory.targetId) {
          target = Game.getObjectById(creep.memory.targetId);
          if (!target) {
            delete creep.memory.targetId;
          }
        }

        if (!target) {
          target = creep.pos.findClosestByRange(_.filter(targets, 
            (t) => t.getActiveBodyparts(ATTACK) > 0 || t.getActiveBodyparts(RANGED_ATTACK) > 0));
          if (target) { creep.memory.targetId = target.id; }
        }

        // To arms!
        if (target) {
          if (targets.length > 1) {
            let targetsInRange = _.reduce(targets, (memo,c) => memo + (creep.pos.getRangeTo(c) <= 3 ? 1 : 0), 0);
            let healersNearTarget = _.reduce(targets, (memo,c) => memo + (target.pos.getRangeTo(c) <= 3 ? 1 : 0), 0)
            if (targetsInRange > 1 && healersNearTarget > 0) {
              creep.rangedMassAttack();
            } else {
              creep.rangedAttack(target);
            }
          } else {
            creep.rangedAttack(target);
          }

          if (creep.getActiveBodyparts(ATTACK) <= 0 && creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
            let dist = creep.pos.getRangeTo(target);
            if (dist <= 3) { 
              creep.rangedAttack(target);
            }
            if (dist < 3) {
              creep.fleeFrom([target], 3);
            } else if (dist > 3) {
              creep.moveTo(target);
            }
          } else {
            creep.attack(target);
            creep.moveTo(target, movePathStyle);
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
        } else {
          // crisis averted!
          let origin = Game.rooms[creep.memory.origin];
          if (origin) {
            // remove room from defense list (although this should happen already)
            let idx = origin.memory.defend.indexOf(creep.memory.roomToDefend);
            if (idx > -1) {
              origin.memory.defend.splice(idx, 1);
            }
            creep.memory.roomToDefend = null;
            
            // reassignment
            for (var i = 0; i < Game.rooms[creep.memory.origin].memory.defend.length; i++) {
              if (_.filter(Game.creeps, (c) => (c.memory.origin === creep.room.name
                    && c.memory.role === 'remoteDefender'
                    && c.memory.roomToDefend === Game.rooms[creep.memory.origin].memory.defend[i])).length < 1) {
                creep.memory.roomToDefend = Game.rooms[creep.memory.origin].memory.defend[i];
                break;
              }        
            }
          }
          
          if (!creep.memory.roomToDefend) {
            creep.memory.role = 'suicide';
          }
        }       
      }
    }
  }, 'run:remoteDefender'),

  determineSpawnParams: function(room) {
    let defendRoom = '';
    let body = [];
    let squadIdx = -1;

    for (var i = 0; i < room.memory.defend.length; i++) {
      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]]) {
        for (var j = 0; j < GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]].length; j++) {
          if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]][j].name) {
            defendRoom = room.memory.defend[i];
            body =  GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]][j].body;
            squadIdx = j;
            break;
          }
        }
      }
    }

    if (body.length <= 0) {
      body = this.determineBodyParts(room);
    }

    // a closure!
    function saveCreepName(roomName, idx) {
      let run = function(name) {
        console.log(name + ' spawned to defend ' + roomName + ' in squad position: ' + idx)
        GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[roomName][idx].name = name;
      }
      return run;
    }

    let callback = ((squadIdx > -1) ? saveCreepName(defendRoom, squadIdx) : null);

    return {
      memory: { origin: room.name, role: 'remoteDefender' },
      body: body,
      spawnCallback: callback
    }
  },

  determineBodyParts: function(room) {
    let maxEnergy = room.energyCapacityAvailable;
     if (maxEnergy >= 4000) {
      return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK];
    } else if (maxEnergy >= 2300) {
      return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK];
    } else if (maxEnergy >= 1600) {
      return [TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,MOVE,RANGED_ATTACK,RANGED_ATTACK];
    } else if (maxEnergy >= 770) {
      return [TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,RANGED_ATTACK];
    } else if (maxEnergy >= 550) {
      return [TOUGH,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,RANGED_ATTACK];
    } else {
      return [MOVE,MOVE,ATTACK,ATTACK];
    }
  },

  spawnCondition: function(room) {
    let quota = 0;
    for (var i = 0; i < room.memory.defend.length; i++) {
      let currentDefenders = _.filter(Game.creeps, (c) => 
        c.memory.origin === room.name 
        && c.memory.role === 'remoteDefender' 
        && c.memory.roomToDefend === room.memory.defend[i]
      ).length;
      //console.log("Current defenders: " + currentDefenders);
      if (currentDefenders >= 1) { continue; }

      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]]) {
        // if there's a squad plan for this defense, fill it
        for (var j = 0; j < GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]].length; j++) {
          if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]][j].name) {
            quota++;
          }
        }
      } else {
        // if there isn't, just spawn a mook
        quota++;
      }
    }
    return quota;
  },

  determinePriority: function() {
    return 1;
  }
};

module.exports = roleRemoteDefender;
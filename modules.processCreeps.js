let roles = require('roles');
const profiler = require('screeps-profiler');

function processCreeps() {
  let hostilesInRoom = {};

  for(let name in Game.creeps) {
    let creep = Game.creeps[name];

    if (!hostilesInRoom[creep.room.name]) {
      let hostiles = creep.room.find(FIND_HOSTILE_CREEPS, { filter: 
        (c) => c.getActiveBodyparts(ATTACK) > 0 
          || c.getActiveBodyparts(RANGED_ATTACK) > 0 });
      let skLairs = creep.room.find(FIND_STRUCTURES, { filter: (s) => 
        s.structureType === STRUCTURE_KEEPER_LAIR && s.ticksToSpawn < 10 });
      hostilesInRoom[creep.room.name] = hostiles.concat(skLairs);
    }
    
    if (creep.ticksToLive === undefined) {
      //console.log('Still spawning');
    } else {
      if (roles[creep.memory.role].flees
        && creep.room.name !== creep.memory.origin
        && Game.rooms[creep.memory.origin].memory.defend
        && Game.rooms[creep.memory.origin].memory.defend.indexOf(creep.room.name) > -1) {
        creep.memory.returnToOrigin = true;
        if (roles[creep.memory.role].forget) {
          roles[creep.memory.role].forget(creep);
        }
      }

      if (creep.memory.returnToOrigin) {
        if (creep.room.name !== creep.memory.origin) {
          //console.log(creep.name + ', ' + creep.memory.role + ', fleeing to ' + creep.memory.origin)
          creep.travelTo(Game.rooms[creep.memory.origin].controller, {range: 1});
          if (creep.fatigue > 0 && creep.carry[RESOURCE_ENERGY] > 0) {
            creep.drop(RESOURCE_ENERGY);
          }
          if (roles[creep.memory.role].forget) {
            roles[creep.memory.role].forget(creep);
          }
        } else {
          if (creep.pos.x === 0) {
            creep.move(RIGHT);
          } else if (creep.pos.x === 49) {
            creep.move(LEFT);
          } else if (creep.pos.y === 0) {
            creep.move(BOTTOM);
          } else if (creep.pos.y === 49) {
            creep.move(TOP);
          }
          creep.memory.returnToOrigin = undefined;
          console.log(creep.name + ' eh');
        }
      } else if (creep.memory.role && roles[creep.memory.role]) {
        let fleeing = false;
        if (roles[creep.memory.role].flees && hostilesInRoom[creep.room.name] && hostilesInRoom[creep.room.name].length > 0) {
          if (creep.pos.findClosestByRange(hostilesInRoom[creep.room.name]).pos.getRangeTo(creep) <= 5) {
            // flee!
            //console.log(JSON.stringify(hostilesInRoom[creep.room.name]));
            try {
                creep.fleeFrom(hostilesInRoom[creep.room.name]);
                creep.say('Fleeing!');
                fleeing = true;
            } catch(e) {}
          }
        }

        if (!fleeing) {
          roles[creep.memory.role].run(creep);

          if (roles[creep.memory.role].recycleOnWound && creep.hits < (creep.hitsMax - 99)) {
            creep.memory.previousRole = creep.memory.role;
            creep.memory.reason = 'wounded';
            creep.memory.role = 'suicide';
            if (roles[creep.memory.role].forget) {
              roles[creep.memory.role].forget(creep);
            }
          }
        }
      }
    }

    if (creep.memory.travelledLast && (Game.time - creep.memory.travelledLast > 1)) {
      //console.log(creep.name + ', ' + creep.memory.role + ', stopped moving.');
      delete creep.memory.travelledLast;
      delete creep.memory.travelTo;
      delete creep.memory.flowTo;
      delete creep.memory.flowToPrevious;
      delete creep.memory.flowStuck;
    }
  }
}
processCreeps = profiler.registerFN(processCreeps, 'processCreeps');

module.exports = processCreeps;
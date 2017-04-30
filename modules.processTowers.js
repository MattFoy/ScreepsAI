const profiler = require('screeps-profiler');

function processTowers(room) {
  var towers = room.find(FIND_MY_STRUCTURES, {
    filter: function(object) {
      return object.structureType === STRUCTURE_TOWER;
    }
  });

  if (towers.length > 0) {
    var target;
    var mode;
    let tower = towers[0];

    var healers = room.find(FIND_HOSTILE_CREEPS, {
      filter: function(object) {
        return object.getActiveBodyparts(HEAL) > 0
          && 0 > GameState.allies.indexOf(object.owner.username)
      }
    });
    if (healers.length > 0) {
      var totalHEAL = 0;
      totalHEAL = _.sum(healers, function(c) { return c.getActiveBodyparts(HEAL); });
      let closestHealer = tower.pos.findClosestByRange(healers);

      if (totalHEAL * HEAL_POWER >= towers.length * closestHealer.pos.getTowerDamage()) { // TODO: fix this magic number
        console.log("cannot kill" + totalHEAL);
      }
      if (!target) {
        target = closestHealer;
      }
    } else {        
      if (!target) {
        target = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: function(object) {
          return 0 > GameState.allies.indexOf(object.owner.username);
        }});
      }
    }
    if(target) {
      //console.log("Attacking: " + target);
      mode = 'attack';
    } else {
      var closestWoundedCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (c) => (c.hits > 0 && c.hits < c.hitsMax) }); 
      if (closestWoundedCreep) {
        //console.log("Healing: " + closestWoundedCreep);
        //tower.heal(closestWoundedCreep);
        target = closestWoundedCreep;
        mode = 'heal';
      } else {
        if (tower.energy > (tower.energyCapacity * 0.80)) {
          var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => (
              ((structure.structureType != STRUCTURE_WALL 
              && structure.structureType != STRUCTURE_RAMPART
              && structure.hits < (structure.hitsMax * 0.2))
              || 
              ((structure.structureType == STRUCTURE_WALL
              || structure.structureType == STRUCTURE_RAMPART)
              && (room.controller.level >= 4 && structure.hits < 10000 && structure.hits > 0)))
            )
          });
          if(closestDamagedStructure) {
            //tower.repair(closestDamagedStructure);
            target = closestDamagedStructure;
            mode = 'repair';
          }
        }
      }
    }
  }

  for (var i = 0; i < towers.length; i++) {
    var tower = towers[i];
    if (tower instanceof StructureTower) {
       // Kill healers
       if (mode === 'attack') {
        tower.attack(target);
       } else if (mode === 'heal') {
        tower.heal(target);
       } else if (mode === 'repair') {
        tower.repair(target);
       }
    }
  }
}

processTowers = profiler.registerFN(processTowers, 'processTowers');

module.exports = processTowers;
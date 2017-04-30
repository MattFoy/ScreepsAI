const profiler = require('screeps-profiler');

function processLabs(room) {
  let labs = room.find(FIND_STRUCTURES, {filter: function(s) {
    return s.structureType === STRUCTURE_LAB
  }});

  if (labs.length > 4) {
    if (!room.memory.science) {
      room.memory.science = {};
    }
    if (!room.memory.science.inputLabs) {
      room.memory.science.inputLabs = [];
    }
    if (!room.memory.science.labCount) {
      room.memory.science.labCount = labs.length;
    } else {
      if (labs.length !== room.memory.science.labCount) {
        room.memory.science = {};
        room.memory.science.labCount = labs.length;
      }
    }

    if (Memory.empire && Memory.empire.atWar && labs.length >= 4) {
      // choose boosting labs
      //delete room.memory.science.boosts;
      if (!room.memory.science.boosts) {
        room.memory.science.boosts = {};
        room.memory.science.inputLabs = [];

        room.memory.science.boostMinerals = {};
        room.memory.science.boostMinerals[HEAL] = RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE;
        room.memory.science.boostMinerals[TOUGH] = RESOURCE_CATALYZED_GHODIUM_ALKALIDE;
        room.memory.science.boostMinerals[ATTACK] = RESOURCE_CATALYZED_UTRIUM_ACID;
        room.memory.science.boostMinerals[WORK] = RESOURCE_CATALYZED_ZYNTHIUM_ACID;

        for (let bodyPart in room.memory.science.boostMinerals) {
          if (!room.memory.science.boosts[bodyPart]) {
            let availableLabs = _.filter(labs, (l) => _.filter(room.memory.science.boosts, (id) => id === l.id).length === 0);
            let closestLabToSpawns = null;
            let avgRangeToSpawns = 100;
            let spawns = room.find(FIND_MY_SPAWNS);
            if (spawns.length > 0) {
              for(var i = 0; i < availableLabs.length; i++) {
                let distToSpawns = 0;
                for(var j = 0; j < spawns.length; j++) {
                  distToSpawns += availableLabs[i].pos.getRangeTo(spawns[j]);
                }
                distToSpawns /= spawns.length;
                if (distToSpawns < avgRangeToSpawns) {
                  avgRangeToSpawns = distToSpawns;
                  closestLabToSpawns = availableLabs[i];
                }
              }
              room.memory.science.boosts[bodyPart] = closestLabToSpawns.id;
            }
          }  
        }
      } else {
        // boost labs already set up
      }
    } else {
      if (room.memory.science.boosts) {
        delete room.memory.science.boosts;
        room.memory.science.inputLabs = [];
      }
    }

    if (!room.memory.science.inputLabs || (room.memory.science.inputLabs && room.memory.science.inputLabs.length !== 2)) {
      let availableLabs = labs;
      if (room.memory.science.boosts) {
        availableLabs = _.filter(labs, (l) => _.filter(room.memory.science.boosts, (id) => id === l.id).length === 0);
      }

      console.log("Determining input labs.");
      _.filter(availableLabs, function(l1) {
        let inRangeToAll = true;
        availableLabs.forEach((l2) => inRangeToAll = inRangeToAll && l1.pos.getRangeTo(l2) <= 2);
        if (inRangeToAll) {
          if (room.memory.science.inputLabs.length < 2) {
            room.memory.science.inputLabs.push(l1.id);
          }
        }
      });
    }

    if (room.memory.science.inputLabs && room.memory.science.inputLabs.length === 2) {
      //room.visual.text('i',)
      let lab1 = Game.getObjectById(room.memory.science.inputLabs[0]);
      let lab2 = Game.getObjectById(room.memory.science.inputLabs[1]);

      if (Memory.empire.scm.reactions[room.name] && Memory.empire.scm.reactions[room.name].length === 2) {
        room.memory.science.resource1 = Memory.empire.scm.reactions[room.name][0];
        room.memory.science.resource2 = Memory.empire.scm.reactions[room.name][1];
      } else {
        delete room.memory.science.resource1;
        delete room.memory.science.resource2;
      }
    }

    labs.forEach(function(lab) {
      if (room.memory.science.boosts) {
        if (_.filter(room.memory.science.boosts, (id) => id === lab.id).length > 0) {
          room.visual.text('B', lab.pos.x, lab.pos.y);
          return;
        }
      }

      if (room.memory.science.inputLabs.indexOf(lab.id) > -1) {
        room.visual.text('I', lab.pos.x, lab.pos.y);
      } else { 
        room.visual.text('O', lab.pos.x, lab.pos.y);
        if (room.memory.science.inputLabs.length === 2) {
          let lab1 = Game.getObjectById(room.memory.science.inputLabs[0]);
          let lab2 = Game.getObjectById(room.memory.science.inputLabs[1]);
          lab.runReaction(lab1, lab2);
        }
      }
    });
  }
}

processLabs = profiler.registerFN(processLabs, 'processLabs');

module.exports = processLabs
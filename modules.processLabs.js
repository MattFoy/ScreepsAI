const profiler = require('screeps-profiler');

function processLabs(room) {
  let labs = room.find(FIND_STRUCTURES, {filter: function(s) {
    return s.structureType === STRUCTURE_LAB
  }});
  if (labs.length > 0) {
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
        room.memory.science.inputLabs = [];
      }
    }

    if (room.memory.science.inputLabs.length !== 2) {
      console.log("Determining input labs.");
      _.filter(labs, function(l1) {
        let inRangeToAll = true;
        labs.forEach((l2) => inRangeToAll = inRangeToAll && l1.pos.getRangeTo(l2) <= 2);
        if (inRangeToAll) {
          room.visual.text('o', l1.pos.x, l1.pos.y);
          if (room.memory.science.inputLabs.length < 2) {
            room.memory.science.inputLabs.push(l1.id);
          }
        }
      });
    }

    if (room.memory.science.inputLabs.length === 2) {
      //room.visual.text('i',)
      let lab1 = Game.getObjectById(room.memory.science.inputLabs[0]);
      let lab2 = Game.getObjectById(room.memory.science.inputLabs[1]);

      room.visual.text('i', lab1.pos.x, lab1.pos.y);
      room.visual.text('i', lab2.pos.x, lab2.pos.y);

      room.memory.science.reaction = RESOURCE_HYDROXIDE;
      room.memory.science.resource1 = RESOURCE_HYDROGEN;
      room.memory.science.resource2 = RESOURCE_OXYGEN;
    }

    labs.forEach(function(lab) {
      if (room.memory.science.inputLabs.indexOf(lab.id) === -1) {
        // run reaction
      }
    });
  }
}

processLabs = profiler.registerFN(processLabs, 'processLabs');

module.exports = processLabs
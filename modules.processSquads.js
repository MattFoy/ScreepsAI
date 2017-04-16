const profiler = require('screeps-profiler');
const squads = require('squads');

let processSquads = function() {
  for (var name in Game.flags) {
    let match = /ATTACK_(.*)/.exec(name);
    if (match) {
      let attackId = match[1];
      if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId]) {
        GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId] = {};
      }

      let flag = Game.flags[name];

      if (flag.memory.launch && flag.memory.tactic && !flag.memory.initialized) {
        if (flag.memory.tactic) {
          GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId].rallyPoint = {
            x: flag.pos.x,
            y: flag.pos.y,
            roomName: flag.pos.roomName
          };

          ['tactic', 'target', 'medicTent', 'regroup'].forEach(function(name) {
            if (flag.memory[name]) {
              GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId][name] = flag.memory[name];
            }
          })

          GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId].squad = 
            _.map(squads.templates[flag.memory.tactic], function(s){ return { name: null, position: s.position, boosts: s.boosts, body: s.body } });
        }

        GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId].status = 'forming';
        flag.memory.initialized = true;
      }
    }
  }

  for (var name in GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads) {
    if (!Game.flags['ATTACK_' + name]) {
      delete GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name];
    } else {
      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].status === 'forming') {
        let formed = true;
        for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad.length; i++) {
          if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].name) {
            formed = false;
            break;
          }
        }

        if (formed) {
          GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].status = 'rallying'
        }
      }

      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].status === 'rallying') {
        let rallied = true;
        for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad.length; i++) {
          let creep = Game.creeps[GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].name];
          if (!creep) {
            console.log("Error, creep doesnt exist?")
          } else {
            if ((creep.room.name !== GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].rallyPoint.roomName)
              || (creep.pos.getRangeTo(GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].rallyPoint.x, GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].rallyPoint.y) > 4)) {
              rallied = false;
              break;
            } 
          }
        }

        if (rallied) {
          GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].status = 'ready'
        }
      }      
    }
  }
}

processSquads = profiler.registerFN(processSquads, 'processSquads');

module.exports = processSquads;
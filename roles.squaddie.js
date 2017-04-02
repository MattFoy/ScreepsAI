require('prototypes')();
let squads = require('squads.tactics');
let utilities = require('utilities');
const profiler = require('screeps-profiler');


let roleSquaddie = {
  
  // _.map(_.filter(Game.creeps, (c) => c.memory.role === 'attacker'), function(c) { console.log(c.name); c.memory.rallyPointFlag = 'RallyPoint1'; })
  spawnType: 'global',

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
    
    //if (!squad) { return; }
    if (!squad && creep.memory.position && creep.memory.target) {
      squads[creep.memory.position].run(creep);
    } else if (squad && squad.status && (squad.status === 'forming' || squad.status === 'rallying')) {
      if (creep.room.name !== squad.rallyPoint.roomName || (creep.pos.getRangeTo(squad.rallyPoint.x, squad.rallyPoint.y) > 2)) {
        creep.travelTo(squad.rallyPoint, {range: 0 });
      } else {
        //creep.travelTo(squad.rallyPoint, {range: 0, ignoreCreeps: false })
      }
    } else {
      if (!squad) { return; }
      let squadDetail = _.filter(squad.squad, (c) => c.name === creep.name)[0];
      if (!squadDetail) {
        console.log('[' + creep.name + '] ' + "I'm not in the squad? :(")
        squadDetail = { position: 'decoy' };
      } else {
        //console.log(JSON.stringify(squadDetail));
        //
        creep.memory.position = squadDetail.position;
        creep.memory.target = squad.target;
      }
      squads[squadDetail.position].run(creep);
    }
  }, 'run:squaddie'),

  determineSpawnParams: function(room) {
    let squad = '';
    let body = [];
    let squadIdx = -1;

    for (var name in GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads) {
      for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad.length; i++) {
        let bodyCost = utilities.bodyCost(GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].body);
        if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].name 
          && room.energyCapacityAvailable >= bodyCost) {
          squad = name;
          body =  GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].body;
          squadIdx = i;
          break;          
        }
      }
    }

    if (body.length <= 0) {
      body = this.determineBodyParts(room);
    }

    // a closure!
    function saveCreepName(squad, idx) {
      let run = function(name) {
        console.log(name + ' spawned to squad ' + squad + ' in squad position: ' + idx)
        GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[squad].squad[i].name = name;
      }
      return run;
    }

    let callback = ((squadIdx > -1) ? saveCreepName(squad, squadIdx) : null);

    return {
      memory: { origin: room.name, role: 'squaddie', squad: squad },
      body: body,
      spawnCallback: callback
    }
  },

  spawnCondition: function(room) {
    let quota = 0;
    for (var name in GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads) {
      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad) {
        for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad.length; i++) {
          let bodyCost = utilities.bodyCost(GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].body);
          if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].name 
            && room.energyCapacityAvailable >= bodyCost) {
            quota++;
          }
        }
      }
    }
    return quota;
  },

  determinePriority: function(room, rolesInRoom) {
    return 5;  
  }
};

module.exports = roleSquaddie;
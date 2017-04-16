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
        creep.travelTo({ pos: squad.rallyPoint }, {range: 1, allowHostile: true });
      } else {
        //creep.travelTo(squad.rallyPoint, {range: 1, ignoreCreeps: false, allowHostile: true })
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
    let boosts = [];

    for (var name in GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads) {
      if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad) { continue; }
      for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad.length; i++) {
        let bodyCost = utilities.bodyCost(GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].body);
        if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].name 
          && room.energyCapacityAvailable >= bodyCost
          && (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].boosts 
            || (GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].boosts.length > 0
              && room.memory.science && room.memory.science.boosts
              && _.reduce(boosts, function(memo,bodypart) { 
                return (memo && room.memory && room.memory.science && room.memory.science.boosts && room.memory.science.boosts[bodypart]) ? true : false; 
              }, true))) ) {
          squad = name;
          body =  GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].body;
          squadIdx = i;
          boosts = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].boosts;
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

    let ret = {
      memory: { origin: room.name, role: 'squaddie', squad: squad },
      body: body,
      spawnCallback: callback
    }

    if (boosts && boosts.length > 0) {
      ret.memory.boosts = boosts;
    }

    return ret;
  },

  spawnCondition: function(room) {
    let quota = 0;
    for (var name in GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads) {
      if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad) { continue; }
      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad) {
        for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad.length; i++) {
          let bodyCost = utilities.bodyCost(GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].body);
          if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].name 
            && room.energyCapacityAvailable >= bodyCost
            && (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].boosts 
            || (GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[name].squad[i].boosts.length > 0
              && room.memory.science && room.memory.science.boosts
              && _.reduce(boosts, function(memo,bodypart) { 
                return (memo && room.memory && room.memory.science && room.memory.science.boosts && room.memory.science.boosts[bodypart]) ? true : false; 
              }, true))) ) {
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
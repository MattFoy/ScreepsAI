require('prototypes')();
let squads = require('squads.tactics');
let utilities = require('utilities');
const profiler = require('screeps-profiler');


let roleSquaddie = {
  spawnType: 'global',

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    // Squaddies are operated by the campaign module
  }, 'run:squaddie'),

  determineSpawnParams: function(room) {
    let squad = '';
    let body = [];
    let squadIdx = -1;
    let boosts = [];
    let type = '';

    for (var name in Memory.empire.campaigns) {
      if (!Memory.empire.campaigns[name].squad) { continue; }
      if (Memory.empire.campaigns[name].status !== 'forming') { continue; }

      for (var i = 0; i < Memory.empire.campaigns[name].squad.length; i++) {
        let bodyCost = utilities.bodyCost(Memory.empire.campaigns[name].squad[i].body);
        if (!Memory.empire.campaigns[name].squad[i].name 
          && room.energyCapacityAvailable >= bodyCost
          && (!Memory.empire.campaigns[name].squad[i].boosts 
            || (Memory.empire.campaigns[name].squad[i].boosts.length > 0
              && room.memory.science && room.memory.science.boosts
              && _.reduce(Memory.empire.campaigns[name].squad[i].boosts, function(memo,bodypart) { 
                return (memo && room.memory && room.memory.science && room.memory.science.boosts && room.memory.science.boosts[bodypart]) ? true : false; 
              }, true))) ) {
          squad = name;
          body =  Memory.empire.campaigns[name].squad[i].body;
          type =  Memory.empire.campaigns[name].squad[i].type;
          squadIdx = i;
          boosts = Memory.empire.campaigns[name].squad[i].boosts;
          break;
        }
      }
    }

    if (body.length <= 0) {
      body = this.determineBodyParts(room);
    }

    // wow, so javascript, much closure!
    function saveCreepName(squad, idx) {
      let run = function(name) {
        console.log(name + ' spawned to squad ' + squad + ' in squad position: ' + idx)
        Memory.empire.campaigns[squad].squad[idx].name = name;
      }
      return run;
    }

    let callback = ((squadIdx > -1) ? saveCreepName(squad, squadIdx) : null);

    let ret = {
      memory: { origin: room.name, role: 'squaddie', campaign: squad, type: type },
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
    for (var name in Memory.empire.campaigns) {
      if (!Memory.empire.campaigns[name].squad) { continue; }
      if (Memory.empire.campaigns[name].status !== 'forming') { continue; }

      if (Memory.empire.campaigns[name].squad) {
        for (var i = 0; i < Memory.empire.campaigns[name].squad.length; i++) {
          let bodyCost = utilities.bodyCost(Memory.empire.campaigns[name].squad[i].body);
          if (!Memory.empire.campaigns[name].squad[i].name 
            && room.energyCapacityAvailable >= bodyCost
            && (!Memory.empire.campaigns[name].squad[i].boosts 
            || (Memory.empire.campaigns[name].squad[i].boosts.length > 0
              && room.memory.science && room.memory.science.boosts
              && _.reduce(Memory.empire.campaigns[name].squad[i].boosts, function(memo,bodypart) { 
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
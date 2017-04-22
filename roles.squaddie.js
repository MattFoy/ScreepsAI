require('prototypes')();
let squads = require('squads.tactics');
let utilities = require('utilities');
const profiler = require('screeps-profiler');


let roleSquaddie = {
  spawnType: 'global',

  /** @param {Creep} creep **/
  run: profiler.registerFN(function(creep) {
    let campaign = Memory.empire.campaigns[creep.memory.campaign];
    
    if (campaign && campaign.status && (campaign.status === 'forming' || campaign.status === 'rallying')) {
      if (creep.room.name !== campaign.rallyPoint.roomName 
        || (creep.pos.getRangeTo(campaign.rallyPoint.x, campaign.rallyPoint.y) >= 1)) {
        creep.travelTo({ pos: campaign.rallyPoint }, {range: 1, allowHostile: true });
      } else {
        //creep.travelTo(campaign.rallyPoint, {range: 1, ignoreCreeps: false, allowHostile: true })
      }
    } else {
      let allsWell = true;
      if (!campaign) { 
        console.log('[' + creep.name + '] ' + creep.memory.campaign + ' is invalid campaign?');
        return; 
      } else {
        let squadDetail = _.filter(campaign.squad, (c) => c.name === creep.name)[0];
        if (!squadDetail) { 
          console.log('[' + creep.name + '] is not in the campaign, ' + creep.memory.campaign + '?');
          return; 
        } else {
          squads[squadDetail.position].run(creep);
        }
      }
    }
  }, 'run:squaddie'),

  determineSpawnParams: function(room) {
    let squad = '';
    let body = [];
    let squadIdx = -1;
    let boosts = [];

    for (var name in Memory.empire.campaigns) {
      if (!Memory.empire.campaigns[name].squad) { continue; }
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
          squadIdx = i;
          boosts = Memory.empire.campaigns[name].squad[i].boosts;
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
        Memory.empire.campaigns[squad].squad[idx].name = name;
      }
      return run;
    }

    let callback = ((squadIdx > -1) ? saveCreepName(squad, squadIdx) : null);

    let ret = {
      memory: { origin: room.name, role: 'squaddie', campaign: squad },
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
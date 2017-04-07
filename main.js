/*

1. Add creeps to the spawn queue when they are close to dying
  * Will vary based on creep type / distance 

2. Haulers won't go to resource containers if they can't make it there and back again... 
shouldn't suicide though, find a closer container?

5. Auto-calc no. of necessary builders

6. Make haulers prioritize (slightly) things that are closer to them
  * i.e. 5000 energy within 20 ticks is probably more valuable that 6000 90 away.

8. Create base blueprinting solution 
  * design 'ideal' base.

10. Add max energy threshold to market queries / filter, wait for RCL 6...

11. Verify that sentries can handle SK invaders... it's a solid "maybe" right now.
  * verify that 2 spawns can actually keep up with it...
  * verify that this shit is actually profitable...

12. mineral extractors should wait if the container is full, 
  * not mine it and drop it and also not try to go store it somewhere else...
  * can cause issues with fleeing logic though

--- SQUAD LOGIC:
  * recheck squad periodically
   respawn missing squaddies? Or wait until all gone then reform from scratch?
   depends on the tactic, I suppose?
  * create a wall buster / economy drainer tactic
    - medic + dismantler / attacker
      - medic stays out of room and heals
      - dismantler walks in, walks out to get healed when under 75% hp
 

--- CPU issues:
  * fix builder logic, queue up work items once per tick, not once per builder...

*/

const profiler = require('screeps-profiler');

require('prototypes')();
const modules = require('modules');
const utilities = require('utilities');
const roles = require('roles');
const squads = require('squads');
const traveler = require('traveler');

const resources = require('resources');
//profiler.enable();

module.exports.loop = function () { profiler.wrap(function() {
  global.GameState = {};
  GameState.username = _.sample(Game.structures).owner.username;
  GameState.verbose = true;
  GameState.constants = {
    MEMORY_CRITICAL: 0,
    MEMORY_ECONOMIC_TRENDS: 1,
    MEMORY_STATS: 2,
    CARTOGRAPHY: 3
  };
  GameState.memory = {};
  GameState.allies = ['Drethin', 'NickelBomber'];
  GameState.cpuUsedToLoad = Game.cpu.getUsed();
  console.log(GameState.cpuUsedToLoad);

  RawMemory.setActiveSegments([
    GameState.constants.MEMORY_CRITICAL, 
    GameState.constants.MEMORY_ECONOMIC_TRENDS,
    GameState.constants.MEMORY_STATS,
    GameState.constants.CARTOGRAPHY
  ]);

  for (var i in GameState.constants) {
    if (RawMemory.segments[GameState.constants[i]]) {
      GameState.memory[GameState.constants[i]] = JSON.parse(RawMemory.segments[GameState.constants[i]]);
    } else {
      GameState.memory[GameState.constants[i]] = {};
    }
  }

  if (!GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms) {
    GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms = {};
  }

  if (!GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices) {
    GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices = {};
  }

  if (!GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration) {
    GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration = {};
  }

  if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].rooms) {
    GameState.memory[GameState.constants.MEMORY_CRITICAL].rooms = {};
  }

  if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads) {
    GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads = {};
  }
  
  if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads) {
    GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads = {};
  }

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

          ['tactic', 'target', 'medicTent'].forEach(function(name) {
            if (flag.memory[name]) {
              GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId][name] = flag.memory[name];
            }
          })

          GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[attackId].squad = 
            _.map(squads.templates[flag.memory.tactic], function(s){ return { name: null, position: s.position, body: s.body } });
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


  utilities.pruneMemory();

  console.log(' ============================== Tick# ' + Game.time 
    + ', CPU: ' + Game.cpu.limit + ', ' + Game.cpu.tickLimit + ', ' + Game.cpu.bucket 
    + ' ============================== ');
  
  modules.processCreeps();

  if (Game.time % 5 !== 1) {
  for(let roomName in Game.rooms) {
    let room = Game.rooms[roomName];    
    utilities.initializeRoomMemory(room);

    // Process my rooms
    if (room.controller && room.controller.my) {
      utilities.initializeMyRoomMemory(room);

      utilities.setupMiningFlags(roomName);
      
      utilities.calculateHaulingEconomy(room);
      
      if (room.storage && Game.time % 10 === 4) {
        GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[roomName].energyStorageTrends.push(room.storage.store[RESOURCE_ENERGY]);
        if (GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[roomName].energyStorageTrends.length > 1000) {
          GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[roomName].energyStorageTrends.shift();
        }
      }
      let energyTrendStatus = '';
      
      if (room.storage && GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[roomName].energyStorageTrends.length > 0) {
        let avgs = {};
        [10, 50, 100, 1000].forEach((x) => (
          avgs[x] = Math.floor(_.sum(_.takeRight(GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[roomName].energyStorageTrends, x)) 
            / Math.min(x, GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[roomName].energyStorageTrends.length)))
        );
        let symbol = (avgs[10] >= avgs[100] ? '+' : '');
        let difference = (avgs[10] - avgs[100]);
        let changePerTick = (difference / 1000)
        energyTrendStatus = ' Energy: <span style="color:yellow">\u26A1' + avgs[10] + "</span>"
          + ' (Trends-> ' + '\u039450: ' + ((avgs[10] - avgs[50]) > 0 ? '+' : '') + (avgs[10] - avgs[50])
          + ', ' + '\u0394100: ' + ((avgs[10] - avgs[100]) > 0 ? '+' : '') + (avgs[10] - avgs[100])
          + ', ' + '\u03941000: ' + ((avgs[10] - avgs[1000]) > 0 ? '+' : '') + (avgs[10] - avgs[1000])
          + ')';
      }

      let maxContainerEnergy = _.max(room.memory.energySourceFlags_details, 'energy');
      
      let roomStatusReport = 'ROOM: <a href="' + '#!/room/' + roomName + '">' + roomName + '</a>' 
        + ' Lvl.' + room.controller.level 
        + ' (' + (Math.round((room.controller.progress / room.controller.progressTotal) * 10000) / 100) + '%)'
        + ' (SpawnCap: ' + room.energyAvailable + '/' + room.energyCapacityAvailable + ')'
        + energyTrendStatus
        + ', EnergyContainerMax: <span style="color:' + (maxContainerEnergy.energy > 2000 ? '#ff3030' : 'green') 
        + '">' + maxContainerEnergy.energy + '</span>';

      GameState.verbose && console.log(roomStatusReport);

      if (Game.time % 3 === 0) {
        room.memory.responsibleForRooms.concat(room.name).forEach(function(rName) {
          //console.log('Reponsible for: ' + rName);
          let rRoom;
          if (rName === room.name) { rRoom = room; } else { rRoom = Game.rooms[rName]; }

          if (rRoom) {
            let hostiles = rRoom.getHostilesDetails(GameState);
            
            if (_.filter(hostiles, (d) => d.owner !== 'Source Keeper').length > 0) {
              console.log('<span style="color:red">HOSTILES DETECTED</span> IN <a href="#!/room/' + rName + '">' + rName + '</a>');
              
              if (_.filter(Game.creeps, (c) => c.memory.role === 'skSentry' 
                && Game.flags[c.memory.roleSpecificFlag].pos.roomName === rRoom.name) <= 0) {

                let res = utilities.calculateDefendersRequired(room, hostiles);
                console.log(res);

                if (res.length > 0) {
                  if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName]) {
                    GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName] = [];
                  }

                  if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName].length) {
                    let squad = _.map(res, function(body) { return { name: null, body: body }; });
                    GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName] = squad;
                  } else {
                    // already calculated squad... but we SHOULD recheck to see if mroe hostiles have appeared...
                    let squadDeath = false;
                    for (var i = 0; i < GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName].length; i++) {
                      if (GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName][i].name && !Game.creeps[GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName][i].name]) {
                        console.log(GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName][i].name + ' died...');
                        squadDeath = true;
                      }
                    }
                    if (squadDeath) {
                      delete GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName];
                    }
                  }
                } else {              
                  if (GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName]) {
                     delete GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName];
                  }
                }
                
                if (room.memory.defend.indexOf(rName) === -1) { 
                  room.memory.defend.push(rName); 
                }
              }
            } else {
              let idx = room.memory.defend.indexOf(rName);
              if (idx > -1) { room.memory.defend.splice(idx, 1); }
              if (GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName]) {
                 delete GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[rName];
              }
            }
          } else {
            //console.log(' --> <a href="#!/room/' + rName + '">' + rName + '</a> not visible');
          }
        });
      }

      //console.log(Game.cpu.getUsed());
      modules.processTowers(room);
      //console.log(Game.cpu.getUsed());
      modules.processLinks(room);
      //console.log(Game.cpu.getUsed());
      modules.processLabs(room);
      //console.log(Game.cpu.getUsed());

      if (Game.time % 2 === 0) {
        modules.processSpawning(room);
        //console.log(Game.cpu.getUsed());
      }

      if (room.storage && room.terminal) {
        room.memory.tradingPlan = {};
        room.memory.tradingPlan.resourceQuantities = {};

        for (var resourceIdx in RESOURCES_ALL) {
          let resource = RESOURCES_ALL[resourceIdx];
          let qtyAvailable = (room.storage.store[resource] ? room.storage.store[resource] : 0);
          let terminalAmount = 0;
          if (room.terminal.store[resource]) {
            terminalAmount = room.terminal.store[resource];
          }
          room.memory.tradingPlan.resourceQuantities[resource] = Math.min(qtyAvailable, Math.min(100000, Math.max(5000, (terminalAmount + qtyAvailable) - 100000)));
        }
        room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY] = Math.min(room.storage.store.energy, 40000);

        //console.log(room.name + ': ' + Game.cpu.getUsed());
        if (room.terminal && Game.time % 100 === 37) {
          // do market stuff
          // todo...
          //room.terminal.storeHistoricalPriceData();
        }
      }

    } else {
      //console.log(roomName + " isn't mine.");
    }

    let exits = Game.map.describeExits(room.name);
    [TOP,BOTTOM,LEFT,RIGHT].forEach(function(exit) {
      if (exits && exits[exit]) {
        if (!room.memory.flowFields) { room.memory.flowFields = {}; }
        if (!room.memory.flowFields[exits[exit]]) { room.memory.flowFields[exits[exit]] = []; }
        //console.log('[' + room.name + '] Checking ' + exits[exit] + ' flow field. ' + exit);
        //room.calculateFlowfield(exits[exit], exit);
      }
    });
  }


  for (var i in GameState.constants) {
    if (GameState.memory[GameState.constants[i]]) {
      let json = JSON.stringify(GameState.memory[GameState.constants[i]]);
      //console.log('Memory segment ' + i + ': ' + (json.length / 1024).toFixed(1) + '/100 KB' )
      RawMemory.segments[GameState.constants[i]] = json;
    }
  }

  (function(){

    // Don't overwrite things if other modules are putting stuff into Memory.stats
    if (Memory.stats == null) {
        Memory.stats = { tick: Game.time };
    }

    // Note: This is fragile and will change if the Game.cpu API changes
    Memory.stats.cpu = Game.cpu;
    Memory.stats.cpu.used = Game.cpu.getUsed(); // AT END OF MAIN LOOP
    Memory.stats.cpu.usedToLoad = GameState.cpuUsedToLoad;

    // Note: This is fragile and will change if the Game.gcl API changes
    Memory.stats.gcl = Game.gcl;

    const memory_used = RawMemory.get().length;
    // console.log('Memory used: ' + memory_used);
    Memory.stats.memory = {
        used: memory_used,
        // Other memory stats here?
    };

    Memory.stats.roomSummary = resources.summarize_rooms();

    Memory.stats.market = {
        credits: Game.market.credits,
        num_orders: Game.market.orders ? Object.keys(Game.market.orders).length : 0,
    };

    //Memory.stats.roomSummary = resources.summarize_rooms();

    // Add callback functions which we can call to add additional
    // statistics to here, and have a way to register them.
    // 1. Merge in the current repair ratchets into the room summary
    // TODO: Merge in the current creep desired numbers into the room summary
    //global.stats_callbacks.fire(Memory.stats);
  })(); // collect_stats
}
});}
/*

TODO:
* Power Bank code

* Custom lab plans for reactions in each room
 -- manual setup? How to automate the "plan" otherwise? :\
 -- how to route resources?
 -- when to switch over reaction types?

* Finish chemist code
  -- load nukers
  -- drain output labs (probably going to be important soon... lol)

* Set up link miners 
  - reduce hauling required
  - modify builder body parts accordingly

* Auto-calc no. of necessary builders/repairers based on queue
  - need to determine builder work part effective time

6. Make haulers prioritize (slightly) things that are closer to them
  * i.e. 5000 energy within 20 ticks is probably more valuable that 6000 90 away.

8. Create base blueprinting solution 
  * design 'ideal' base.

10. Add max energy threshold to market queries / filter, wait for RCL 6...

12. mineral extractors should wait if the container is full, 
  * not mine it and drop it and also not try to go store it somewhere else...
  * can cause issues with fleeing logic though

--- SQUAD LOGIC:
  * recheck squad periodically
   respawn missing squaddies? Or wait until all gone then reform from scratch?
   depends on the tactic, I suppose?

*/

const profiler = require('screeps-profiler');

require('prototypes')();
const modules = require('modules');
const utilities = require('utilities');
const roles = require('roles');
const traveler = require('traveler');

const resources = require('resources');

profiler.enable();

module.exports.loop = function () { profiler.wrap(function() {
  require('commandLineUtilities')();

  // to tide me over until morning...
  if (Game.time % 2000 === 333) {
    Game.spawnHelpFor('W87S43', 1, 'upgrader');
  }

  utilities.initGameState();
  utilities.pruneMemory();

  modules.processSquads();

  console.log(' ============================== Tick# ' + Game.time 
    + ', CPU: ' + Game.cpu.limit + ', ' + Game.cpu.tickLimit + ', ' + Game.cpu.bucket 
    + ' ============================== ');
  
  modules.processCreeps();

  if (Game.time % 15 === 1) {
    console.log("Generating build queue");
    Memory.empire.buildQueues = {};
  }

  for(let roomName in Game.rooms) {
    // skip every third tick when we're low on CPU...
    if (Game.cpu.bucket < 9000 && Game.time % 3 === 0) { break; }

    let room = Game.rooms[roomName];
    utilities.initializeRoomMemory(room);
    
    if (Game.time % 15 === 1) {
      utilities.generateBuildQueue(room);
    }

    // Process my rooms
    if (room.controller && room.controller.my) {
      utilities.initializeMyRoomMemory(room);
      if (!room.memory.miningFlagsInitialized) {
        utilities.setupMiningFlags(roomName);
      }      
      utilities.calculateHaulingEconomy(room);
      if (Game.time % 3 === 2) {
        utilities.calculateDefense(room);
      }
      if (Game.time % 173 === 13) {
        console.log("Generating upgrade sweet spots");
        utilities.generateUpgradeSweetSpots(room);
      }

      //console.log(Game.cpu.getUsed());
      modules.processTowers(room);
      //console.log(Game.cpu.getUsed());
      modules.processLinks(room);
      //console.log(Game.cpu.getUsed());

      if (Game.time % 10 === 7) {
        modules.processLabs(room);
        //console.log(Game.cpu.getUsed());
      }

      if (Game.time % 5 === 2) {
        modules.processSpawning(room);
        //console.log(Game.cpu.getUsed());
      }
      if (Game.time % 6 === 2) {
        utilities.setupTerminalTradingPlan(room);
      }

      if (room.terminal && room.terminal.store[RESOURCE_ENERGY] && room.terminal.store[RESOURCE_ENERGY] > 80000
        && room.storage && room.storage.store[RESOURCE_ENERGY] && room.storage.store[RESOURCE_ENERGY] > 400000) {
        // unload it!
        //console.log(room.name + ' has too much energy...');
        let destinationRooms = _.filter(Game.rooms, (r) => r.controller && r.controller.my && r.storage && r.terminal 
          && r.storage.store.energy && r.storage.store.energy < 400000 
          && _.sum(r.terminal.store) < 200000);
        if (destinationRooms.length > 0) {
          destinationRooms.sort((a,b) => (a.storage.store.energy ? a.storage.store.energy : 0) 
            - (b.storage.store.energy ? b.storage.store.energy : 0));
          //console.log(room.name + ' should send energy to ' + destinationRooms[0].name)
          Game.sendEnergy(room.name, destinationRooms[0].name);
        }
      }
    } else {
      //console.log(roomName + " isn't mine.");
    }
  }

  for (var i in GameState.constants) {
    if (GameState.memory[GameState.constants[i]]) {
      let json = JSON.stringify(GameState.memory[GameState.constants[i]]);
      //console.log('Memory segment ' + i + ': ' + (json.length / 1024).toFixed(1) + '/100 KB' )
      RawMemory.segments[GameState.constants[i]] = json;
    }
  }

  if (Game.time % 12 === 4) {
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
    })(); // collect_stats
  }
});}
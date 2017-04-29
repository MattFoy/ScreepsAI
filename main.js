/*

TODO:
* Better tower target prioritization:
  - shoot based on best damage...
  - fix healer bullshit

* Combat logic for campaigns
  start:
  - skirmish mode
  - sentry mode
  test:
  - breach mode
  - clear mode

* Power Bank code

* remote defender squads ( >1 )

* Finish chemist code
  -- load nukers

* Set up link miners 
  - reduce hauling required
  - modify builder body parts accordingly

* Auto-calc no. of necessary builders/repairers based on queue
  - need to determine builder work part effective time

* Make haulers prioritize (slightly) things that are closer to them
  * i.e. 5000 energy within 20 ticks is probably more valuable that 6000 90 away.

* Create base blueprinting solution 
  * design 'ideal' base.

* Add max energy threshold to market queries / filter, wait for RCL 6...

* mineral extractors should wait if the container is full, 
  * not mine it and drop it and also not try to go store it somewhere else...
  * can cause issues with fleeing logic though


*/

const profiler = require('screeps-profiler');

require('prototypes')();
const modules = require('modules');
const utilities = require('utilities');
const roles = require('roles');
const traveler = require('traveler');
const SCM = require('_SupplyChainManagement');

const resources = require('resources');

profiler.enable();

module.exports.loop = function () { profiler.wrap(function() {
  require('commandLineUtilities')();
  require('campaigns')();

  try { utilities.initGameState(); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
  
  try { utilities.pruneMemory(); } catch (err) { Game.notify(err.stack); console.log(err.stack); }

  console.log(' ============================== ' 
    + 'Tick# ' + Game.time 
    + ', CPU: ' 
    + Game.cpu.limit + ', ' 
    + Game.cpu.tickLimit + ', ' 
    + Game.cpu.bucket 
    + ' ============================== ');
  
  if (Memory.empire && Memory.empire.campaigns) {
    for (let campaignName in Memory.empire.campaigns) {
      try { Game.campaigns.process(campaignName); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
    }
  }

  try { modules.processCreeps(); } catch (err) { Game.notify(err.stack); console.log(err.stack); }

  if (Game.time % 25 === 1) {
    //console.log("Generating build queue");
    try { Memory.empire.buildQueues = {}; } catch (err) { Game.notify(err.stack); console.log(err.stack); }
  }

  for(let roomName in Game.rooms) {
    // skip every third tick when we're low on CPU...
    if (Game.cpu.bucket < 4000 && Game.time % 3 === 0) { break; }

    let room = Game.rooms[roomName];
    
    try { utilities.initializeRoomMemory(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
    
    if (Game.time % 25 === 1) {
      try { utilities.generateBuildQueue(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
    }

    // Process my rooms
    if (room.controller && room.controller.my) {
      try { utilities.initializeMyRoomMemory(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      
      if (!room.memory.miningFlagsInitialized) {
        try { utilities.setupMiningFlags(roomName); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }

      try { utilities.calculateHaulingEconomy(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      
      if (Game.time % 5 === 2) {
        try { utilities.calculateDefense(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }
      
      if (Game.time % 373 === 13 && Game.cpu.bucket > 9000) {
        try { utilities.generateUpgradeSweetSpots(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }

      try { modules.processTowers(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      try { modules.processLinks(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }

      if (Game.time % 10 === 7 && Game.cpu.bucket > 5000) {
        try { modules.processLabs(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
        //console.log(Game.cpu.getUsed());
      }

      if (Game.time % 7 === 2) {
        try { modules.processSpawning(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
        //console.log(Game.cpu.getUsed());
      }
      if (Game.time % 8 === 2 && Game.cpu.bucket > 2000) {
        try { utilities.setupTerminalTradingPlan(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }
    
      try {
        if (Game.cpu.bucket > 9000 
          && room.terminal && room.terminal.store[RESOURCE_ENERGY] && room.terminal.store[RESOURCE_ENERGY] > 80000
          && room.storage && room.storage.store[RESOURCE_ENERGY] && room.storage.store[RESOURCE_ENERGY] > 400000) {
          // unload it!
          //console.log(room.name + ' has too much energy...');
          let destinationRooms = _.filter(Game.rooms, (r) => r.controller && r.controller.my 
            && r.storage && r.terminal 
            && r.storage.store.energy && r.storage.store.energy < 400000 
            && _.sum(r.terminal.store) < 250000);
          if (destinationRooms.length > 0) {
            destinationRooms.sort((a,b) => (a.storage.store.energy ? a.storage.store.energy : 0) 
              - (b.storage.store.energy ? b.storage.store.energy : 0));
            //console.log(room.name + ' should send energy to ' + destinationRooms[0].name)
            Game.sendEnergy(room.name, destinationRooms[0].name);
          }
        }
      } catch (err) { Game.notify(err.stack); console.log(err.stack); }

      if (room.controller.level >= 8) {
        try { modules.processObserver(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }
    } else {
      //console.log(roomName + " isn't mine.");
    }
  }

  try {
    for (var i in GameState.constants) {
      if (GameState.memory[GameState.constants[i]]) {
        let json = JSON.stringify(GameState.memory[GameState.constants[i]]);
        //console.log('Memory segment ' + i + ': ' + (json.length / 1024).toFixed(1) + '/100 KB' )
        if ((json.length / 1024).toFixed(1) > 99) {
          json = '';
        }
        RawMemory.segments[GameState.constants[i]] = json;
      }
    }
  } catch (err) { Game.notify(err.stack); console.log(err.stack); }

  if (Game.time % 12 === 4 && Game.cpu.bucket > 1000) {
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

  if (!Memory.empire.helpRequired) { Memory.empire.helpRequired = 0; }
  //if (Game.time % 750 === 333) { Memory.empire.helpRequired++; }
  if (Memory.empire.helpRequired > 0) {
    Memory.empire.helpRequired -= 
      Game.spawnHelpFor('W88S36', 1, 'builder');
  }

  if (Game.time % 600 === 0) { 
    Game.pilferRoom('W82S38', 5);
  }

});}
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
  - RCL 7+ rooms should generate a list of highway rooms withing a path of 7 they can send troops to
    - (recursion on map.describeExits 7 times)
  - if those rooms havent been visible in >100 ticks, observer them
  - if power bank is spotted, register the location and powerbank id in Memory.empire.powerBankOps

  - create PowerBankBruiser, PowerBankHealer, and PowerBankHauler roles
    - no need to rally
    - PBH - very simple, go to power bank, heal nearby injured friendly creeps
    - PBB - very simple, go to power bank, attack it if there's at least 1 nearby PBH
    - PBH - spawn when PowerBank is dead or has less than X hp (calculate ticks to spawn + travel + 100?)
       - quota is power amount / carry capacity (~1250)

* remote defender squads ( >1 )
 - handle "escalations" (i.e. other players)

* Finish chemist code
  -- load nukers with energy
    - account for G being in a weird path (w.r.t. labs)

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

* cache room structures in memory for less .find() calls

*/

const profiler = require('screeps-profiler');

require('prototypes')();
const modules = require('modules');
const utilities = require('utilities');
const roles = require('roles');
const traveler = require('traveler');
const resources = require('resources');

profiler.enable();

module.exports.loop = function () {
  let deserializationTime = 0;
  (function() {
    let startTime = Game.cpu.getUsed();
    let y = Memory.rooms;
    deserializationTime = Game.cpu.getUsed() - startTime;
  }()); 

profiler.wrap(function() {
  require('commandLineUtilities')();
  require('campaigns')();

  try { utilities.initGameState(); } catch (err) { Game.notify(err.stack); console.log(err.stack); }  
  try { utilities.pruneMemory(); } catch (err) { Game.notify(err.stack); console.log(err.stack); }

  console.log(' ============================== ' 
    + 'Tick# ' + Game.time 
    + ', CPU bucket: ' + Game.cpu.bucket 
    + ', Deserialization Time: ' + deserializationTime.toFixed(5)
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

      if (Game.time % 10 === 7 && Game.cpu.bucket > 4000) {
        try { modules.processLabs(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }

      if (Game.time % 7 === 2) {
        try { modules.processSpawning(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }
      if (Game.time % 8 === 2 && Game.cpu.bucket > 2000) {
        try { utilities.setupTerminalTradingPlan(room); } catch (err) { Game.notify(err.stack); console.log(err.stack); }
      }

      try {
        if (Game.cpu.bucket > 9000 && Game.time % 10 === 5) {
          utilities.giveAwayEnergy(room);
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
      Memory.stats.cpu.deserializationTime = deserializationTime;

      // Note: This is fragile and will change if the Game.gcl API changes
      Memory.stats.gcl = Game.gcl;

      const memory_used = RawMemory.get().length;
      // console.log('Memory used: ' + memory_used);
      Memory.stats.memory = {
          used: memory_used,
          // Other memory stats here?
      };

      Memory.stats.mineralsAvailable = {};

      Memory.stats.roomSummary = resources.summarize_rooms();

      Memory.stats.market = {
          credits: Game.market.credits,
          num_orders: Game.market.orders ? Object.keys(Game.market.orders).length : 0,
      };
    })(); // collect_stats
  }

  if (!Memory.empire.helpRequired) { Memory.empire.helpRequired = 0; }
  if (Game.time % 700 === 333) { Memory.empire.helpRequired++; }
  if (Memory.empire.helpRequired > 0) {
    Memory.empire.helpRequired -= 
      Game.spawnHelpFor('W89S37', 1, 'builder');
  }

  if (Game.time % 600 === 0) { 
    Game.pilferRoom('W83S36', 6);
    //Game.pilferRoom('W82S38', 7);
  }

});}
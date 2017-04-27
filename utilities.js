const profiler = require('screeps-profiler');

function setupMiningFlags(roomName) {
  let room = Game.rooms[roomName];
  if (!room) { return; }
  if (room.memory.miningFlagsInitialized) { return; }
  if (!room.memory.roleReservables) { room.memory.roleReservables = {}; }  
  if (!room.memory.roleReservables['miner']) { room.memory.roleReservables['miner'] = []; }  
  if (room.memory.roleReservables['miner'].length <= room.find(FIND_SOURCES).length 
    && _.filter(Game.creeps, (c) => c.ticksToLive !== undefined).length > 0) {
    if (room.energyCapacityAvailable < 550) { return; }    
    var sources = room.find(FIND_SOURCES);
    for(var i = 0; i < sources.length; i++) {
      var src = sources[i];
      var target = src.pos.findClosestByPath(FIND_MY_SPAWNS, { ignoreCreeps: true });
      if (!target) { return; }
      if (target) {
        var pathToTarget = src.pos.findPathTo(target, { ignoreCreeps: true });      
        var flagPos = pathToTarget[0];
        var flagName = 'mining_' + roomName + '_' + src.id.slice(-4);
        var flagResult = room.createFlag(flagPos.x, flagPos.y, flagName);
        room.createConstructionSite(flagPos.x, flagPos.y, STRUCTURE_CONTAINER);
        Game.flags[flagName].memory.sourceId = src.id;
        Game.flags[flagName].memory.distanceToTarget = pathToTarget.length;        
        for (var j = pathToTarget.length - 8; j > 0; j--) {
          room.createConstructionSite(pathToTarget[j].x, pathToTarget[j].y, STRUCTURE_ROAD);
        }
        room.memory.roleReservables['miner'].push(flagName);
      }
    }
    room.memory.roleReservables['miner'] = _.uniq(room.memory.roleReservables['miner']);
    room.memory.miningFlagsInitialized = true;
  }
}
setupMiningFlags = profiler.registerFN(setupMiningFlags, 'setupMiningFlags');

function getVisualDirection(direction) {
  switch (direction) {
    case TOP_LEFT:
      return '\u2196';
    case TOP:
      return '\u2191';
    case TOP_RIGHT:
      return '\u2197';
    case LEFT:
      return '\u2190';
    case RIGHT:
      return '\u2192';
    case BOTTOM_LEFT:
      return '\u2199';
    case BOTTOM:
      return '\u2193';
    case BOTTOM_RIGHT:
      return '\u2198';
    case 0:
      return 'x';
    default:
      return '?';
  }
}
getVisualDirection = profiler.registerFN(getVisualDirection, 'getVisualDirection');

function pruneMemory() {
  // Erase the memory of dead creeps
  for(let name in Memory.creeps) {
    if(!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log('Clearing non-existing creep memory:', name);
    }
  }
  for (let name in Memory.flags) {
    if (!Game.flags[name]) {
      delete Memory.flags[name];
      console.log('Clearing non-existing flag memory:', name);
    }
  }

  for (let name in GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms) {
    if (!Game.rooms[name]) {
      delete GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[name];
    }
  }

  for (let id in Memory.empire.buildQueueAssignments) {
    let creep = Game.creeps[Memory.empire.buildQueueAssignments[id]];
    if (!creep) {
      // creep died, clear assignment
      delete Memory.empire.buildQueueAssignments[id];
    } else if (creep.memory) {
      if (creep.memory.buildOrRepair && creep.memory.buildOrRepair.id === id) {
        // still working
      } else {
        // creep is working on something new, clear assignment
        delete Memory.empire.buildQueueAssignments[id];
      }
    }
  }
}
pruneMemory = profiler.registerFN(pruneMemory, 'pruneMemory');

function initializeRoomMemory(room) {
  if (!room.memory.discoveredOn) { room.memory.discoveredOn = Game.time; }

  if (!GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices[room.name] 
    || !GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration[room.name]
    || GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration[room.name] <= Game.time) {
    let costs = new PathFinder.CostMatrix;

    let structures = room.find(FIND_STRUCTURES);
    if (structures.length > 0) {
      structures.forEach(function(structure) {
        if (structure.structureType === STRUCTURE_ROAD) {
          // Favor roads over plain tiles
          costs.set(structure.pos.x, structure.pos.y, 1);
        } else if (structure.structureType !== STRUCTURE_CONTAINER && 
          (structure.structureType !== STRUCTURE_RAMPART || !structure.my)) {
          // Can't walk through non-walkable buildings
          costs.set(structure.pos.x, structure.pos.y, 0xff);
        }
      });
    }
    
    let constructionSites = room.find(FIND_CONSTRUCTION_SITES);
    if (constructionSites.length > 0) {
      constructionSites.forEach(function(structure) {
        if (structure.structureType !== STRUCTURE_CONTAINER && 
          (structure.structureType !== STRUCTURE_RAMPART || !structure.my)
          && structure.structureType !== STRUCTURE_ROAD) {
          // Can't walk through non-walkable buildings
          costs.set(structure.pos.x, structure.pos.y, 0xff);
        }
      });
    }
    
    GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices[room.name] = costs.serialize();
    GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration[room.name] = Game.time + 100 + Math.floor(Math.random() * 10);
    //console.log("Cost Matrix calculated and cached for: " + room.name + ', will expire in ' + (GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration[room.name] - Game.time) + ' ticks');
  }
}
initializeRoomMemory = profiler.registerFN(initializeRoomMemory, 'initializeRoomMemory');

function calculateDefendersRequired(room, hostiles) {
  let bodyPriority = [TOUGH, MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL];

  if (hostiles.length > 0) {
    // put together a squad..
    let totalEnemyAttackPower = 0;
    let totalEnemyRangedPower = 0;
    let totalEnemyHealPower = 0;
    let totalEnemyHealth = 0;
    
    for (var i = 0; i < hostiles.length; i++) {
      totalEnemyAttackPower += hostiles[i].attackPower;
      totalEnemyRangedPower += hostiles[i].rangedPower;
      totalEnemyHealPower += hostiles[i].healPower;
      totalEnemyHealth += hostiles[i].toughness;
    }

    //console.log(totalEnemyHealth + ', ' + totalEnemyAttackPower + ', ' + totalEnemyRangedPower + ', ' + totalEnemyHealPower);

    let attackParts = totalEnemyAttackPower / ATTACK_POWER;
    let rangeParts = totalEnemyRangedPower / RANGED_ATTACK_POWER;
    let extraDmgRequired = Math.ceil(totalEnemyHealPower);

    //console.log("Parts Required: " + attackParts + '/' + rangeParts + '/' + extraDmgRequired + '/' + totalEnemyHealth);

    if (rangeParts > attackParts && extraDmgRequired > 0) {
      rangeParts += extraDmgRequired / RANGED_ATTACK_POWER;
    } else if (attackParts >= rangeParts && extraDmgRequired > 0) {
      attackParts += extraDmgRequired / ATTACK_POWER;
    }
    
    attackParts = Math.max(0, Math.ceil(attackParts));
    rangeParts = Math.max(0, Math.ceil(rangeParts));

    let damageDealtPerTick = Math.max(1, (rangeParts * RANGED_ATTACK_POWER) + (attackParts * ATTACK_POWER));
    let ticksToClear = Math.ceil(totalEnemyHealth / damageDealtPerTick)
    let damageReseivedPerTick = (totalEnemyAttackPower + totalEnemyRangedPower);

    let idealBody = [];
    if (attackParts > 0) {
        //console.log(attackParts)
        Array(attackParts).fill().forEach(() => idealBody.push(ATTACK) && idealBody.push(MOVE));
    }
    if (rangeParts > 0) {
        Array(rangeParts).fill().forEach(() => idealBody.push(RANGED_ATTACK) && idealBody.push(MOVE));
    }

    let healthRequired = ticksToClear * damageReseivedPerTick;

    // The enemy's total health minus our    
    let toughsRequired = Math.ceil(((healthRequired) - (idealBody.length * 100)) / 200);
    if (toughsRequired > 0) {
      Array(toughsRequired).fill().forEach(() => idealBody.push(TOUGH) && idealBody.push(MOVE))
    }

    idealBody.sort((a,b) => bodyPriority.indexOf(a) - bodyPriority.indexOf(b));
    // idealBody.unshift(TOUGH);
    // idealBody.push(MOVE);

    let bodyCost = _.reduce(idealBody, (memo,bodyPart) => memo + Number.parseInt(BODYPART_COST[bodyPart]), 0);
    //console.log('Cost: ' + bodyCost);

    let maxEnergy = room.energyCapacityAvailable;
    //maxEnergy = 550;

    let factor = Math.max(bodyCost / maxEnergy, idealBody.length / 50);

    //console.log('Factor: ' + factor)
    //console.log("Ideal body: " + JSON.stringify(idealBody));

    let squad = [];
    if (factor <= 1) {
      // All's well and we can spawn a single responder
      squad.push(idealBody);
    } else {
      // while (factor >= 1 && squad.length < 10) {
      //   let thisAttack = Math.floor(attackParts / factor);
      //   let thisRange = Math.floor(rangeParts / factor);
      //   let body = [];
      //   Array(thisAttack).fill().forEach(() => body.push(ATTACK));
      //   Array(thisRange).fill().forEach(() => body.push(RANGED_ATTACK));
      //   Array(body.length).fill().forEach(() => body.unshift(MOVE));
      //   squad.push(body);
      //   attackParts -= thisAttack;
      //   rangeParts -= thisRange;
      //   factor = (((attackParts * 130) + (rangeParts * 170)) / maxEnergy);
      // }
      return [];
    }

    return squad;
  }
}
calculateDefendersRequired = profiler.registerFN(calculateDefendersRequired, 'calculateDefendersRequired');

function calculateDefense(room) {
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

          let res = [];
          if (Game.cpu.bucket > 2000) {
            res = calculateDefendersRequired(room, hostiles);
          }
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
      if (!Memory.empire.observationRequests) { Memory.empire.observationRequests = []; }
      if (Memory.empire.observationRequests.indexOf(rName) === -1) {
        Memory.empire.observationRequests.push(rName);
      }
      console.log('Calculating defense --> <a href="#!/room/' + rName + '">' + rName + '</a> not visible');
    }
  });
}
calculateDefense = profiler.registerFN(calculateDefense, 'calculateDefense');

function initializeMyRoomMemory(room) {    
  if (!room.memory.responsibleForRooms) { room.memory.responsibleForRooms = []; }
  if (!room.memory.defend) { room.memory.defend = []; }
  if (!room.memory.hostileInfo) { room.memory.hostileInfo = {}; }
  
  if (!room.memory.hauling) { room.memory.hauling = {}; }

  if (room.memory.energySourceFlags_details) { delete room.memory.energySourceFlags_details; }

  if (!room.memory.tradingPlan) { room.memory.tradingPlan = {}; }

  if (!room.memory.roleReservables) { room.memory.roleReservables = {}; }

  if (!room.memory.roleReservables['scout']) {
    room.memory.roleReservables['scout'] = [];
  }
  if (!room.memory.roleReservables['miner']) {
    room.memory.roleReservables['miner'] = [];
  }
  if (!room.memory.roleReservables['roomReserver']) {
    room.memory.roleReservables['roomReserver'] = [];
  }
  if (!room.memory.roleReservables['mineralExtractor']) {
    room.memory.roleReservables['mineralExtractor'] = [];
  }
  if (!room.memory.roleReservables['skGuard']) {
    room.memory.roleReservables['skGuard'] = [];
  }
  if (!room.memory.roleReservables['medicSentry']) {
    room.memory.roleReservables['medicSentry'] = [];
  }
  if (!room.memory.roleReservables['skSentry']) {
    room.memory.roleReservables['skSentry'] = [];
  }

  if (!GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name]) {
   GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name] = {};
  }

  if (!GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].energyStorageTrends) {
   GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].energyStorageTrends = [];
  }
  
  if (!GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends) {
    GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends = {};
  }

  if (!GameState.memory[GameState.constants.MEMORY_CRITICAL].rooms[room.name]) {
    GameState.memory[GameState.constants.MEMORY_CRITICAL].rooms[room.name] = {};
  }
}
initializeMyRoomMemory = profiler.registerFN(initializeMyRoomMemory, 'initializeMyRoomMemory');

function getWallHealthThreshold(room) {
  if (room.controller && room.controller.my) {
    switch (room.controller.level) {
      case 8:
        return 1000000;
      case 7:
        return 400000;
      case 6:
        return 200000;
      default:
        return 20000;
    }
  } else {
    return 0;
  }
}

function generateBuildQueue(room) {
  if (!Memory.empire) {
    Memory.empire = {};
  }

  if (!Memory.empire.buildQueues) {
    Memory.empire.buildQueues = {};
  }

  // determine which room is responsible for the structures in this room
  let responsibleRoom;
  let responsibleRooms = _.filter(Game.rooms, (r) => r.memory.responsibleForRooms && r.memory.responsibleForRooms.indexOf(room.name) > -1);
  if (responsibleRooms.length > 0) {
    responsibleRoom = responsibleRooms[0].name;
  } else {
    if (room.controller && room.controller.my && room.controller.level && room.controller.level > 0) {
      responsibleRoom = room.name;
    } else {
      // Not a room we build for.
      return;
    }
  }

  if (!Memory.empire.buildQueues[responsibleRoom]) {
    Memory.empire.buildQueues[responsibleRoom] = [];
  }

  let priority = {
    'repair': { },
    'build': { }
  }

  priority['repair'][STRUCTURE_CONTAINER] = 95;
  priority['repair'][STRUCTURE_ROAD] = 90;
  priority['repair'][STRUCTURE_RAMPART] = 0;
  priority['repair'][STRUCTURE_WALL] = 0;

  priority['build'][STRUCTURE_TOWER] = 100;
  priority['build'][STRUCTURE_SPAWN] = 85;
  priority['build'][STRUCTURE_EXTENSION] = 75;
  priority['build'][STRUCTURE_CONTAINER] = 65;
  priority['build'][STRUCTURE_TERMINAL] = 57;
  priority['build'][STRUCTURE_EXTRACTOR] = 56;
  priority['build'][STRUCTURE_ROAD] = 55;
  priority['build'][STRUCTURE_LINK] = 54;

  // A method to retrieve the priority, if listed, or 0 otherwise
  function getPriority(type, structureType) {
    if (priority[type] && priority[type][structureType]) {
      return priority[type][structureType];
    } else {
      return (type === 'build') ? 1 : 0;
    }
  }

  // Add repairable structures
  let structures = room.find(FIND_STRUCTURES, { filter: function(s) {
    if ((s.structureType === STRUCTURE_ROAD || s.structureType === STRUCTURE_CONTAINER) 
      && s.hits < (s.hitsMax * 0.5)) {
      // a container or road in need of repair
      return true;
    } else if (room.controller && room.controller.my) {
      // in a room I own
      if ((s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) 
        && s.hits > 0 && s.hits < getWallHealthThreshold(room)) {
        //a wall or rampart beneath the threshold
        return true;
      } else if (s.structureType !== STRUCTURE_RAMPART && s.structureType !== STRUCTURE_WALL 
        && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTAINER
        && s.hits > 0 && s.hits < s.hitsMax) {
        // something else... that is damaged...
        console.log("Something is broken in " + room.name + ", id: " + s.id + ", type: " + s.structureType);
        return true;
      }
    }
  }});
  _.map(structures, (s) => Memory.empire.buildQueues[responsibleRoom].push({
    id: s.id,
    pos: s.pos,
    structureType: s.structureType,
    type: 'repair',
    amount: s.hits,
    amountTotal: (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) 
      ? getWallHealthThreshold(room)
      : s.hitsMax
  }));

  // Add building sites
  let constructionSites = _.filter(Game.constructionSites, (cs) => cs.pos.roomName === room.name);
  _.map(constructionSites, (s) => Memory.empire.buildQueues[responsibleRoom].push({
    id: s.id,
    pos: s.pos,
    structureType: s.structureType,
    type: 'build',
    amount: s.progress,
    amountTotal: s.progressTotal
  }));

  // Sort queue
  Memory.empire.buildQueues[responsibleRoom].sort((a,b) => 
    (a.structureType === b.structureType 
      && a.type === 'repair' && b.type === 'repair') 
    ? b.hits - a.hits
    : getPriority(b.type, b.structureType) - getPriority(a.type, a.structureType));
}
generateBuildQueue = profiler.registerFN(generateBuildQueue, 'generateBuildQueue');

function initGameState() {
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
  GameState.allies = ['NixNutz', 'SBense', 'Atanner', 'Timendainum', 'KamiKatze'];
  GameState.allies.push(GameState.username);
  GameState.cpuUsedToLoad = Game.cpu.getUsed();

  if (!Memory.empire) { Memory.empire = {}; }

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

  if (!GameState.signMessages) { GameState.signMessages = {}; }
  GameState.signMessages['roomReserver'] = 
    "Reserved by Foy, AYCE alliance. Come chat with us on #ayce-public.";
  GameState.signMessages['upgrader'] =
    "It's an All You Can Eat buffet!";
  GameState.signMessages['banksy'] =
    "Extended AYCE territory.";
}
initGameState = profiler.registerFN(initGameState, 'initGameState');

function generateUpgradeSweetSpots(room) {
  let sources = room.controller.pos.findInRange(FIND_STRUCTURES, 4, { filter: (s) =>
    (s.structureType === STRUCTURE_CONTAINER 
      && s.pos.findClosestByRange(FIND_SOURCES).pos.getRangeTo(s) > 1)
    || s.structureType === STRUCTURE_STORAGE 
    || s.structureType === STRUCTURE_LINK
  });

  if (sources.length > 0) {
    let idealPositions = [];
    room.memory.upgradeSweetSpots = undefined;

    let idealSources = _.filter(sources, (s) => s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK);
    if (idealSources.length > 0)  {
      if (!room.memory.sweetUpgrades) {
        room.memory.sweetUpgrades = idealSources[0].id;
      }
    }
    let minX = _.min(sources.concat(room.controller), function(s) { return s.pos.x }).pos.x - 1;
    let minY = _.min(sources.concat(room.controller), function(s) { return s.pos.y }).pos.y - 1;
    let maxX = _.max(sources.concat(room.controller), function(s) { return s.pos.x }).pos.x + 1;
    let maxY = _.max(sources.concat(room.controller), function(s) { return s.pos.y }).pos.y + 1;

    for(let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let pos = room.getPositionAt(x, y);
        if (pos.isPathable(true)
          && pos.getRangeTo(room.controller) <= 3 
          && pos.getRangeTo(pos.findClosestByRange(sources)) <= 1) {
          idealPositions.push({ x: x, y: y, roomName: room.name });
          room.visual.text('x', x, y);
        }
      }
    }
    room.memory.upgradeSweetSpots = JSON.stringify(idealPositions);
  }
}
generateUpgradeSweetSpots = profiler.registerFN(generateUpgradeSweetSpots, 'generateUpgradeSweetSpots');

function setupTerminalTradingPlan(room) {
  if (room.storage && room.terminal) {
    room.memory.tradingPlan = {};
    room.memory.tradingPlan.resourceQuantities = {};

    for (var resourceIdx in RESOURCES_ALL) {
      let resource = RESOURCES_ALL[resourceIdx];
      let qtyAvailable = (room.storage.store[resource] ? room.storage.store[resource] : 0)
        + (room.terminal.store[resource] ? room.terminal.store[resource] : 0);

      if (qtyAvailable > 100000) {
        // When we have more than 100k resources available, 
        // store everything over the first 50k in the terminal, 
        // up to a max of 100k
        room.memory.tradingPlan.resourceQuantities[resource] = Math.min(100000, qtyAvailable - 50000);
      } else if (qtyAvailable > 5000) {
        // if we have more than 5000, but less than 100000, then store 5k in the terminal
        room.memory.tradingPlan.resourceQuantities[resource] = 5000;
      } else {
        // store the "bits and pieces" in the terminal so we can get rid of leftover, for example
        room.memory.tradingPlan.resourceQuantities[resource] = qtyAvailable;
      }
    }
    room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY] = Math.max(Math.min(room.storage.store.energy - 50000, 50000), 5000);
    if (room.storage && room.storage.store[RESOURCE_ENERGY] + (room.terminal.store.energy ? room.terminal.store.energy : 0) > 500000) {
      room.memory.tradingPlan.resourceQuantities[RESOURCE_ENERGY] = 100000;
    }

    //console.log(room.name + ': ' + Game.cpu.getUsed());
    if (room.terminal && Game.time % 100 === 37) {
      // do market stuff
      // todo...
      //room.terminal.storeHistoricalPriceData();

      // when will I have the spare CPU to do this? lmao
    }
  }
}
setupTerminalTradingPlan = profiler.registerFN(setupTerminalTradingPlan, 'setupTerminalTradingPlan');

module.exports = {
  bodyCost: function(body) {
    return _.reduce(body, (memo,bodyPart) => memo + Number.parseInt(BODYPART_COST[bodyPart]), 0);
  },
  setupMiningFlags: setupMiningFlags,  
  calculateHaulingEconomy: require('utilities.calculateHaulingEconomy'),  
  getVisualDirection: getVisualDirection,
  pruneMemory: pruneMemory,
  initializeRoomMemory: initializeRoomMemory,
  initializeMyRoomMemory: initializeMyRoomMemory,
  calculateDefense: calculateDefense,
  calculateDefendersRequired: calculateDefendersRequired,
  generateBuildQueue: generateBuildQueue,
  initGameState: initGameState,
  generateUpgradeSweetSpots: generateUpgradeSweetSpots,
  setupTerminalTradingPlan: setupTerminalTradingPlan,
};
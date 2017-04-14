const profiler = require('screeps-profiler');

function setupMiningFlags(roomName) {
  let room = Game.rooms[roomName];
  if (!room) { return; }
  if (room.memory.miningFlagsInitialized) { return; }

  if (!room.memory.roleReservables) {
    room.memory.roleReservables = {};
  }
  
  if (!room.memory.roleReservables['miner']) {
    room.memory.roleReservables['miner'] = [];
  }
  
  if (room.memory.roleReservables['miner'].length <= room.find(FIND_SOURCES).length && _.filter(Game.creeps, (c) => c.ticksToLive !== undefined).length > 0) {
    if (room.energyCapacityAvailable < 450) { return; }
    
    var sources = room.find(FIND_SOURCES);
    for(var i = 0; i < sources.length; i++) {
      var src = sources[i];
      var target = src.pos.findClosestByPath(FIND_MY_SPAWNS, { ignoreCreeps: true });
      if (!target) {
        target = room.controller;
      }
      //console.log(spawn);
      if (target) {
        var pathToTarget = src.pos.findPathTo(target, { ignoreCreeps: true });      
        var flagPos = pathToTarget[0];
        var flagName = 'mining_' + roomName + '_' + src.id.slice(-4);
        var flagResult = room.createFlag(flagPos.x, flagPos.y, flagName)

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

    let attackParts = Math.ceil(totalEnemyAttackPower / ATTACK_POWER);
    let rangeParts = Math.ceil(totalEnemyRangedPower / RANGED_ATTACK_POWER);
    let extraDmgRequired = Math.ceil(totalEnemyHealPower);

    //console.log("Parts Required: " + attackParts + '/' + rangeParts + '/' + extraDmgRequired + '/' + totalEnemyHealth);

    if (rangeParts > attackParts && extraDmgRequired > 0) {
      rangeParts += extraDmgRequired / RANGED_ATTACK_POWER;
    } else if (attackParts >= rangeParts && extraDmgRequired > 0) {
      attackParts += extraDmgRequired / ATTACK_POWER;
    }

    let damageDealtPerTick = (rangeParts * RANGED_ATTACK_POWER) + (attackParts * ATTACK_POWER);
    let ticksToClear = Math.ceil(totalEnemyHealth / damageDealtPerTick);
    let damageReseivedPerTick = (totalEnemyAttackPower + totalEnemyRangedPower);

    let idealBody = [];
    Array(attackParts).fill().forEach(() => idealBody.push(ATTACK) && idealBody.push(MOVE));
    Array(rangeParts).fill().forEach(() => idealBody.push(RANGED_ATTACK) && idealBody.push(MOVE));

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

          let res = calculateDefendersRequired(room, hostiles);
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
calculateDefense = profiler.registerFN(calculateDefense, 'calculateDefense');

function initializeMyRoomMemory(room) {    
  if (!room.memory.responsibleForRooms) { room.memory.responsibleForRooms = []; }
  if (!room.memory.defend) { room.memory.defend = []; }
  if (!room.memory.hostileInfo) { room.memory.hostileInfo = {}; }

  if (!room.memory.energySourceFlags_details) { room.memory.energySourceFlags_details = {}; }

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

  calculateDefendersRequired: calculateDefendersRequired
};
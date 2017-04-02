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

  for (let name in Memory.rooms) {
    //console.log(name + ': ' + (JSON.stringify(Memory.rooms[name]).length / 1024).toFixed(1) + 'KB');
    if (Memory.rooms[name].flowFields) {
      for (let exitRoom in Memory.rooms[name].flowFields) {
        continue;
        if (Memory.rooms[name].flowFields[exitRoom].length === 50) {
          let xy = 0;
          while (xy < 2500) {
            let y = (xy % 50);
            let x = Math.floor(xy / 50);
            if (Memory.rooms[name].flowFields[exitRoom][x][y] === -1 || Memory.rooms[name].flowFields[exitRoom][x][y] === "_") {
              //Memory.rooms[name].flowFields = 0;
              Memory.rooms[name].flowFields[exitRoom][x][y] = 0;
            }

            xy++;
          }
        }

        if (Memory.rooms[name].flowFields[exitRoom].length > 50) {
          console.log(name + ':' + exitRoom + ', ' + 'array too large');
          
          let newArray = [];

          for (var i = 0; i < 50; i++) {
            let newRow = Memory.rooms[name].flowFields[exitRoom][i].slice(0,50);
            for (var j = 0; j < newRow.length; j++) {
              if (newRow[j] === "_" || newRow[j] === -1 || newRow[j] === undefined) {
                newRow[j] = 0;
              }
            }
            newArray.push(newRow);
          }
          console.log(JSON.stringify(Memory.rooms[name].flowFields[exitRoom]).length);
          console.log(JSON.stringify(newArray).length);
          Memory.rooms[name].flowFields[exitRoom] = newArray;
        }
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
    GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration[room.name] = Game.time + 1000 + Math.floor(Math.random() * 10);
    //console.log("Cost Matrix calculated and cached for: " + room.name + ', will expire in ' + (GameState.memory[GameState.constants.CARTOGRAPHY].costMatricesExpiration[room.name] - Game.time) + ' ticks');
  }
}
initializeRoomMemory = profiler.registerFN(initializeRoomMemory, 'initializeRoomMemory');

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
  calculateDefendersRequired: require('utilities.calculateDefendersRequired'),
  
  getVisualDirection: getVisualDirection,

  pruneMemory: pruneMemory,

  initializeRoomMemory: initializeRoomMemory,

  initializeMyRoomMemory: initializeMyRoomMemory
};
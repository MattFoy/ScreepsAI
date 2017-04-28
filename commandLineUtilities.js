const roles = require('roles');
module.exports = function() {




  Game.moveSquad = function(campaignName, direction) {
    _.map(_.filter(Game.creeps, (c) => c.memory.campaign === campaignName), (c) => c.move(direction));
  }




  Game.pilferRoom = function(roomName, maxSpawn) {
    if (!maxSpawn) { maxSpawn = 10; }
    let spawned = 0;

    function getClosestRoom(targetRoomName) {
      let closestRoom = undefined;
      let distanceToClosestRoom = 100;
      for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.my && room.storage && room.terminal) {
          let distanceToRoom = room.getDistanceTo(targetRoomName);
          if (distanceToRoom < distanceToClosestRoom) {
            distanceToClosestRoom = distanceToRoom;
            closestRoom = roomName;
          }
        }
      }
      return closestRoom;
    }

    let origin = Game.rooms[getClosestRoom(roomName)];
    console.log('Pilfering ' + roomName + ' from ' + origin.name);

    if (origin && origin.controller && origin.controller.my) {
      console.log("Spawning thieves for: " + origin.name);
      for (var name in Game.spawns) {
        let spawn = Game.spawns[name];
        if (!spawn.spawning && maxSpawn > 0) {
          if (spawn.room.getDistanceTo(roomName) <= 14) {
            let result = spawn.createCreep(
              Array(25).fill(CARRY).concat(Array(25).fill(MOVE))
              , undefined, { origin: origin.name, role: 'trucker', returnToOrigin: true, targetRoom: roomName });
            if (typeof result === 'string') { maxSpawn--; spawned++; }
            console.log(spawn.name + ': ' + result);
          }  
        }
      }
      console.log('Spawned ' + spawned + ' raiders.');
      return spawned;
    } else {
      console.log("Invalid room: " + roomName);
      return 0;
    }
  }




  Game.unclaimRoom = function(roomName) {
    let room = Game.rooms[roomName];
    if (!room || !room.controller || !room.controller.my) { 
      console.log("Cannot unclaim " + roomName);
      return; 
    } else {

    	// purge defense squad memory
      if (room.memory.defend && room.memory.defend.length > 0) {
        for (var i = 0; i < room.memory.defend.length; i++) {
          if (GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]]) {
            delete GameState.memory[GameState.constants.MEMORY_CRITICAL].defenseSquads[room.memory.defend[i]];
            console.log("Removing defense memory for " + room.memory.defend[i]);
          }
        }
      }

      // assign haulers to trucking away energy from the storage
      if (room.storage) {
      	let destinationRooms = _.filter(Game.rooms, (r) => r.controller && r.controller.my && r.storage
          && r.storage.store.energy && r.storage.store.energy < 400000 
          && Game.map.getRoomLinearDistance(roomName, r.name) < 4);
      	
      	if (destinationRooms.length > 0) {
      		destinationRooms.sort((a,b) => (a.storage.store.energy ? a.storage.store.energy : 0) 
            - (b.storage.store.energy ? b.storage.store.energy : 0));

	      	_.map(
	      		_.filter(Game.creeps, (c) => c.memory.origin === roomName && c.memory.role === 'smartHauler'), 
	      		function(c) {
	      			console.log('[' + c.memory.origin + '] ' + c.name 
	      				+ ' (' + c.memory.role + ') becomes a trucker for ' + destinationRooms[0].name + ' storage: ' + destinationRooms[0].storage.id);
	      			c.memory.role = 'trucker';
	      			c.memory.origin = destinationRooms[0].name;
	      			c.memory.targetStorageId = destinationRooms[0].storage.id;
	      		}
	    		);
	      }
      }

      // delete the room's memory
      //delete Memory.rooms[roomName];

      // suicide all the leftover creeps
      _.map(_.filter(Game.creeps, (c) => c.memory.origin === roomName), function(c) {
      	console.log('suicide: ' + c.name);
      	c.suicide();
      });

      // destroy the ramparts
      room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_RAMPART }).forEach(function(s) {
        s.destroy();
        console.log('destroy: ' + s.structureType + ', pos:' + JSON.stringify(s.pos));
      });

      //unclaim the controller
      room.controller.unclaim();
      console.log('unclaim controller, level: ' + room.controller.level);
    }
  }




  Game.sendEnergy = function(fromRoom, toRoom) {
    let rFromRoom = Game.rooms[fromRoom];
    if (!rFromRoom) { 
      console.log("Invalid fromRoom: " + fromRoom); 
      return;
    }
    let rToRoom = Game.rooms[toRoom];
    if (!rToRoom) {
      console.log("Invalid toRoom: " + fromRoom); 
      return;
    }

    let terminal = rFromRoom.terminal;
    if (!terminal) {
      console.log("No terminal in fromRoom: " + fromRoom); 
      return;
    }

    let terminal2 = rToRoom.terminal;
    if (!terminal2) {
      console.log("No terminal in toRoom: " + fromRoom); 
      return;
    }

    if (!terminal.store[RESOURCE_ENERGY] || terminal.store[RESOURCE_ENERGY] < 20000) {
      console.log("Not enough energy, " + terminal.store[RESOURCE_ENERGY] + ", in fromRoom: " + fromRoom);
      return;
    }

    if (_.sum(terminal2.store) > 280000) {
      console.log("Destination terminal almost full: " + _.sum(terminal2.store));
      return;
    }
    let transactionRatio = Game.market.calcTransactionCost(1, fromRoom, toRoom);
    // send about two thirds of the energy
    let amountToBurn = (terminal.store[RESOURCE_ENERGY] * 0.667);
    let costOfSend = 1 / (1 + transactionRatio);
    terminal.send(RESOURCE_ENERGY, amountToBurn * costOfSend, toRoom);
  }





  Game.spawnHelpFor = function(roomName, maxSpawn, roleName) {
    if (!maxSpawn) { maxSpawn = 3; }
    let spawned = 0;
    if (!roleName) { roleName = 'labourer'; }
    let origin = Game.rooms[roomName];
    if (origin && origin.controller && origin.controller.my) {
      console.log("Asking for help for room: " + origin.name);
      for (var name in Game.spawns) {
        let spawn = Game.spawns[name];
        if (!spawn.spawning && maxSpawn > 0) {
          if (spawn.room.getDistanceTo(roomName) <= 14) {
            let result = spawn.createCreep(
              Array(15).fill(WORK).concat(Array(15).fill(CARRY)).concat(Array(15).fill(MOVE))
              , undefined, { origin: origin.name, role: roleName, returnToOrigin: true });
            if (typeof result === 'string') { maxSpawn--; spawned++; }
            console.log(spawn.name + ': ' + result);
          }  
        }
      }
      console.log('Spawned ' + spawned + ' helpers.');
      return spawned;
    } else {
      console.log("Invalid room: " + roomName);
      return 0;
    }
  }





  Game.roomReport = function() {
    for (var roomName in Game.rooms) {
      let room = Game.rooms[roomName];
      if (room && room.controller && room.controller.my) {
        let maxContainerEnergy = _.max(room.memory.hauling.sourceDetails, 'energy');
        
        let roomStatusReport = 'ROOM: <a href="' + '#!/room/' + roomName + '">' + roomName + '</a>' 
          + ' Lvl.' + room.controller.level 
          + ' (' + (Math.round((room.controller.progress / room.controller.progressTotal) * 10000) / 100) + '%)'
          + ' (SpawnCap: ' + room.energyAvailable + '/' + room.energyCapacityAvailable + ')'
          + (room.storage ? ('Energy: <span style="color:yellow">\u26A1' + room.storage.store.energy + "</span>") : "")
          + ', EnergyContainerMax: <span style="color:' + (maxContainerEnergy.energy > 2000 ? '#ff3030' : 'green') 
          + '">' + maxContainerEnergy.energy + '</span>';

         console.log(roomStatusReport);
       }
    }
  }





  Game.spawnReport = function(onlyRoomName) {
    for (var roomName in Game.rooms) {
      if (onlyRoomName !== undefined && roomName !== onlyRoomName) {
        continue;
      }
      
      let room = Game.rooms[roomName];
      if (room && room.controller && room.controller.my) {  

        let creepsInRoom = _.filter(Game.creeps, (c) => c.memory.origin === room.name)
        let rolesInRoom = _.groupBy(creepsInRoom, function(c) { return c.memory.role });
        
        let roomStatusReport = 'ROOM: <a href="' + '#!/room/' + roomName + '">' + roomName + '</a>';

        var spawnQueue = [];

        let r = 1;
        for (let roleName in roles) {
          if (roles[roleName].spawnType === 'global') {
            if (roles[roleName].spawnCondition(room)) {
              spawnQueue.push(roles[roleName].determineSpawnParams(room));
            }
          } else if (roles[roleName].spawnType === 'quota') {
            let count = (rolesInRoom[roleName] ? 
              _.filter(rolesInRoom[roleName], (c) => !c.ticksToLive 
                || !c.memory.replaceBefore 
                || c.ticksToLive > c.memory.replaceBefore
              ).length 
              : 0);
            //console.log(roleName + ': ' + count);
            let quota = roles[roleName].getQuota(room, rolesInRoom);
            if (count < quota) {
              let body = roles[roleName].determineBodyParts(room);
              spawnQueue.push({ memory: {origin: room.name, role: roleName}, body: body });
            }
          } else if (roles[roleName].spawnType === 'reservation') {
            let reserve = room.getUnreservedReservable(roleName, roles[roleName].reservableFilter);
            if (reserve) {
              //console.log('Reserve: ' + reserve);
              let body = roles[roleName].determineBodyParts(room, reserve);
              spawnQueue.push({ memory: {origin: room.name, role: roleName, roleSpecificFlag: reserve}, body: body });
            }
          }

          let count = 0;
          let ticksToLive = '~';
          let style = "font-weight:bold;color:white";

          if (rolesInRoom[roleName]) {
            ticksToLive = _.min(rolesInRoom[roleName], 'ticksToLive').ticksToLive;
            if (!ticksToLive) { ticksToLive = ' * '; }
            count = rolesInRoom[roleName].length;
            style = "font-weight:bold;color:green";
          }

          if (_.filter(spawnQueue, (q) => q.memory.role === roleName).length > 0) {
            style = "font-weight:bold;color:orange";
          }

          roomStatusReport += roleName + '(<span style="' + style + '">' 
            + count + '</span> [<em>' + ticksToLive + '</em>]), ';
          if (r++ % 8 == 0) { roomStatusReport += '\n' }
        }
        spawnQueue.sort((a,b) => (roles[a.memory.role].determinePriority ? roles[a.memory.role].determinePriority(room, rolesInRoom) : 100)
                - (roles[b.memory.role].determinePriority ? roles[b.memory.role].determinePriority(room, rolesInRoom) : 100));
        
        console.log(roomStatusReport);
        console.log('Queue: ' + (spawnQueue.length > 0 ? _.reduce(_.map(spawnQueue, (q) => q.memory.role), (memo,role) => memo + ', ' + role) : '(empty)'));
        

        room.find(FIND_MY_SPAWNS, (s) => (s.pos.roomName === room.name)).forEach(function(spawn) {
          let line = spawn.name;
          if (spawn.spawning) {
            line += ' ---> Spawning a ' + Game.creeps[spawn.spawning.name].memory.role 
                + ' in ' + spawn.spawning.remainingTime + ' ticks.';
          } else {
            if (spawnQueue.length > 0) {
              line += ' ---> Spawning new ' + spawnQueue[0].memory.role + ' soon';
            } else {
              line += ' FREE!';
            }
          }
          console.log(line);
        });
      }
    }
  }





  Game.printBuildQueue = function(roomName) {
    if (!Memory.empire || !Memory.empire.buildQueues || !Memory.empire.buildQueues[roomName]) {
      console.log("Invalid room.");
      return;
    }

    for (var i = 0; i < Math.min(5, Memory.empire.buildQueues[roomName].length); i++) {
      let det = Memory.empire.buildQueues[roomName][i];
      console.log(i + ": " + det.type + ' ' + det.structureType + ' at ' + JSON.stringify(det.pos));
      console.log(' `--> (' + det.amount + ' / ' + det.amountTotal + ') Assigned: ' 
        + (Memory.empire.buildQueueAssignments[det.id] 
          ? Memory.empire.buildQueueAssignments[det.id] 
          : ' (none)'
        )
      );
    }
  }




  Game.towerHeatMap = function(roomName) {
    let room = Game.rooms[roomName];

    let towers = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    let minDamage = towers.length * (TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF));
    let maxDamage = towers.length * (TOWER_POWER_ATTACK);

    if (room) {
      for (var x = 1; x <= 48; x++) {
        for (var y = 1; y <= 48; y++) {
          let pos = room.getPositionAt(x,y);
          let towerDamage = pos.getTowerDamage();
          let damageRatio = (towerDamage - minDamage) / (maxDamage - minDamage).toFixed(2);
          room.visual.rect(x - 0.5, y - 0.5, 1, 1,
           { fill: ["hsl(",((1-damageRatio) * 120).toString(10),",100%,50%)"].join(""), opacity: 0.3 });
          let display = Math.round(towerDamage / 100);
          room.visual.text(display, x, y, { font: 0.5 });
        }
      }
    }
  }


}
const roles = require('roles');

module.exports = function() {
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
		if (!maxSpawn) { maxSpawn = 100; }
		if (!roleName) { roleName = 'labourer'; }

		let origin = Game.rooms[roomName];
		if (origin && origin.controller && origin.controller.my) {
			console.log("Asking for help for room: " + origin.name);
			for (var name in Game.spawns) {
				let spawn = Game.spawns[name];
				if (!spawn.spawning && maxSpawn > 0) {
					if (Game.map.getRoomLinearDistance(spawn.pos.roomName, roomName) <= 5) {
						let result = spawn.createCreep([WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY,WORK,MOVE,CARRY]
							, undefined, { origin: origin.name, role: roleName, returnToOrigin: true });
						if (typeof result === 'string') { maxSpawn--; }
						console.log(spawn.name + ': ' + result);
					}	
				}				
			}
		} else {
			console.log("Invalid room: " + roomName);
		}
	}

	Game.roomReport = function() {
		for (var roomName in Game.rooms) {
			let room = Game.rooms[roomName];
			if (room && room.controller && room.controller.my) {
				let maxContainerEnergy = _.max(room.memory.energySourceFlags_details, 'energy');
	      
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

	Game.spawnReport = function() {
		for (var roomName in Game.rooms) {
			let room = Game.rooms[roomName];
			if (room && room.controller && room.controller.my) {	

			  let creepsInRoom = _.filter(Game.creeps, (c) => c.memory.origin === room.name)
			  let rolesInRoom = _.groupBy(creepsInRoom, function(c) { return c.memory.role });
			  
			  let roomStatusReport = 'ROOM: <a href="' + '#!/room/' + roomName + '">' + roomName + '</a>';

			  var spawnQueue = [];

			  let r = 1;
			  roles.spawnPriority.forEach(function (roleName) {
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
			  });
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
}
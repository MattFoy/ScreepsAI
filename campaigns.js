require('prototypes')();
const squads = require('squads');

module.exports = function() {
	if (!Game.campaigns) { Game.campaigns = {}; }

	const startTime = Game.cpu.getUsed();

	Game.campaigns.new = function(targetRoomName, squadTemplate) {
		let campaign = {
			createdOn: Game.time,
			target: targetRoomName,
			squadTemplate: squadTemplate,
			launchBase: getClosestRoom(targetRoomName),
			status: 'forming',
			approach: null,
			baseToTargetRoute: [],
			siegePlan: {},
			squad: buildSquadList(squadTemplate)
		};

		campaign.isBoosted = _.reduce(campaign.squad, 
			(memo,s) => { return memo || s.boosts !== undefined}, false);

		let route = getBaseToTargetRoute(campaign.launchBase, targetRoomName);
		if (route.length > 1) {
			campaign.approach = route[route.length - 1].exit;
			campaign.baseToTargetRoute = route;
		} else {
			console.log('Error getting route for campaign to target.')
		}

		campaign.rallyPoint = getRallyPoint(campaign.launchBase, baseToTargetRoute[0].exit);

		const campaignName = saveCampaign(campaign);
    console.log('=== Created new campaign: ' + campaignName + ' ===');
    Game.campaigns.printStatus(campaignName);
    console.log('=== CPU used: ' + (Game.cpu.getUsed() - startTime) + ' ===');
	}


	Game.campaigns.process = function(campaignName) {
		let campaign = Memory.empire.campaigns[campaignName];
		if (campaign) {
			// FSM: Forming -> Rallying -> -> Travelling -> Running
			// [Forming] means the squad members are still being spawned. 
			// ----- Those that are spawned will make their way to the rally point.
			// [Rallying] means all squad members are spawned and they are just waiting to meet up
			// [Travelling] means the squad is together and en route to the target
			// ----- While in transit, healers will heal themselves and squad members
			// ----- Squad members will ignore anything en route and just make their way to the target
			// ----- Maybe they should take opportunistic shots at any near enemies?
			// [Running] means the squad is in the room before, or the room of, the target
			// ----- The squad controller will process all squad members
			if (campaign.status === 'forming') {
				if (_.filter(campaign.squad, (s) => s.name !== null).length === campaign.squad.length) {
					campaign.status = 'rallying'
				}
			} else if (campaign.status === 'rallying') {
				let squad = [];
		    campaign.squad.forEach((s) => {
		    	if (Game.creeps[s.name]) { squad.push(Game.creeps[s.name]); }
		    });

		    let squadRallied = true;
		    squad.forEach((s) => {
		    	if (s.pos.getRangeTo(campaign.rallyPoint) > 2) { squadRallied = false; }
		    });
		    if (squadRallied) { campaign.status = 'travelling'; }
			} else if (campaign.status === 'travelling') {
				// move the squad to the target room

			} else if (campaign.status === 'running') {
				let squad = [];
		    campaign.squad.forEach((s) => {
		    	if (Game.creeps[s.name]) { squad.push(Game.creeps[s.name]); }
		    });

		    // TODO: run the squad

		    if (squad.length === 0) { campaign.status = 'dead'; }
			} else if (campaign.status === 'dead') {
				// determine if we should revive / start again?

			}

		}
	}

	Game.campaigns.printStatus = function(campaignName) {
		let campaign = Memory.empire.campaigns[campaignName];
		if (campaign) {
			console.log('Campaign: ' + campaignName + ' (' + (Game.time - campaign.createdOn) + ' ticks old)')
			console.log(' `--> Base: ' + campaign.launchBase);
	    console.log(' `--> Approach: ' + findApproach(campaign.approach));
	    console.log(' `--> Boosted: ' + campaign.isBoosted);
	    console.log(' `--> Rally Point: ' + JSON.stringify(campaign.rallyPoint));
	    let squad = [];
	    campaign.squad.forEach((s) => {
	    	if (Game.creeps[s.name]) {
	    		squad.push(Game.creeps[s.name]);
	    	}
	    });
	    console.log(' `--> Squad Members: ' + squad.length + '/' + campaign.squad.length)
	    let oldestCreep = _.min(squad, 'ticksToLive');
	    console.log(' `--> Soonest TTL eath: ' + oldestCreep.ticksToLive);
		}
	}

	Game.getBreachPoint = getBreachPoint;

}


// ======== Helper functions below ============

function getBreachPoint(targetRoomName, entranceDir) {
	let targetRoom = Game.rooms[targetRoomName];
	if (targetRoom) {
		let target;
		if (targetRoom.storage) {
			target = targetRoom.storage;
		} else {
			let targets = targetRoom.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_SPAWN });
			if (targets.length > 0) {
				let target = targets[0];
			}
		}
		if (!target) {
			console.log("There's no heart to this room?");
			target = { pos: { x: 25, y: 25, roomName: targetRoomName } };
		}

		let pos;
		if (entranceDir = FIND_EXIT_BOTTOM) {
			pos = targetRoom.getPositionAt(25, 45);
		} else if (entranceDir = FIND_EXIT_TOP) {
			pos = targetRoom.getPositionAt(25, 5);
		} else if (entranceDir = FIND_EXIT_RIGHT) {
			pos = targetRoom.getPositionAt(45, 25);
		} else if (entranceDir = FIND_EXIT_LEFT) {
			pos = targetRoom.getPositionAt(45, 5);
		}
		let entrancePoint = pos.findClosestByRange(entranceDir);
		targetRoom.visual.text('e', pos.x, pos.y);
		targetRoom.visual.text('e', entrancePoint);

		let ret = PathFinder.search(
			entrancePoint, 
			target,
			{
	      roomCallback: function(roomName) {
	        let room = Game.rooms[roomName];
	        if (!room || room.name !== targetRoomName) return;
	        
	        let costs = new PathFinder.CostMatrix;

	        let structs = room.find(FIND_STRUCTURES);
	        let maxHp = _.max(structs, 'hits');

	        structs.forEach(function(struct) {
	          if (struct.structureType === STRUCTURE_ROAD) {
	            // Favor roads over plain tiles
	            costs.set(struct.pos.x, struct.pos.y, 1);
	          } else if (OBSTACLE_OBJECT_TYPES.indexOf(struct.structureType) > -1) {
	            // Can't walk through non-walkable buildings
	            let cost = 255;
	            if (struct.hits > 0) {
	            	cost = Math.round((struct.hits / maxHp) * 250);
	            } else {
	            	
	            }
	            costs.set(struct.pos.x, struct.pos.y, cost);
	          }
	        });
	        return costs;
	      }
	    }
	  );

	  if (ret.path && ret.path.length > 0) {
	  	for (var i = 0; i < ret.path.length; i++) {
	  		let x = ret.path[i].x;
	  		let y = ret.path[i].y;
	  		let pos = targetRoom.getPositionAt(x,y);
	  		let obstacles = pos.lookFor(LOOK_STRUCTURES);
	  		if (obstacles.length > 0) {
	  			let obstacle = false;
	  			let id;
	  			for (var j = 0; j < obstacles.length; j++) {
	  				if (OBSTACLE_OBJECT_TYPES.indexOf(obstacles[j].structureType) > -1) {
	  					obstacle = true;
	  					id = obstacles[j].id;
	  				}
	  			}
	  			if (obstacle) {
		  			targetRoom.visual.text('X', x, y);
		  			console.log('obstacle: ' + id);
		  		}
	  		}
	  	}
	  }

	}
}

function getRallyPoint(roomName, exitDir) {
	let base = Game.rooms[roomName];
	if (base && base.storage) {
		let ret = PathFinder.search(
			base.storage.pos, 
			base.find(exitDir),
			{
	      roomCallback: function(roomName) {
	        let room = Game.rooms[roomName];
	        if (!room || room.name !== base.name) return;
	        
	        let costs = new PathFinder.CostMatrix;

	        room.find(FIND_STRUCTURES).forEach(function(struct) {
	          if (struct.structureType === STRUCTURE_ROAD) {
	            // Favor roads over plain tiles
	            costs.set(struct.pos.x, struct.pos.y, 1);
	          } else if (struct.structureType !== STRUCTURE_CONTAINER &&
	                     (struct.structureType !== STRUCTURE_RAMPART ||
	                      !struct.my)) {
	            // Can't walk through non-walkable buildings
	            costs.set(struct.pos.x, struct.pos.y, 0xff);
	          }
	        });
	        return costs;
	      }
	    }
	  );
	  if (ret.path.length > 0) {
			let offset = Math.min(5, ret.path.length);
			let rallyPoint = ret.path[ret.path.length - offset];
			base.visual.text('X', rallyPoint.x, rallyPoint.y);	
			return rallyPoint;
		}
	}
}

function getClosestRoom(targetRoomName) {
	let closestRoom = undefined;
	let distanceToClosestRoom = 100;

	for (let roomName in Game.rooms) {
		let room = Game.rooms[roomName];
		if (room.controller && room.controller.my && room.controller.level >= 7) {
			console.log('considering ' + roomName + ' for a base');
			let distanceToRoom = room.getDistanceTo(targetRoomName);
			console.log(' it is ' + distanceToRoom + ' away');
			if (distanceToRoom < distanceToClosestRoom) {
				distanceToClosestRoom = distanceToRoom;
				closestRoom = roomName;
			}
		}
	}
	return closestRoom;
}

function saveCampaign(campaign) {
	let campaignName = campaign.target + '-' + (Game.time + '').slice(-2);
	// Save the Campaign in memory
	if (!Memory.empire.campaigns) {
		Memory.empire.campaigns = {};
	}
	if (!Memory.empire.campaigns[campaignName]) {
    Memory.empire.campaigns[campaignName] = campaign;
  }
  return campaignName;
}

function deleteCampaign(campaignName) {
	if (Memory.empire.campaigns[campaignName]) {
    delete Memory.empire.campaigns[campaignName];
  }
}

function buildSquadList(squadTemplate) {
	return _.map(squads.templates[squadTemplate], 
		(s) => { return { 
			name: null, 
			position: s.position, 
			boosts: s.boosts, 
			body: s.body 
		} 
	});
}

function getBaseToTargetRoute(origin, destination) {
	return Game.map.findRoute(origin, destination, {
    routeCallback: (roomName) => {
      let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
      let fMod = parsed[1] % 10;
      let sMod = parsed[2] % 10;
      let isSK = !(fMod === 5 && sMod === 5) &&
        ((fMod >= 4) && (fMod <= 6)) &&
        ((sMod >= 4) && (sMod <= 6));
      if (isSK) {
        return 10;
      } else {
        return 1;
      }
    }
  });
}

function findApproach(entranceRoomExitDirection) {
	// FIND_EXIT_TOP: 1,
	//  FIND_EXIT_RIGHT: 3,
	//  FIND_EXIT_BOTTOM: 5,
	//  FIND_EXIT_LEFT: 7,
	switch (entranceRoomExitDirection) {
		case FIND_EXIT_TOP:
			return 'bottom'
		case FIND_EXIT_RIGHT:
			return 'left'
		case FIND_EXIT_BOTTOM:
			return 'top'
		case FIND_EXIT_LEFT:
			return 'right'
		default:
			return 'error'
	}	
}
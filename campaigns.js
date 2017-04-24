require('prototypes')();
const squads = require('squads');
const profiler = require('screeps-profiler');

module.exports = function() {
  if (!Game.campaigns) { Game.campaigns = {}; }

  Game.launchCampaign = function(targetRoomName, squadTemplate) {
  	const startTime = Game.cpu.getUsed();

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

    campaign.rallyPoint = getRallyPoint(campaign.launchBase, campaign.baseToTargetRoute[0].exit);

    const campaignName = saveCampaign(campaign);
    console.log('=== Created new campaign: ' + campaignName + ' ===');
    Game.campaigns.printStatus(campaignName);
    console.log('=== CPU used: ' + (Game.cpu.getUsed() - startTime) + ' ===');
  }
  Game.launchCampaign = profiler.registerFN(Game.launchCampaign, 'Game.launchCampaign');


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
  Game.campaigns.process = function(campaignName) {
  	let startTime = Game.cpu.getUsed();
    let campaign = Memory.empire.campaigns[campaignName];
    if (campaign) {
    	// Checks to see which squad members are unspawned, spawning, alive, or dead
      updateSquadStatus(campaign);
      
      if (!campaign.attackPlan) {
      	// try and generate the attack plan
      	if (Game.rooms[campaign.target]) {
      		campaign.attackPlan = formulateAttackPlan(campaign.target, 
      			findEntranceDir(campaign.baseToTargetRoute[campaign.baseToTargetRoute.length - 1].exit));
      	} else {
      		// request observationcampaign.baseToTargetRoute[campaign.baseToTargetRoute.length - 1].exit
      		if (!Memory.empire.observationRequests) { Memory.empire.observationRequests = []; }
      		if (Memory.empire.observationRequests.indexOf(campaign.target) === -1) {
      			Memory.empire.observationRequests.push(campaign.target);
      		}
      	}
      } else if (campaign.attackPlan && !campaign.attackPlan.revised) {
      	// try and revise the attack plan, not on the same tick. :p
      	if (Game.rooms[campaign.target]) {
      		campaign.attackPlan = reviseAttackPlan(campaign);
      	} else {
      		// request observation
      		if (!Memory.empire.observationRequests) { Memory.empire.observationRequests = []; }
      		if (Memory.empire.observationRequests.indexOf(campaign.target) === -1) {
      			Memory.empire.observationRequests.push(campaign.target);
      		}
      	}      	
      } else if (campaign.attackPlan && campaign.attackPlan.revised
      	&& campaign.attackPlan.breachPath && campaign.attackPlan.breachPath.length > 0 
      	&& !campaign.attackPlan.entrancePoint) {

      	let x, y;
      	let roomName = campaign.baseToTargetRoute[campaign.baseToTargetRoute.length - 2].room;
      	switch (campaign.attackPlan.entrance) {
      		case FIND_EXIT_BOTTOM:
      			x = campaign.attackPlan.breachPath[0].x;
      			y = 47;
      			break;
      		case FIND_EXIT_TOP:
      			x = campaign.attackPlan.breachPath[0].x;
      			y = 2;
      			break;
      		case FIND_EXIT_LEFT:
      			x = 47;
      			y = campaign.attackPlan.breachPath[0].y;
      			break;
      		case FIND_EXIT_RIGHT:
      			x = 2;
      			y = campaign.attackPlan.breachPath[0].y;
      			break;
      		default:
      			x = 25;
      			y = 25;
      	}
      	campaign.attackPlan.entrancePoint = { x: x, y: y, roomName: roomName};
      }

      if (campaign.status === 'forming') {
        if (_.filter(campaign.squad, (s) => s.status === 'alive').length === campaign.squad.length) {
          console.log('Campaign (' + campaignName + ') is formed. Now rallying.');
          campaign.status = 'rallying';
          // no need for body array here anymore
          _.map(campaign.squad, (s) => delete s.body);
        }
      } else {
      	
	      let squadCreeps = getSquadCreeps(campaign);
	      
	      if (!campaign.captain || !Game.creeps[campaign.captain]) {
	        campaign.captain = chooseCaptain(squadCreeps);
	        console.log('Campaign (' + campaignName + '), captain chosen: ' + campaign.captain);
	      }
	      let captain = Game.creeps[campaign.captain];
	      if (captain) { 
	      	captain.room.visual.circle(captain.pos.x, captain.pos.y, 
	      		{fill: 'transparent', radius: 0.65, strokeWidth: 0.25, stroke: 'green'}); 
	      }

	    	if (campaign.status === 'rallying') {
	        let squadRallied = true;
	        squadCreeps.forEach(function(c) {
        		if (c.room.name !== campaign.rallyPoint.roomName 
        			|| c.pos.getRangeTo(campaign.rallyPoint) > 2) { 
        			squadRallied = false; 
        		}
        	});
	        if (squadRallied) { 
	        	console.log('Campaign (' + campaignName + ') is rallied. Now travelling.');
	        	campaign.status = 'travelling'; 
	        }
	      } else if (campaign.status === 'travelling') {
	        // move the squad to the target room
	        if (captain) {
	        	let waywardCreeps = [];
	        	squadCreeps.forEach(function(c) {
	        		if (c.pos.getRangeTo2(captain) > 4) {
	        			//c.moveTo(captain);
	        			waywardCreeps.push(c.name);
	        			console.log(c.name + " is wayward: " + JSON.stringify(c.pos));
	        		}
	        	});
	        	if (campaign.attackPlan && campaign.attackPlan.entrancePoint) {
		        	if (waywardCreeps.length === 0) {
		        		_.filter(squadCreeps, 
			        		(c) => c.name !== captain.name 
			        			&& waywardCreeps.indexOf(c.name) === -1
		      			).forEach(function(c) {
			        	  // move towards the target
			        	  c.travelTo(campaign.attackPlan.entrancePoint, { range: 2 });
			        	});

		        		captain.travelTo(campaign.attackPlan.entrancePoint, { range: 2 });
		        	} else {
		        		let captCreeps = _.filter(squadCreeps, (c) => c.room.name === captain.room.name);
		        		let avgX = Math.round(_.sum(captCreeps, 'pos.x') / captCreeps.length);
		        		let avgY = Math.round(_.sum(captCreeps, 'pos.y') / captCreeps.length);
		        		console.log(avgX + ',' + avgY);
		        		squadCreeps.forEach(function(c) {
		        			c.travelTo(captain.room.getPositionAt(avgX, avgY), { range: 2 });
		        		});
		        	}		        	

		        	let travelled = waywardCreeps.length === 0;
		        	squadCreeps.forEach(function(c) {
		        		if (c.pos.getRangeTo2(campaign.attackPlan.entrancePoint) > 3) {
		        			travelled = false;
		        		}
		        	});

		        	if (travelled) {
		        		console.log('Campaign (' + campaignName + ') is travelled. Now running.');
	        			campaign.status = 'running'; 
		        	}	
		        }
		        // TODO: add skirmish mode to travel execution

	        } else {
	        	console.log('Campaign (' + campaignName + ') no captain!!');
	        }
	      } else if (campaign.status === 'running') {
	        if (captain) {
	        	// TODO: run the squad
	        	let waywardCreeps = [];
	        	squadCreeps.forEach(function(c) {
	        		if (c.pos.getRangeTo2(captain) > 4) {
	        			//c.moveTo(captain);
	        			waywardCreeps.push(c.name);
	        			console.log(c.name + " is wayward: " + JSON.stringify(c.pos));
	        		}
	        	});

        		if (campaign.attackPlan 
        			&& campaign.attackPlan.breachPoints 
        			&& campaign.attackPlan.breachPoints.length > 0
        			&& campaign.attackPlan.breachPath
        			&& campaign.attackPlan.breachPath.length > 1) {
        			let targetRoom = Game.rooms[campaign.target];
        			if (targetRoom) {
        				targetRoom.visual.poly(_.map(campaign.attackPlan.breachPath, (pos) => [pos.x,pos.y]),
        					{stroke: '#f00', strokeWidth: .2, opacity: 0.3, lineStyle: 'solid'});
        				let firstBreachPoint = Game.getObjectById(campaign.attackPlan.breachPoints[0].id)
        				if (firstBreachPoint) {

        				}
        			}
        			//captain.memory.onBreachPath = false;
        			if (waywardCreeps.length === 0) {
	      				if (!captain.memory.onBreachPath) {
	      					let distance = captain.pos.getRangeTo2(campaign.attackPlan.breachPath[1]);
	      					//console.log(distance);
	      					if (distance === 0) {
	      						captain.memory.onBreachPath = campaign.attackPlan.breachPath
	      							//.slice(1, campaign.attackPlan.breachPath.length - 1);
	      					} else {
	      						let pos = campaign.attackPlan.breachPath[1];
	      						pos.roomName = campaign.target;
	      						captain.travelTo(pos, { range: 0 });	
	      					}
	      				} else {
	      					//let err = captain.moveByPath(captain.memory.onBreachPath);
	      					let onPath = false;
	      					let pathIdx = -1;
	      					for (var i = 0; i < captain.memory.onBreachPath.length; i++) {
	      						let pos = captain.memory.onBreachPath[i];
	      						if (captain.pos.x === pos.x && captain.pos.y === pos.y) {
	      							onPath = true;
	      							pathIdx = i;
	      						}
	      					}
	      					if (onPath) {
	      						if (captain.memory.onBreachPath.length > 0) {
		      						captain.move(captain.memory.onBreachPath[pathIdx].direction);
		      					}

		      					captain.memory.onBreachPath = captain.memory.onBreachPath.slice(
		      						pathIdx, captain.memory.onBreachPath.length - 1);
	      					} else {
	      						let pos = captain.memory.onBreachPath[0];
	      						pos.roomName = campaign.target;
	      						captain.travelTo(pos, { range: 0 });
	      					}
	      				}
	      			}
        		} else {
        			console.log('No AttackPlan for ' + campaignName + '?!?!');
        		}
	        	squadCreeps.forEach(function(c) {
	        		if (c.name !== captain.name) {
	        			c.moveTo(captain);
	        		}
	        	});

	        	if (_.max(squadCreeps, 'fatigue') > 0) {
	        		_.map(squadCreeps, (c) => c.cancelOrder('move'));
	        	}
	      	}
	        if (squadCreeps.length === 0) { campaign.status = 'dead'; }
	      } else if (campaign.status === 'dead') {
	        // determine if we should revive / start again?

	        deleteCampaign(campaignName);
	      }  
      } 
    }
    console.log("Processing campaign " + campaignName + ', CPU used: ' + (Game.cpu.getUsed() - startTime));
  }
  Game.campaigns.process = profiler.registerFN(Game.campaigns.process, 'Game.campaigns.process');

  Game.campaigns.printStatus = function(campaignName) {
    let campaign = Memory.empire.campaigns[campaignName];
    if (campaign) {
      console.log('Campaign: ' + campaignName + ' (' + (Game.time - campaign.createdOn) + ' ticks old)')
      console.log(' `--> Status: ' + campaign.status);
      console.log(' `--> Captain: ' + campaign.captain);
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
      console.log(' `--> Oldest (TTL): ' + oldestCreep.ticksToLive);
      console.log(' `--> Squad Status: ' + _.map(campaign.squad, 'status'));
    }
  }

  Game.attackPlan = attackPlan;
  Game.towerDisplay = getTowerDamageInRoom;

}


// ======== Helper functions below ============

function attackPlan(targetRoomName, entranceDir) {
	let attackPlan = formulateAttackPlan(targetRoomName, entranceDir);
	if (attackPlan) {
		attackPlan = reviseAttackPlan(attackPlan);
	}
	return attackPlan;
}

function formulateAttackPlan(targetRoomName, entranceDir, revisedEntrancePoint) {
	let startTime = Game.cpu.getUsed();
  let targetRoom = Game.rooms[targetRoomName];
  if (!targetRoom) { return; }

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
    let entrancePoint;
    if (revisedEntrancePoint) {
    	entrancePoint = revisedEntrancePoint;
    } else {
	    let pos;
	    console.log('entranceDir: ' + entranceDir)
	    if (entranceDir === FIND_EXIT_BOTTOM) {
	      pos = targetRoom.getPositionAt(25, 45);
	    } else if (entranceDir === FIND_EXIT_TOP) {
	      pos = targetRoom.getPositionAt(25, 5);
	    } else if (entranceDir === FIND_EXIT_RIGHT) {
	      pos = targetRoom.getPositionAt(45, 25);
	    } else if (entranceDir === FIND_EXIT_LEFT) {
	      pos = targetRoom.getPositionAt(5, 25);
	    }
	    entrancePoint = pos.findClosestByRange(entranceDir);
	  }
    //targetRoom.visual.text('e', pos.x, pos.y);
    
    console.log(JSON.stringify(entrancePoint));
    targetRoom.visual.text('E', entrancePoint);

    let ret = getBreachPath(entrancePoint, target);

    if (ret.path && ret.path.length > 0) {
    	let attackPlan = {
		  	createdOn: Game.time,
		  	target: targetRoomName,
		  	entrance: entranceDir,
		  	breachPoints: [],
		  	breachPath: []
		  };

    	let pathSegments = [[]];
    	let breachPoints = [];
    	let breachPath = [];
			
      for (var i = 0; i < ret.path.length; i++) {
        let x = ret.path[i].x;
        let y = ret.path[i].y;
        let pos = targetRoom.getPositionAt(x,y);

      	if (i < ret.path.length - 1) {
      		let nextPos = ret.path[i+1];
      		attackPlan.breachPath.push({
		      	x: x,
		      	y: y,
		      	dx: nextPos.x - x,
		      	dy: nextPos.y - y,
		      	direction: pos.getDirectionTo(nextPos)
		      });
      	}

        let obstacles = pos.lookFor(LOOK_STRUCTURES);
        let obstacle = false;
        let id;
        if (obstacles.length > 0) {  
          for (var j = 0; j < obstacles.length; j++) {
            if (OBSTACLE_OBJECT_TYPES.indexOf(obstacles[j].structureType) > -1 
            	|| (obstacles[j].structureType === STRUCTURE_RAMPART && !obstacles[j].my)) {
              obstacle = true;
              id = obstacles[j].id;
            }
          }
          if (obstacle) {
            breachPoints.push({id:id, pos:{x:x,y:y,roomName:targetRoom.name}});
            targetRoom.visual.text('X' + breachPoints.length, x, y);
            console.log('obstacle ' + breachPoints.length + ' : ' + id);
          }
        }
        if (!id) {
        	while(!pathSegments[breachPoints.length]) {
        		pathSegments.push(new Array());
        	}
					pathSegments[breachPoints.length].push([x,y]);
	      }
      }
      for(var i = 0; i < pathSegments.length; i++) {
	      targetRoom.visual.poly(pathSegments[i], {stroke: '#fff', strokeWidth: .2,
	    		opacity: 1.0, lineStyle: 'solid'});
	    }

	    attackPlan.breachPoints = breachPoints;
	    console.log('CPU Used: ' + (Game.cpu.getUsed() - startTime));
	    return attackPlan;
    }
  }  
}

function reviseAttackPlan(campaign) {
	let attackPlan = campaign.attackPlan;

	let targetRoomName = attackPlan.target;
	let entranceDir = findEntranceDir(campaign.baseToTargetRoute[campaign.baseToTargetRoute.length - 1].exit);

	if (attackPlan.breachPoints.length === 0) { return attackPlan; }
	
	let pos = Game.rooms[targetRoomName].getPositionAt(
		attackPlan.breachPoints[0].pos.x, 
		attackPlan.breachPoints[0].pos.y);

  let revisedEntrancePoint = pos.findClosestByPath(entranceDir);
	
	let revisedPlan = formulateAttackPlan(targetRoomName, entranceDir, revisedEntrancePoint);
	if (revisedPlan) {
		revisedPlan.revised = true;
		return revisedPlan;	
	} else {
		return attackPlan;
	}	
}

function getFirstBreachPoint(entrancePoint, target) {
	let ret = getBreachPath(entrancePoint, target);
  if (ret.path && ret.path.length > 0) {
  	for (var i = 0; i < ret.path.length; i++) {
      let x = ret.path[i].x;
      let y = ret.path[i].y;
      let pos = target.room.getPositionAt(x,y);
      let obstacles = pos.lookFor(LOOK_STRUCTURES);
      if (obstacles.length > 0) {  
        for (var j = 0; j < obstacles.length; j++) {
          if (OBSTACLE_OBJECT_TYPES.indexOf(obstacles[j].structureType) > -1 
          	|| (obstacles[j].structureType === STRUCTURE_RAMPART && !obstacles[j].my)) {
            return revisedEntrancePoint = obstacles[j].pos;
          }
        }
      }
    }
  }
}

function getBreachPath(entrancePoint, target) {
	return PathFinder.search(
    entrancePoint, 
    target,
    {
    	plainCost: 1,
    	swampCost: 10,
      roomCallback: function(roomName) {
        let room = Game.rooms[roomName];
        if (!room) { return; }
				// reset the room visuals, stuff's about to get craaazy
        room.visual.clear();
        
        let costs = new PathFinder.CostMatrix;

        let structs = room.find(FIND_STRUCTURES);
        let maxHp = _.max(structs, 'hits').hits;
        let walls = _.filter(structs, (s) => s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL);
        let minHp = _.min(walls, 'hits').hits;

        structs.forEach(function(struct) {
          if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
          } else if (OBSTACLE_OBJECT_TYPES.indexOf(struct.structureType) > -1
          	|| (struct.structureType === STRUCTURE_RAMPART && !struct.my)) {
            // Can't walk through non-walkable buildings
            let cost = 255;
            if (struct.hits > 0) {
              cost = Math.min(200, 10 + Math.round((struct.hits / maxHp) * 140));
            } else {
              
            }
            costs.set(struct.pos.x, struct.pos.y, cost);
          }
        });

        walls.forEach(function(struct) {
        	let healthRatio = ((struct.hits - minHp) / (maxHp - minHp));
          room.visual.rect(struct.pos.x - 0.4, struct.pos.y - 0.4, 0.8, 0.8,
					 { fill: getColor(healthRatio), opacity: 0.5 });
        });
        
				let towers = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
				let minDamage = towers.length * (TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF));
				let maxDamage = towers.length * (TOWER_POWER_ATTACK);
				for (var x = 0; x <= 49; x++) {
					for (var y = 0; y <= 49; y++) {
						let pos = room.getPositionAt(x,y);
						let terrain = Game.map.getTerrainAt(x, y, roomName);
						
						if (terrain !== 'wall') {
							let towerDamage = pos.getTowerDamage();
							let damageRatio = (towerDamage - minDamage) / (maxDamage - minDamage).toFixed(2);							
							let currentCost = costs.get(x,y) || 0;

							let newCost = Math.min(200, currentCost + Math.round(damageRatio * 20));
							//console.log(currentCost + ' -> ' + newCost);
							if (newCost > 0) {
								costs.set(x, y, newCost);	
							}

							if (_.filter(pos.lookFor(LOOK_STRUCTURES), 
									(s) => s.structureType === STRUCTURE_WALL 
										|| s.structureType === STRUCTURE_RAMPART
									).length === 0) {
								room.visual.rect(x - 0.5, y - 0.5, 1, 1,
							 		{ fill: getColor(damageRatio), opacity: 0.3 });
							}

							if (terrain === 'swamp') {
								let currentCost = costs.get(x,y) || 0;
								costs.set(x, y, currentCost + 20);
							}
						} else {
							costs.set(x, y, 0xff);
						}
						if ((x === 0 || x === 49) || (y === 0 || y === 49)) {
							costs.set(x, y, 0xff);	
						}
					}
				}

				// room.visual.clear();
				// for (var x = 0; x <= 49; x++) {
				// 	for (var y = 0; y <= 49; y++) {
				// 		let cost = costs.get(x,y) || 0;
				// 		console.log(x + ',' + y + ': ' + cost);
				// 		room.visual.rect(x - 0.5, y - 0.5, 1, 1,
				// 	 		{ fill: getColor(cost / 255), opacity: 0.3 });
				// 		room.visual.text(cost, x, y, { font: 0.4 });
				// 	}
				// }

        return costs;
      },
      maxOps: 20000000,
      maxRooms: 1
    }
  );
}

function chooseCaptain(squadCreeps) {
  // TODO: Choose the youngest (highest TTL) captain
  // or the toughest... or the most static, etc.
  if (squadCreeps.length > 0) {
  	let partsByPriority = [WORK,ATTACK,RANGED_ATTACK,HEAL];
  	for (var i = 0; i < partsByPriority.length; i++) {
  		let creeps = _.filter(squadCreeps, 
	  		(c) => _.filter(c.body, 
	  			(bp) => bp.type === partsByPriority[i]).length > 0);
	  	if (creeps.length > 0) {
	  		return creeps[0].name;
	  	}
  	}
  }

  return undefined;
}

function getSquadCreeps(campaign) {
  let squad = _.map(
    _.filter(campaign.squad, (s) => s.status === 'alive'),
    (s) => Game.creeps[s.name]
  );

  return squad;
}

function updateSquadStatus(campaign) {
  _.map(campaign.squad, (s) => {
    if (s.name === null) {
      s.status = 'unspawned';
    } else if (!Game.creeps[s.name]) {
      s.status = 'dead';
      s.name = '_dead_';
    } else if (Game.creeps[s.name].ticksToLive === undefined) {
      s.status = 'spawning';
    } else {
      s.status = 'alive';
    }
  });
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

  let controllerThreshold = 7;
  if (_.filter(Game.rooms, (r) => r.controller && r.controller.my 
  	&& r.controller.level >= controllerThreshold).length <= 0) {
  	controllerThreshold = 1;
  }

  for (let roomName in Game.rooms) {
    let room = Game.rooms[roomName];
    if (room.controller && room.controller.my && room.controller.level >= controllerThreshold) {
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

function findEntranceDir(entranceRoomExitDirection) {
  // FIND_EXIT_TOP: 1,
  //  FIND_EXIT_RIGHT: 3,
  //  FIND_EXIT_BOTTOM: 5,
  //  FIND_EXIT_LEFT: 7,
  switch (entranceRoomExitDirection) {
    case FIND_EXIT_TOP:
      return FIND_EXIT_BOTTOM;
    case FIND_EXIT_RIGHT:
      return FIND_EXIT_LEFT
    case FIND_EXIT_BOTTOM:
      return FIND_EXIT_TOP
    case FIND_EXIT_LEFT:
      return FIND_EXIT_RIGHT;
    default:
      return 'error'
  }  
}

function getTowerDamageInRoom(roomName) {
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
				 { fill: getColor(damageRatio), opacity: 0.3 });
				let display = Math.round(towerDamage / 100);
				room.visual.text(display, x, y, { font: 0.5 });
			}
		}
	}
}

function getColor(value, factor, offset){
	if (!factor) { factor = 120; }
	if (!offset) { offset = 0; }
  //value from 0 to 1
  var hue=((1-value) * factor + offset).toString(10);
  return ["hsl(",hue,",100%,50%)"].join("");
}
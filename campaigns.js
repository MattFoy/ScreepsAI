require('prototypes')();
const squads = require('squads');
const profiler = require('screeps-profiler');

const sayings = {
	'guard': String.fromCodePoint(9876),
	'ranger': String.fromCodePoint(9889),
	'medic': String.fromCodePoint(10084),
	'dismantler': String.fromCodePoint(9935),
}

module.exports = function() {
  if (!Game.campaigns) { Game.campaigns = {}; }

  Game.launchCampaign = function(targetRoomName, squadTemplate) {
  	return newCampaign(targetRoomName, squadTemplate);
  }
  Game.launchCampaign = profiler.registerFN(Game.launchCampaign, 'Game.launchCampaign');

  Game.killCampaign = function(campaignName) {
  	_.map(
  		_.filter(Game.creeps, 
  			(c) => c.memory.role === 'squaddie' 
  				&& c.memory.campaign === campaignName),
  		(c) => c.suicide()
		);
  	deleteCampaign(campaignName);
  }

  Game.campaigns.process = function(campaignName) {
  	let startTime = Game.cpu.getUsed();
    let campaign = Memory.empire.campaigns[campaignName];
    if (campaign) {
    	// Checks to see which squad members are unspawned, spawning, alive, or dead
      campaignPreprocessor(campaign);

      if (campaign.status === 'forming') {
      	processCampaign_forming(campaign);
      } else {      	
	      let o = getSquadAndCaptain(campaign);
	      let squadCreeps = o.squadCreeps;
	      let captain = o.captain;
	      if (squadCreeps.length === 0) { 
			  	campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Squad is dead.";
			  	campaign.status = 'dead'; 
			  }

	    	if (campaign.status === 'rallying') {
	        processCampaign_rallying(campaign, squadCreeps);
	      } else if (campaign.status === 'travelling') {
	        // move the squad to the target room
	        if (captain) {
	        	processCampaign_travelling(campaign, squadCreeps, captain);
	        	// TODO: add skirmish mode to travel execution
	        }
	      } else if (campaign.status === 'running') {
	        if (captain) {
	        	processCampaign_running(campaign, squadCreeps, captain);
	      	}
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
}






// ======== Helper functions below ============

function attackPlan(targetRoomName, entranceDir) {
	let attackPlan = formulateAttackPlan(targetRoomName, entranceDir);
	if (attackPlan) {
		attackPlan = reviseAttackPlan(attackPlan);
	}
	return attackPlan;
}





function campaignPreprocessor(campaign) {
	updateSquadStatus(campaign);
	let startTime = Game.cpu.getUsed();
  if (!campaign.attackPlan) {
  	// try and generate the attack plan
  	if (Game.rooms[campaign.target]) {
  		campaign.attackPlan = formulateAttackPlan(campaign.target, 
  			findEntranceDir(campaign.baseToTargetRoute[campaign.baseToTargetRoute.length - 1].exit));
  		if (campaign.attackPlan) {
  			let cpuUsed = Game.cpu.getUsed();
  			campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Attack Plan formed. CPU Used: " + cpuUsed;
  		}      		
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
  		if (campaign.attackPlan && campaign.attackPlan.revised) {
  			let cpuUsed = Game.cpu.getUsed();
  			campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Attack Plan revised. CPU Used: " + cpuUsed;
  		}
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
  	campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Entrance Point found: " + JSON.stringify(campaign.attackPlan.entrancePoint);
  }
}





function processCampaign_rallying(campaign, squadCreeps) {
	let squadRallied = true;
  squadCreeps.forEach(function(c) {
  	rallyCreep(c);
		if (c.room.name !== campaign.rallyPoint.roomName 
			|| c.pos.getRangeTo2(campaign.rallyPoint) > 3) { 
			squadRallied = false; 
		}
	});
  if (squadRallied) { 
  	campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Squad is rallied. Now travelling.";
  	campaign.log += "\n `--> Captain Pos: " + JSON.stringify(Game.creeps[campaign.captain].pos);
  	campaign.status = 'travelling'; 
  }
}





function processCampaign_running(campaign, squadCreeps, captain) {
	let waywardCreeps = [];
	squadCreeps.forEach(function(c) {
		if (c.pos.getRangeTo2(captain) > 6) {
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
		runBreachMode(campaign, squadCreeps, captain, waywardCreeps);
	} else if (campaign.attackPlan 
		&& (!campaign.attackPlan.breachPoints 
			|| campaign.attackPlan.breachPoints.length === 0)) {
		runClearMode(campaign, squadCreeps, captain, waywardCreeps);
	} else {
		console.log('No AttackPlan for ' + campaignName + '?!?!');
	}
	squadCreeps.forEach(function(c) {
		if (c.name !== captain.name && !c.memory.task) {
			c.moveTo(captain);
		}
	});

	if (_.max(squadCreeps, 'fatigue').fatigue > 0) {
		//console.log("Cancelling move.");
		//_.map(squadCreeps, (c) => c.cancelOrder('move'));
	}
}





function processCampaign_travelling(campaign, squadCreeps, captain) {
	let waywardCreeps = [];
	squadCreeps.forEach(function(c) {
		if (c.pos.getRangeTo2(captain) > squadCreeps.length + 1) {
			//c.moveTo(captain);
			waywardCreeps.push(c.name);
			console.log(c.name + " is wayward: " + JSON.stringify(c.pos));
		}
	});
	if (campaign.attackPlan && campaign.attackPlan.entrancePoint) {
  	if (waywardCreeps.length === 0) {
  		_.filter(squadCreeps, 
    		(c) => waywardCreeps.indexOf(c.name) === -1
			).forEach(function(c) {
    	  // move towards the target
    	  c.travelTo(campaign.attackPlan.entrancePoint, 
    	  	{ range: 2, ignoreCreeps: true, allowHostile: true, forbidEdges: true });
    	});
  	} else {
  		let captCreeps = _.filter(squadCreeps, (c) => c.room.name === captain.room.name);
  		let avgX = Math.round(_.sum(captCreeps, 'pos.x') / captCreeps.length);
  		let avgY = Math.round(_.sum(captCreeps, 'pos.y') / captCreeps.length);
  		console.log(avgX + ',' + avgY);
  		squadCreeps.forEach(function(c) {
  			if (c.name !== captain.name 
  				&& c.pos.getRangeTo2(captain) > 4) {
  				c.travelTo(captain, { range: 4 });
  			}
  		});
  		captain.travelTo(captain.room.getPositionAt(avgX, avgY), { range: 2 });
  	}		        	

  	let travelled = waywardCreeps.length === 0;
  	squadCreeps.forEach(function(c) {
  		if (c.pos.getRangeTo2(campaign.attackPlan.entrancePoint) > 5) {
  			travelled = false;
  		}
  	});

  	if (travelled) {
  		campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Squad is travelled. Now running.";
			campaign.status = 'running'; 
  	}	
  }
}





function processCampaign_forming(campaign) {
	let aliveCreeps = _.filter(campaign.squad, (s) => s.status === 'alive' && Game.creeps[s.name]);
	aliveCreeps.forEach(function(c) {
		rallyCreep(Game.creeps[c.name]);
	});

  if (aliveCreeps.length === campaign.squad.length) {
    campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Squad is formed. Now rallying.";
    campaign.log += "\n`--> Rally Point: " + JSON.stringify(campaign.rallyPoint);
    campaign.status = 'rallying';
    // no need for body array here anymore
    _.map(campaign.squad, (s) => delete s.body);
  }
}





function rallyCreep(creep) {
	//console.log('[' + creep.name + '] rally');
	if (creep.memory.boosts 
		&& creep.memory.boosts.length > 0 
		&& !creep.memory.isBoosted) {
		//console.log('[' + creep.name + '] boost');
	  let isBoosted = true;
	  for (var i = 0; i < creep.memory.boosts.length; i++) {
	    let bodyType = creep.memory.boosts[i];
	    if (!creep.isBoosted(bodyType)) {
	      //console.log('Boosting...' + bodyType);
	      if (Game.rooms[creep.memory.origin].memory.science 
	        && Game.rooms[creep.memory.origin].memory.science.boosts
	        && Game.rooms[creep.memory.origin].memory.science.boosts[bodyType]) {

	        let lab = Game.getObjectById(Game.rooms[creep.memory.origin].memory.science.boosts[bodyType]);
	        if (lab) {
	          if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
	            creep.travelTo(lab);
	          }
	        }
	      }
	      isBoosted = false;
	      break;
	    } else {
	      continue;
	    }
	  }
	  creep.memory.isBoosted = isBoosted;
	} else {
		//console.log('[' + creep.name + '] move?');
		let campaign = Memory.empire.campaigns[creep.memory.campaign];
		if (creep.room.name !== campaign.rallyPoint.roomName 
			|| creep.pos.getRangeTo2(campaign.rallyPoint) > 2) { 
			//console.log('[' + creep.name + '] move!');
			//console.log(JSON.stringify(campaign.rallyPoint));
			creep.travelTo(campaign.rallyPoint, { range: 1, allowHostile: true });
		}
	}
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
      let structs = targetRoom.find(FIND_STRUCTURES, { filter: (s) => s.hits > 0 });
      
      let targets = _.filter(structs, (s) => s.structureType === STRUCTURE_SPAWN);
      if (targets.length > 0) {
        target = targets[0];
      }
      if (!target) {
      	targets = _.filter(structs, (s) => s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER)
      	if (targets.length > 0) {
		      target = targets[0];
		    }
      }
      if (!target) {	
      	targets = _.filter(structs, (s) => s.structureType !== STRUCTURE_RAMPART || s.structureType !== STRUCTURE_WALL)
      	if (targets.length > 0) {
	        target = targets[0];
	      }
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
	    //console.log('entranceDir: ' + entranceDir)
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
    
    //console.log(JSON.stringify(entrancePoint));
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
			
      for (var i = 0; i < ret.path.length - 1; i++) {
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

	if (attackPlan.breachPoints.length === 0) { 
		attackPlan.revised = true;
		return attackPlan; 
	}
	
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





function processSquadCreeps(campaign, squadCreeps, captain, waywardCreeps, target) {
	let groupedCreeps = _.groupBy(squadCreeps, 'memory.type');
	
	// process dismantlers first
	let type = 'dismantler';
	if (groupedCreeps[type] && groupedCreeps[type].length > 0) {
		for (var i = 0; i < groupedCreeps[type].length; i++) {
			let c = groupedCreeps[type][i];
			let task = {
				time: Game.time
			};
			if (c.name !== captain.name && c.pos.getRangeTo2(captain) > 3) {
				task.moveTo = captain.pos;
				task.moveRange = 3;
			} else if (c.pos.getRangeTo2(target) > 1) {
				task.moveTo = target.pos;
				//console.log(c.name + ':' + c.pos.getRangeTo2(target))
			}

			if (c.pos.getRangeTo2(target) <= 1) {
				task.action = 'dismantle';
				task.target = target.id;
			} else {
				let targets = c.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => s.hits > 0 });
				if (targets.length > 0) {
					targets.sort((a,b) => a.hits - b.hits);
					task.target = targets[0].id;
					task.action = 'dismantle';
				}
			}

			c.memory.task = task;
		}
	}

	type = 'medic';
	if (groupedCreeps[type] && groupedCreeps[type].length > 0) {
		let woundedSquadMembers = _.filter(squadCreeps, (c) => c.hitsMax > c.hits)
		woundedSquadMembers.sort((a,b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));

		for (var i = 0; i < groupedCreeps[type].length; i++) {
			let c = groupedCreeps[type][i];
			let task = {
				time: Game.time
			};

			if (woundedSquadMembers.length > 0) {
				task.moveTo = woundedSquadMembers[0].pos;

				if (c.pos.getRangeTo2(woundedSquadMembers[0]) <= 1) {
					task.action = 'heal';
					task.target = woundedSquadMembers[0].id;
				} else if (c.pos.getRangeTo2(woundedSquadMembers[0]) <= 3) {
					task.action = 'rangedHeal';
					task.target = woundedSquadMembers[0].id;
				} else {
					let targets = _.filter(woundedSquadMembers, (w) => c.pos.getRangeTo2(w) <= 1);
					if (targets.length > 0) {
						task.action = 'heal';
						task.target = targets[0].id;
					} else {
						targets = _.filter(woundedSquadMembers, (w) => c.pos.getRangeTo2(w) <= 3);
						if (targets.length > 0) {
							task.action = 'rangedHeal';
							task.target = targets[0].id;
						}
					}
				}
			} else if (c.name !== captain.name) {
				task.moveTo = captain.pos;
			}

			c.memory.task = task;
		}
	}

	type = 'guard';
	if (groupedCreeps[type] && groupedCreeps[type].length > 0) {
		let nearbyEnemies = captain.pos.findInRange(FIND_HOSTILE_CREEPS, 7, 
			{ filter: (c) => {
					if (GameState.allies.indexOf(c.owner.username) >= 0) {
						return false;
					} else {
						if (captain.pos.findClosestByPath(c)) {
							return true;
						} else {
							return false;
						}
					}
				}
			});

		let dismantlersSettled = _.filter(groupedCreeps['dismantler'], 
			(c) => c.pos.getRangeTo2(target) > 1
		).length === 0;
		console.log('dismantlersSettled: ' + dismantlersSettled);

		for (var i = 0; i < groupedCreeps[type].length; i++) {
			let c = groupedCreeps[type][i];
			let task = {
				time: Game.time
			};

			let target2;
			if (nearbyEnemies.length > 0) {
				target2 = c.pos.findClosestByRange(nearbyEnemies);
				if (target2) {
					task.moveTo = target2.pos;
				}
			} else {
				if (dismantlersSettled && c.pos.getRangeTo2(target) > 1) {
					task.moveTo = target.pos;
					task.moveRange = 1
				} else if (c.name !== captain.name && c.pos.getRangeTo2(captain) > 3) {
					task.moveTo = captain.pos;
					task.moveRange = 2;
				}
			}

			if (target2 && c.pos.getRangeTo2(target2) <= 1) {
				task.action = 'attack';
				task.target = target2.id;
			} else {
				let targets = c.pos.findInRange(FIND_HOSTILE_CREEPS, 1, 
					{ filter: (c) => {
							if (GameState.allies.indexOf(c.owner.username) >= 0) {
								return false;
							} else {
								return true;
							}
						}
					});
				if (targets.length > 0) {
					targets.sort((a,b) => a.hits - b.hits);
					task.action = 'attack';
					task.target = targets[0].id;
				} else {
					if (c.pos.getRangeTo2(target) <= 1) {
						task.action = 'attack';
						task.target = target.id;
					} else {
						targets = c.pos.findInRange(FIND_STRUCTURES, 1, { filter: (s) => s.hits > 0 });
						if (targets.length > 0) {
							targets.sort((a,b) => a.hits - b.hits);
							task.target = targets[0].id;
							task.action = 'attack';
						}
					}
				}
			}

			c.memory.task = task;
		}
	}

	type = 'ranger';
	if (groupedCreeps[type] && groupedCreeps[type].length > 0) {
		let nearbyEnemies = captain.pos.findInRange(FIND_HOSTILE_CREEPS, 7, 
			{ filter: (c) => {
					if (GameState.allies.indexOf(c.owner.username) >= 0) {
						return false;
					} else {
						return true;
					}
				}
			});

		for (var i = 0; i < groupedCreeps[type].length; i++) {
			let c = groupedCreeps[type][i];
			let task = {
				time: Game.time
			};

			let target2;
			if (nearbyEnemies.length > 0) {
				target2 = c.pos.findClosestByRange(nearbyEnemies);
				if (target2) {
					task.moveTo = target2.pos;
					task.moveRange = 3;
				}
			} else {
				if (c.pos.getRangeTo2(target) > 3) {
					task.moveTo = target.pos;
					task.moveRange = 3;
				} else if (c.name !== captain.name && c.pos.getRangeTo2(captain) > 3) {
					task.moveTo = captain.pos;
					task.moveRange = 2;
				} else {
					c.fleeFrom(c.room.find(FIND_CREEPS), 2);
				}
			}

			if (true) {
				task.action = 'rangedAttack';
				task.target = target.id;
			} else {
				task.action = 'rangedMassAttack';
			}

			c.memory.task = task;
		}
	}

	if (captain.memory.task && captain.memory.task.moveTo) {
		//delete captain.memory.task.moveTo;
	}

	squadCreeps.forEach(function(c) {
		executeCreepTask(c);
	});
}





function runBreachMode(campaign, squadCreeps, captain, waywardCreeps) {
	let breachTarget;

	let targetRoom = Game.rooms[campaign.target];
	if (targetRoom) {
		targetRoom.visual.poly(_.map(campaign.attackPlan.breachPath, (pos) => [pos.x,pos.y]),
			{stroke: '#f00', strokeWidth: .2, opacity: 0.3, lineStyle: 'solid'});
		let breachPoint = undefined;
		while (!breachPoint && campaign.attackPlan.breachPoints.length > 0) {
			breachPoint = Game.getObjectById(campaign.attackPlan.breachPoints[0].id)
			if (!breachPoint) {
				campaign.attackPlan.breachPoints.shift();
			} else {
				breachTarget = breachPoint;
			}
		}
	}

	if (!breachTarget) {
		delete campaign.breachPoints;
		delete campaign.breachPath;
		return;
	} else {
		if (waywardCreeps.length === 0) {
			if (captain.pos.getRangeTo2(breachTarget) > 2) {
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
					if (captain.pos.getRangeTo2(breachTarget) > 2) {
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
							if (pathIdx > 0) {
								// for (var i = 0; i < pathIdx; i++) {
								// 	captain.memory.onBreachPath.shift();	
								// }
								captain.memory.onBreachPath = captain.memory.onBreachPath.slice(
									pathIdx, captain.memory.onBreachPath.length - 1 - pathIdx);
							}
						} else {
							let pos = captain.memory.onBreachPath[1];
							if (pos) {
								pos.roomName = campaign.target;
								captain.travelTo(pos, { range: 0 });
							}
						}
					} else {
						// in range, do the things! \o/
					}					
				}
			} else {
				// regroup
			}
		}
		processSquadCreeps(campaign, squadCreeps, captain, waywardCreeps, breachTarget);
	}
}




function runClearMode(campaign, squadCreeps, captain, waywardCreeps) {
	let clearTarget;

	let targetRoom = Game.rooms[campaign.target];

	if (!targetRoom) {
		captain.travelTo(new RoomPosition(25, 25, campaign.target));
	} else {
		if (campaign.clearStructId) { 
			clearTarget = Game.getObjectById(campaign.clearStructId);
			if (!clearTarget) { delete campaign.clearStructId; }
		}
		if (targetRoom && !clearTarget) {
			let structs = targetRoom.find(FIND_STRUCTURES);
			let targets = _.filter(structs, (s) => s.structureType === STRUCTURE_SPAWN);
	    if (targets.length > 0) {
	      clearTarget = targets[0];
	    }
	    if (!clearTarget) {
	    	targets = _.filter(structs, (s) => s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_TOWER)
	    	if (targets.length > 0) {
		      clearTarget = targets[0];
		    }
	    }
	    if (!clearTarget) {	
	    	targets = _.filter(structs, (s) => s.structureType !== STRUCTURE_RAMPART || s.structureType !== STRUCTURE_WALL)
	    	if (targets.length > 0) {
	        clearTarget = targets[0];
	      }
	    }
		}
		campaign.clearStructId = clearTarget.id;
	}

	if (!clearTarget) {
		// run sentry mode?
		return;
	} else {
		if (waywardCreeps.length === 0) {
			captain.travelTo(clearTarget, { range: 1 });
		}
		processSquadCreeps(campaign, squadCreeps, captain, waywardCreeps, clearTarget);
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




function executeCreepTask(creep) {
	if (creep.memory.task && creep.memory.task.time === Game.time) {
    // execute the task
    let task = creep.memory.task;
    if (task.moveTo) {
      if (task.moveRange) {
        creep.travelTo(task.moveTo, { range: task.moveRange, ignoreCreeps: false });
      } else {
        creep.moveTo(new RoomPosition(task.moveTo.x, task.moveTo.y, task.moveTo.roomName));
      }
    }

    if (task.action) {
      let target
      if (task.target) {
        target = Game.getObjectById(task.target);
        if (target) {

        }
      }

      if (task.action === 'heal' && target) {
        creep.heal(target);
      } else if (task.action === 'dismantle' && target) {
        creep.dismantle(target);
      } else if (task.action === 'attack' && target) {
        creep.attack(target);
      } else if (task.action === 'rangedAttack' && target) {
        creep.rangedAttack(target);
      } else if (task.action === 'rangedMassAttack') {
        creep.rangedMassAttack();
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
    _.filter(campaign.squad, (s) => Game.creeps[s.name] && s.status === 'alive'),
    (s) => Game.creeps[s.name]
  );

  return squad;
}





function updateSquadStatus(campaign) {
  _.map(campaign.squad, (s) => {
    if (s.name === null) {
      s.status = 'unspawned';
    } else if (!Game.creeps[s.name] && s.status !== 'dead') {
      campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] " + s.name + " died.";
      s.status = 'dead';
      s.name = '_dead_';
    } else if (Game.creeps[s.name] && Game.creeps[s.name].ticksToLive === undefined) {
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
      //console.log('considering ' + roomName + ' for a base');
      let distanceToRoom = room.getDistanceTo(targetRoomName);
      //console.log(' it is ' + distanceToRoom + ' away');
      if (distanceToRoom < distanceToClosestRoom) {
        distanceToClosestRoom = distanceToRoom;
        closestRoom = roomName;
      }
    }
  }
  return closestRoom;
}





function deleteCampaign(campaignName) {
  if (Memory.empire.campaigns[campaignName]) {
  	Memory.empire.campaigns[campaignName].log += '\nCampaign ended on: ' + Game.time;
  	console.log(Memory.empire.campaigns[campaignName].log);
  	let lines = Memory.empire.campaigns[campaignName].log.split('\n');
  	for (var i = 0; i < lines.length; i++) {
  		Game.notify(lines[i]);
  	}
    delete Memory.empire.campaigns[campaignName];
  }
}





function buildSquadList(squadTemplate) {
	if (squads.templates[squadTemplate]) {
		return _.map(squads.templates[squadTemplate], 
	    (s) => { return { 
	      name: null,
	      type: s.type, 
	      boosts: s.boosts, 
	      body: s.body
	    } 
	  });	
	} else {
		return null;
	}  
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




function newCampaign(targetRoomName, squadTemplate) {
	const startTime = Game.cpu.getUsed();
	const squadList = buildSquadList(squadTemplate);
	if (!squadList) { return false; }

	if (!Memory.empire.campaigns) { Memory.empire.campaigns = {}; }
  let campaignName = targetRoomName + '_' + (Game.time + '').slice(-2);
  Memory.empire.campaigns[campaignName] = {
    createdOn: Game.time,
    target: targetRoomName,
    squadTemplate: squadTemplate,
    launchBase: getClosestRoom(targetRoomName),
    status: 'forming',
    approach: null,
    baseToTargetRoute: [],
    squad: squadList,
    log: '',
    cpu: 0
  };
  let campaign = Memory.empire.campaigns[campaignName];

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
  let cpuUsed = (Game.cpu.getUsed() - startTime);
  campaign.cpu += cpuUsed;
  campaign.log += "Campaign: " + campaignName 
  	+ " created on " + Game.time 
  	+ ". CPU Used: " + cpuUsed;
  campaign.log += '\n`--> Target: ' + campaign.target;
  campaign.log += '\n`--> Base: ' + campaign.launchBase;
  campaign.log += '\n`--> Template: ' + campaign.squadTemplate;
  campaign.log += '\n`--> Approach: ' +  findApproach(campaign.approach);
  campaign.log += '\n`--> Distance To Target: ' +  (campaign.baseToTargetRoute.length - 1);
  return true;
}





function getSquadAndCaptain(campaign) {
	let squadCreeps = getSquadCreeps(campaign);      	      
  if (!campaign.captain || !Game.creeps[campaign.captain]) {
    campaign.captain = chooseCaptain(squadCreeps);
    campaign.log += "\n[T+" + (Game.time - campaign.createdOn) + "] Captain chosen: " + campaign.captain;
  }
  let captain = Game.creeps[campaign.captain];
  if (captain) { 
  	captain.room.visual.circle(captain.pos.x, captain.pos.y, 
  		{fill: 'transparent', radius: 0.65, strokeWidth: 0.25, stroke: 'green'}); 
  }
  return { squadCreeps: squadCreeps, captain: captain };
}




// function getTowerDamageInRoom(roomName) {
// 	let room = Game.rooms[roomName];

// 	let towers = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
// 	let minDamage = towers.length * (TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF));
// 	let maxDamage = towers.length * (TOWER_POWER_ATTACK);

// 	if (room) {
// 		for (var x = 1; x <= 48; x++) {
// 			for (var y = 1; y <= 48; y++) {
// 				let pos = room.getPositionAt(x,y);
// 				let towerDamage = pos.getTowerDamage();
// 				let damageRatio = (towerDamage - minDamage) / (maxDamage - minDamage).toFixed(2);
// 				room.visual.rect(x - 0.5, y - 0.5, 1, 1,
// 				 { fill: getColor(damageRatio), opacity: 0.3 });
// 				let display = Math.round(towerDamage / 100);
// 				room.visual.text(display, x, y, { font: 0.5 });
// 			}
// 		}
// 	}
// }





function getColor(value, factor, offset){
	if (!factor) { factor = 120; }
	if (!offset) { offset = 0; }
  //value from 0 to 1
  var hue=((1-value) * factor + offset).toString(10);
  return ["hsl(",hue,",100%,50%)"].join("");
}
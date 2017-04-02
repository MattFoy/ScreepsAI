require('prototypes')();

module.exports = {	
	borderHarassmentDismantler: {
		run: function(creep) {
			let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
			let flag = Game.flags[squad.medicTent];
			if (creep.memory.healing && creep.hits === creep.hitsMax) {
				creep.memory.healing = false;
			}
			if (!creep.memory.healing && creep.hitsMax - creep.hits > 100) {
				creep.memory.healing = true;
			}

			if (flag) {
				if (creep.room.name !== flag.pos.roomName && creep.room.name !== squad.target) {
					creep.travelTo(flag, {range: 1});
				} else {
					if (creep.hitsMax - creep.hits > 100) {
						creep.travelTo(flag, {range: 1});
					} else {
						if (creep.room.name !== squad.target) {
							if (Game.rooms[squad.target]) {
								creep.travelTo(Game.rooms[squad.target].controller, {range: 1});
							} else {
								creep.travelTo({x:25,y:25,roomName:squad.target}, {range:1});
							}
						} else {
							if (!creep.goDismantle()) {
			          //creep.moveTo(flag);
			          // nothing to fight?
			          console.log('Dismantling done')
			        } else {
			          //battleCry = true;
			          console.log('Dismantling...');
			        }
						}
					}
				}
			}
		}
	},

	borderHarassmentMedic: {
		run: function(creep) {
			let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
			let flag = Game.flags[squad.medicTent];
			if (flag) {
				if (creep.room.name !== flag.pos.roomName || creep.pos.getRangeTo(flag) > 0) {
					creep.travelTo(flag, {range: 0});
				} else {
					let woundedCreeps = creep.room.find(FIND_MY_CREEPS, { filter: function(c) {
						return c.hits < c.hitsMax 
							&& c.pos.getRangeTo(creep) <= 3;
					}});
					woundedCreeps.sort((a,b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
					if (woundedCreeps.length > 0) {
						if (creep.heal(woundedCreeps[0]) === ERR_NOT_IN_RANGE) {
							creep.rangedHeal(woundedCreeps[0]);
						}

					}
				}
			}
		}
	},
	
	fullScale: {
		run: function(creep) {
		
		}
	},
	
	simpleAttacker: {
		run: function(creep) {
			let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
			
			let target;
			if (creep.memory.target) {
				target = creep.memory.target;
			} else {
				target = squad.target;
			}

			if (creep.room.name !== target) {
				if (Game.rooms[target] && Game.rooms[target].controller) {
					creep.travelTo(Game.rooms[target].controller, {range: 1});
				} else {
					creep.travelTo({x: 25, y: 25, roomName: target});
				}
			} else {
				if (!creep.goFight()) {
          //creep.moveTo(flag);
          // nothing to fight?
          console.log('Attack done')
        } else {
          //battleCry = true;
          console.log('Attacking...');
        }
			}
		}
	},
	
	simpleSaboteur: {
		run: function(creep) {
			let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
			if (creep.room.name !== squad.target) {
				if (Game.rooms[squad.target]) {
					creep.travelTo(Game.rooms[squad.target].controller, {range: 1});
				} else {
					creep.travelTo({x: 25, y: 25, roomName: squad.target});
				}
			} else {
				if (!creep.goDismantle()) {
          //creep.moveTo(flag);
          // nothing to fight?
          console.log('Dismantling done')
        } else {
          //battleCry = true;
          console.log('Dismantling...');
        }
			}
		}
	},

	simpleMedic: {
		run: function(creep) {
			let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
			let squadMembers = _.filter(Game.creeps, (c) => c.memory.squad === creep.memory.squad);
			
			let woundedSquadMembers = _.filter(squadMembers, (c) => c.hitsMax > c.hits)
			woundedSquadMembers.sort((a,b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));

			let moving = false;
			if (woundedSquadMembers.length > 0) {
				if (creep.heal(woundedSquadMembers[0]) === ERR_NOT_IN_RANGE) {
					creep.moveTo(woundedSquadMembers[0]);
					moving = true;
					if (creep.pos.getRangeTo(woundedSquadMembers[0]) <= 3) {
						creep.rangedHeal(woundedSquadMembers[0]);	
					} else {
						let closest = creep.pos.findClosestByRange(woundedSquadMembers);
						if (creep.heal(closest) === ERR_NOT_IN_RANGE) {
							creep.rangedHeal(closest);
						}
					}
				}
			}

			if (!moving) {
				let focalPoints = _.filter(squadMembers, (c) => c.memory.squadPosition !== 'simpleMedic');
				if (focalPoints.length > 0) {
					if (focalPoints.length === 1) {
						creep.moveTo(focalPoints[0]);
					} else {
						// uh... follow the squad? \_o_/
						creep.moveTo(focalPoints[0]);
					}
				} else {
					creep.travelTo(squad.rallyPoint, { range: 0 });
				}
			}
		}
	},
	
	decoy: {
		run: function(creep) {
			let squad = GameState.memory[GameState.constants.MEMORY_CRITICAL].attackSquads[creep.memory.squad];
			creep.suicide();
		}
	}
};
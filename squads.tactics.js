require('prototypes')();

module.exports = {	
	simpleAttacker: {
		run: function(creep) {
			let squad = Memory.empire.campaigns[creep.memory.squad];
			
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
          console.log('Attack done');

          if (squad.regroup) {
          	console.log("regrouping to: " + JSON.stringify(squad.regroup));
          	creep.travelTo(squad.regroup, { range: 2 });
          }
        } else {
          //battleCry = true;
          console.log('Attacking...');
        }
			}
		}
	},
	
	simpleSaboteur: {
		run: function(creep) {
			let squad = Memory.empire.campaigns[creep.memory.squad];
			if (creep.room.name !== squad.target) {
				if (Game.rooms[squad.target]) {
					creep.travelTo(Game.rooms[squad.target].controller, { range: 1, allowHostile: true });
				} else {
					creep.travelTo({x: 25, y: 25, roomName: squad.target}, { allowHostile: true });
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
			let squad = Memory.empire.campaigns[creep.memory.squad];
			let squadMembers = _.filter(Game.creeps, (c) => c.memory.squad === creep.memory.squad);
			
			let woundedSquadMembers = _.filter(squadMembers, (c) => c.hitsMax > c.hits)
			woundedSquadMembers.sort((a,b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));

			let moving = false;
			if (woundedSquadMembers.length > 0) {
				if (woundedSquadMembers[0].name !== creep.name) {
					creep.moveTo(woundedSquadMembers[0]);
					moving = true;
				}
				if (creep.heal(woundedSquadMembers[0]) === ERR_NOT_IN_RANGE) {
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
				let focalPoints = _.filter(squadMembers, (c) => c.memory.position !== 'simpleMedic');
				if (focalPoints.length > 0) {
					if (focalPoints.length === 1) {
						creep.moveTo(focalPoints[0]);
					} else if (focalPoints.length > 1) {
						// uh... follow the squad? \_o_/
						creep.moveTo(creep.pos.findClosestByRange(focalPoints));
					}
				} else {
					creep.travelTo(squad.rallyPoint, { range: 1, allowHostile: true });
				}
			}
		}
	},

	saboteurWithMedic: {
		run: function(creep) {
			let squad = Memory.empire.campaigns[creep.memory.squad];
			if (creep.room.name !== squad.target) {
				if (Game.rooms[squad.target]) {
					creep.travelTo(Game.rooms[squad.target].controller, { range: 1, allowHostile: true });
				} else {
					creep.travelTo({x: 25, y: 25, roomName: squad.target}, { allowHostile: true });
				}
			} else {
				let medics = _.map(
					_.filter(squad.squad, (s) => s.position === 'simpleMedic' && Game.creeps[s.name]),
					(s) => Game.creeps[s.name]);

				let regrouping = false;
				if (medics.length > 0 && creep.hits < creep.hitsMax) {
					let closestMedic = creep.pos.findClosestByRange(medics);
					if (creep.pos.getRangeTo(closestMedic) > 1) {
						creep.moveTo(closestMedic);
						regrouping = true;
					}
				}
				if (!regrouping) {
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
	},
	
};
module.exports = {

	attackDuo: [
		{ type: 'guard', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'medic', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
	],

	boostedAttackDuo: [
		{ type: 'guard', boosts: [ATTACK,TOUGH], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
	],

	attackSquad: [
		{ type: 'guard', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'guard', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'guard', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'medic', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
		{ type: 'medic', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
		{ type: 'medic', body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
	],

	boostedAttackSquad: [
		{ type: 'guard', boosts: [ATTACK,TOUGH], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'guard', boosts: [ATTACK,TOUGH], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'guard', boosts: [ATTACK,TOUGH], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(HEAL)) },
	],

	boostedBreachSquad: [
		{ type: 'dismantler', boosts: [TOUGH,WORK], body: Array(8).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(17).fill(WORK)) },
		{ type: 'dismantler', boosts: [TOUGH,WORK], body: Array(8).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(17).fill(WORK)) },
		{ type: 'guard', boosts: [ATTACK,TOUGH], body: Array(10).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(15).fill(ATTACK)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(8).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(17).fill(HEAL)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(8).fill(TOUGH).concat(Array(25).fill(MOVE)).concat(Array(17).fill(HEAL)) },
	],

	testComplexSquad: [
		{ type: 'dismantler', body: Array(1).fill(TOUGH).concat(Array(4).fill(MOVE)).concat(Array(3).fill(WORK)) },
		{ type: 'dismantler', body: Array(1).fill(TOUGH).concat(Array(4).fill(MOVE)).concat(Array(3).fill(WORK)) },
		{ type: 'dismantler', body: Array(1).fill(TOUGH).concat(Array(4).fill(MOVE)).concat(Array(3).fill(WORK)) },
		{ type: 'guard', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(ATTACK)) },
		{ type: 'guard', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(ATTACK)) },
		{ type: 'ranger', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(RANGED_ATTACK)) },
		{ type: 'medic', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
		{ type: 'medic', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
		{ type: 'medic', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
	],

	testBoostedSquad: [
		{ type: 'dismantler', boosts: [TOUGH,WORK], body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(WORK)) },
		{ type: 'dismantler', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(WORK)) },
		{ type: 'guard', boosts: [ATTACK], body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(ATTACK)) },
		{ type: 'ranger', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(RANGED_ATTACK)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
		{ type: 'medic', boosts: [TOUGH,HEAL], body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
	],

	// ===============================================

	borderHarassment: [
		{ position: 'borderHarassmentDismantler', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] },
		{ position: 'borderHarassmentMedic', body: [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'borderHarassmentMedic', body: [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] }
	],

	overwhelm: [
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK] }
	],

	borderHarassmentLite: [
		{ position: 'borderHarassmentDismantler', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK] },
		{ position: 'borderHarassmentMedic', body: [MOVE,HEAL] }
	],

	dismantleRaid: [
		{ position: 'simpleMedic', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'simpleMedic', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'simpleSaboteur', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] }
	],

	sabotageAlone: [
		{ position: 'simpleSaboteur', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] }
	],

	testSmallGuardSquad: [
		{ type: 'guard', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(ATTACK)) },
		{ type: 'medic', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
	],

	testSmallDismantlerSquad: [
		{ type: 'dismantler', body: Array(1).fill(TOUGH).concat(Array(4).fill(MOVE)).concat(Array(3).fill(WORK)) },
		{ type: 'medic', body: Array(1).fill(TOUGH).concat(Array(3).fill(MOVE)).concat(Array(2).fill(HEAL)) },
	],
	
	smallRaid: [
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] }
	],
	
	smallRaidx3: [
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] }
	],
	
	mediumRaid: [
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,MOVE,MOVE,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,MOVE,MOVE,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK] },
		{ position: 'simpleMedic', body: [TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
	],
	
  largeRaid: [
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK] },
		{ position: 'simpleMedic', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'simpleMedic', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'simpleMedic', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
	],

	smallSabotage: [
		{ position: 'simpleSaboteur', body: [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleSaboteur', body: [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE] }
	],

	wallCleaner: [
		{ position: 'simpleSaboteur', body: [WORK, MOVE] }
	],

	boostedAttacker: [
		{ position: 'simpleAttacker', boosts: [TOUGH,ATTACK], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK] },
		{ position: 'simpleMedic', boosts: [TOUGH,HEAL], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
	],

	boostedSabotage: [
		{ position: 'saboteurWithMedic', boosts: [TOUGH], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] },
		{ position: 'saboteurWithMedic', boosts: [TOUGH], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] },
		{ position: 'saboteurWithMedic', boosts: [TOUGH], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] },
		{ position: 'simpleAttacker', boosts: [TOUGH,ATTACK], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK] },
		{ position: 'simpleMedic', boosts: [TOUGH,HEAL], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'simpleMedic', boosts: [TOUGH,HEAL], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
	],

	smallBoostedSabotage: [
		{ position: 'saboteurWithMedic', boosts: [TOUGH], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] },
		{ position: 'simpleAttacker', boosts: [TOUGH], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK] },
		{ position: 'simpleMedic', boosts: [TOUGH,HEAL], body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
	],
	
};
module.exports = {		
	borderHarassment: [
		{ position: 'borderHarassmentDismantler', body: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK] },
		{ position: 'borderHarassmentMedic', body: [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] },
		{ position: 'borderHarassmentMedic', body: [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL] }
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
	
	fullScale: null,
	
	smallRaid: [
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] },
		{ position: 'simpleAttacker', body: [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE,MOVE,MOVE] }
	],
	
	mediumRaid: [
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,MOVE,MOVE,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,MOVE,MOVE,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK] },
		{ position: 'simpleAttacker', body: [TOUGH,TOUGH,MOVE,MOVE,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK,MOVE,ATTACK] }
	],

	smallSabotage: [
		{ position: 'simpleSaboteur', body: [WORK,MOVE] },
		{ position: 'simpleSaboteur', body: [WORK,MOVE] }
	],
	
	test: [
		{ position: 'decoy', body: [MOVE] }
	],

	test2: [
		{ position: 'decoy', body: [MOVE] },
		{ position: 'decoy', body: [MOVE] },
		{ position: 'decoy', body: [MOVE] },
		{ position: 'decoy', body: [MOVE] },
		{ position: 'decoy', body: [MOVE] },
	],

	test3: [
		{ position: 'decoy', body: [TOUGH,MOVE] },
		{ position: 'decoy', body: [ATTACK,MOVE] },
		{ position: 'decoy', body: [RANGED_ATTACK,MOVE] },
		{ position: 'decoy', body: [HEAL,MOVE] },
		{ position: 'decoy', body: [WORK,MOVE] },
	]
};
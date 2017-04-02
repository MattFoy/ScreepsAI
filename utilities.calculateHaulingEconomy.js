module.exports = function(room) {
  if (!room) { return; }
  // only do this every 10 ticks
  for(var i = 0; i < room.memory.roleReservables['miner'].length; i++) {
    let flag = Game.flags[room.memory.roleReservables['miner'][i]];
    if (!flag || !flag.room) { 
      console.log("Could not access " + flag.pos.roomName);
      continue; 
    }
    if (!room.memory.energySourceFlags_details[flag.name]) { room.memory.energySourceFlags_details[flag.name] = { name: flag.name, room: flag.pos.roomName } }
    
    if (room.memory.energySourceFlags_details[flag.name].pathCost === undefined || (Game.time + 27) % 100 == 0) {
      let goal;
      if (room.storage) {
        goal = room.storage;
      } else {
        goal = _.filter(Game.spawns, (s) => (s.room.name === room.name))[0];
        if (!goal) {
          goal = room.controller;
        }
      }
      room.memory.energySourceFlags_details[flag.name].pathCost = flag.getTravelCostTo(goal.pos);
    }

    if (!room.memory.energySourceFlags_details[flag.name].energyCapacity || (Game.time - 14) % 50 == 0) {
      let source = flag.pos.findClosestByRange(FIND_SOURCES);
      room.memory.energySourceFlags_details[flag.name].energyCapacity = source.energyCapacity;
    }

    let droppedenergy = (_.sum(flag.pos.findInRange(FIND_DROPPED_ENERGY, 2), 'amount'));
    let storedEnergy = 0;
    let container = flag.pos.findClosestByRange(FIND_STRUCTURES, 
      { filter: (s) => (s.structureType === STRUCTURE_CONTAINER && s.pos.getRangeTo(flag.pos) <= 2) });
    if (container) {
      storedEnergy = (container.store[RESOURCE_ENERGY]);
    }
    
    var haulerCapacityEnRoute = _.sum(_.filter(Game.creeps, (c) => c.memory.intendedSource === flag.name), (c) => c.carryCapacity - _.sum(c.carry));
    room.memory.energySourceFlags_details[flag.name].energy = storedEnergy + droppedenergy - haulerCapacityEnRoute;


    let energyPerTick = (room.memory.energySourceFlags_details[flag.name].energyCapacity / 300).toFixed(2);

    let assignedCreeps = _.filter(Game.creeps, (c) => c.memory.roleSpecificFlag === flag.name);
    let harvested = false;
    if (assignedCreeps.length >= 1) {
      for (let i = 0; i < assignedCreeps.length; i++) {
        if (assignedCreeps[i].pos.getRangeTo(flag) <= 10) {
          harvested = true;
        }
      }
    }
    if (!harvested) {
      energyPerTick = 0;
    }

    let carryRequired = energyPerTick * room.memory.energySourceFlags_details[flag.name].pathCost * 2;

    //console.log(energyPerTick + ' -> ' + carryRequired);

    room.memory.energySourceFlags_details[flag.name].energyPerTick = energyPerTick;
    room.memory.energySourceFlags_details[flag.name].carryRequired = carryRequired;

    //console.log(flag.name + ' ' + JSON.stringify(room.memory.energySourceFlags_details[flag.name]));
  }
}
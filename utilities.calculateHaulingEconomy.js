module.exports = function(room) {
  if (!room) { return; }
  if (!room.memory.hauling) { room.memory.hauling = {}; }
  if (!room.memory.hauling.sourceDetails) { room.memory.hauling.sourceDetails = {}; }

  for(var i = 0; i < room.memory.roleReservables['miner'].length; i++) {
    let flag = Game.flags[room.memory.roleReservables['miner'][i]];
    if (!flag || !flag.room) { 
      console.log('Hauling economy --> <a href="#!/room/' + flag.pos.roomName + '">' + flag.pos.roomName + '</a> not visible');
      if (!Memory.empire.observationRequests) { Memory.empire.observationRequests = []; }
      if (Memory.empire.observationRequests.indexOf(flag.pos.roomName) === -1) {
        Memory.empire.observationRequests.push(flag.pos.roomName);
      }
      continue;
    }
    if (!room.memory.hauling.sourceDetails[flag.name]) { room.memory.hauling.sourceDetails[flag.name] = { name: flag.name, room: flag.pos.roomName } }
    
    if (room.memory.hauling.sourceDetails[flag.name].pathCost === undefined || (Game.time + 27) % 100 == 0) {
      let goal;
      if (room.storage) {
        goal = room.storage;
      } else {
        goal = _.filter(Game.spawns, (s) => (s.room.name === room.name))[0];
        if (!goal) {
          goal = room.controller;
        }
      }
      room.memory.hauling.sourceDetails[flag.name].pathCost = flag.getTravelCostTo(goal.pos);
    }

    if (!room.memory.hauling.sourceDetails[flag.name].energyCapacity || (Game.time - 14) % 50 == 0) {
      let source = flag.pos.findClosestByRange(FIND_SOURCES);
      room.memory.hauling.sourceDetails[flag.name].energyCapacity = source.energyCapacity;
    }

    let droppedenergy = (_.sum(flag.pos.findInRange(FIND_DROPPED_ENERGY, 2), 'amount'));
    let storedEnergy = 0;
    let container = flag.pos.findClosestByRange(FIND_STRUCTURES, 
      { filter: (s) => (s.structureType === STRUCTURE_CONTAINER && s.pos.getRangeTo(flag.pos) <= 2) });
    if (container) {
      storedEnergy = (container.store[RESOURCE_ENERGY]);
    }
    
    var haulerCapacityEnRoute = _.sum(_.filter(Game.creeps, (c) => c.memory.intendedSource === flag.name), (c) => c.carryCapacity - _.sum(c.carry));
    room.memory.hauling.sourceDetails[flag.name].energy = storedEnergy + droppedenergy - haulerCapacityEnRoute;


    let energyPerTick = (room.memory.hauling.sourceDetails[flag.name].energyCapacity / 300).toFixed(2);

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

    let carryRequired = energyPerTick * room.memory.hauling.sourceDetails[flag.name].pathCost * 2;

    //console.log(energyPerTick + ' -> ' + carryRequired);

    room.memory.hauling.sourceDetails[flag.name].energyPerTick = energyPerTick;
    room.memory.hauling.sourceDetails[flag.name].carryRequired = carryRequired;
    //console.log(flag.name + ' ' + JSON.stringify(room.memory.hauling.sourceDetails[flag.name]));
  }

  room.memory.hauling.maxContainerEnergy = _.max(room.memory.hauling.sourceDetails, 'energy').energy;

  if (!room.memory.hauling.carryAdjustment) { 
    room.memory.hauling.carryAdjustment = 0;
  }

  if (room.memory.hauling.maxContainerEnergy > 2000) {
    room.memory.hauling.carryAdjustment += 50;
  } else if (room.memory.hauling.maxContainerEnergy > 1500) {
    room.memory.hauling.carryAdjustment += 2;
  } else if (room.memory.hauling.carryAdjustment < 500) {
    room.memory.hauling.carryAdjustment -= 1;
  } else if (room.memory.hauling.carryAdjustment < 100) {
    room.memory.hauling.carryAdjustment -= 10;
  }
}
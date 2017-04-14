const profiler = require('screeps-profiler');

function processLinks(room) {
  let links = room.find(FIND_MY_STRUCTURES, {
    filter: function(object) {
      return object.structureType === STRUCTURE_LINK;
    }
  });

  if (!Game.getObjectById(room.memory.receivingLink)) {
    room.memory.receivingLink = undefined;
    room.memory.linkSweetSpot = undefined;
  }

  if (!Game.getObjectById(room.memory.controllerLink)) {
    room.memory.controllerLink = undefined;
  }

  // determine the "storage" link
  if (links.length > 0 && !room.memory.receivingLink) {
    console.log(room.name + ": Finding optimal Receiving Link");
    let minRange = 2;
    let link = null;

    for (let i = 0; i < links.length; i++) {
      if (links[i].pos.getRangeTo(room.storage) <= minRange) {
        link = links[i];
      }
    }
    if (link) {
      room.memory.receivingLink = link.id;
    }
  }

  // determine the "upgraders" link
  if (links.length > 0 && !room.memory.controllerLink) {
    let minRange = 4;
    let link = null;

    for (let i = 0; i < links.length; i++) {
      if (links[i].pos.getRangeTo(room.controller) <= minRange) {
        link = links[i];
      }
    }
    if (link) {
      room.memory.controllerLink = link.id;
    }
  }

  if (room.memory.receivingLink || room.memory.controllerLink) {
    let receivingLink = Game.getObjectById(room.memory.receivingLink);
    let controllerLink = Game.getObjectById(room.memory.controllerLink);
    if (controllerLink) {
      let controllerCapacity = (controllerLink.energyCapacity - controllerLink.energy);
      if (controllerCapacity > 100) {
        for (let i = 0; i < links.length; i++) {
          if (links[i].id !== controllerLink.id
            && (links[i].energy * (1 - LINK_LOSS_RATIO)) <= controllerCapacity
            && links[i].energy > 0
            && links[i].cooldown === 0) {
            controllerCapacity -= links[i].energy * LINK_LOSS_RATIO;
            links[i].transferEnergy(controllerLink);
          }
        }
      }
    }

    if (receivingLink) {
      if (!room.memory.linkSweetSpot) {
        let receivingLink = Game.getObjectById(room.memory.receivingLink);
        let storage = room.storage;
        if (receivingLink.pos.getRangeTo(storage) <= 2) {
          room.memory.linkSweetSpot = {};
          room.memory.linkSweetSpot.x = Math.floor((receivingLink.pos.x + storage.pos.x) / 2);
          room.memory.linkSweetSpot.y = Math.floor((receivingLink.pos.y + storage.pos.y) / 2);
        }
      }

      let availableReceiverCapacity = receivingLink.energyCapacity - receivingLink.energy;
      for (let i = 0; i < links.length; i++) {
        if (links[i].id !== receivingLink.id
          && (!controllerLink || links[i].id !== controllerLink.id)
          && (availableReceiverCapacity) >= (links[i].energy * (1 - LINK_LOSS_RATIO))
          && links[i].energy > 0
          && links[i].cooldown === 0) {
          
          availableReceiverCapacity -= links[i].energy;
          links[i].transferEnergy(receivingLink);          
        }
      }
    }
  }
}

processLinks = profiler.registerFN(processLinks, 'processLinks');

module.exports = processLinks
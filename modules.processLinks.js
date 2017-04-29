const profiler = require('screeps-profiler');

function processLinks(room) {
  let links = room.find(FIND_MY_STRUCTURES, {
    filter: function(object) {
      return object.structureType === STRUCTURE_LINK;
    }
  });

  if (!Game.getObjectById(room.memory.links.receiver)) {
    room.memory.links.receiver = undefined;
    room.memory.links.receiverSpot = undefined;
  }

  if (!Game.getObjectById(room.memory.links.controller)) {
    room.memory.links.controller = undefined;
  }

  // determine the "storage" link
  if (links.length > 0 && !room.memory.links.receiver) {
    console.log(room.name + ": Finding optimal Receiving Link");
    let minRange = 2;
    let link = null;

    for (let i = 0; i < links.length; i++) {
      if (links[i].pos.getRangeTo(room.storage) <= minRange) {
        link = links[i];
      }
    }
    if (link) {
      room.memory.links.receiver = link.id;
    }
  }

  // determine the "upgraders" link
  if (links.length > 0 && !room.memory.links.controller) {
    let minRange = 4;
    let link = null;

    for (let i = 0; i < links.length; i++) {
      if (links[i].pos.getRangeTo(room.controller) <= minRange) {
        link = links[i];
      }
    }
    if (link) {
      room.memory.links.controller = link.id;
    }
  }

  if (room.memory.links.receiver || room.memory.links.controller) {
    let receivingLink = Game.getObjectById(room.memory.links.receiver);
    let controllerLink = Game.getObjectById(room.memory.links.controller);
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
      if (!room.memory.links.receiverSpot) {
        let receivingLink = Game.getObjectById(room.memory.links.receiver);
        let storage = room.storage;
        if (receivingLink.pos.getRangeTo(storage) <= 2) {
          room.memory.links.receiverSpot = {};
          room.memory.links.receiverSpot.x = Math.floor((receivingLink.pos.x + storage.pos.x) / 2);
          room.memory.links.receiverSpot.y = Math.floor((receivingLink.pos.y + storage.pos.y) / 2);
        }
      }

      let availableReceiverCapacity = receivingLink.energyCapacity - receivingLink.energy;
      for (let i = 0; i < links.length; i++) {
        if (links[i].id !== receivingLink.id && (!controllerLink || links[i].id !== controllerLink.id)) {
          if (availableReceiverCapacity >= (links[i].energy * (1 - LINK_LOSS_RATIO))
            && links[i].energy > 0 && links[i].cooldown === 0) {
            availableReceiverCapacity -= links[i].energy;
            links[i].transferEnergy(receivingLink);
          }

          if (!room.memory.links) { room.memory.links = {}; }
          if (!room.memory.links.inputs) { room.memory.links.inputs = []; }
          if (room.memory.links.inputs.indexOf(links[i].id) === -1) {
            room.memory.links.inputs.push(links[i].id);
          }
        }
      }
    }
  }
}

processLinks = profiler.registerFN(processLinks, 'processLinks');

module.exports = processLinks
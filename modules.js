module.exports = {
  processTowers: require('modules.processTowers'),
  processLinks: require('modules.processLinks'),
  processCreeps: require('modules.processCreeps'),
  processLabs: require('modules.processLabs'),
  processSpawning: require('modules.processSpawning'),
  processObserver: function(room) {
  	let observer;

  	// Assume requests are unique...
    // if (Memory.empire.observationRequests) {
  	// 	Memory.empire.observationRequests = _.uniq(Memory.empire.observationRequests);
  		
   //    if (Memory.empire.observers) {
  	// 		_.remove(Memory.empire.observationRequests, 
  	// 			(requestedRoom) => _.filter(Memory.empire.observers, 
  	// 				(obs) => obs.observing === requestedRoom 
   //            && obs.observingUntil
   //            && Game.time - obs.observingUntil < 0).length > 0);  			
  	// 	}
  	// }

  	if (Memory.empire.observers && Memory.empire.observers[room.name]) {
  		observer = Game.getObjectById(Memory.empire.observers[room.name].id);
  		if (!observer) { delete Memory.empire.observers[room.name]; }
  	} else {
			let res = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_OBSERVER });
  		if (res.length === 1) {
  			let observer = res[0];
  			if (!Memory.empire.observers) { Memory.empire.observers = {}; }
  			if (!Memory.empire.observers[room.name]) { Memory.empire.observers[room.name] = {}; }
  			Memory.empire.observers[room.name].id = observer.id;
  		}
  	}

  	if (observer && Memory.empire.observers[room.name].observing 
  		&& Game.time - Memory.empire.observers[room.name].observingUntil < 0) {
  		observer.observeRoom(Memory.empire.observers[room.name].observing);
  		console.log('Continuing observation of <a href="#!/room/' + Memory.empire.observers[room.name].observing + '">' + Memory.empire.observers[room.name].observing + '</a>')
  	} else if (observer && Memory.empire.observationRequests 
			&& Memory.empire.observationRequests.length > 0) {
  		Memory.empire.observers[room.name].observing = Memory.empire.observationRequests.pop();
  		Memory.empire.observers[room.name].observingUntil = Game.time + 5;
  		observer.observeRoom(Memory.empire.observers[room.name].observing);
  		console.log('Beginning observation of <a href="#!/room/' + Memory.empire.observers[room.name].observing + '">' + Memory.empire.observers[room.name].observing + '</a>')
  	}

  }
};
let utilities = require('utilities');
require('prototypes.roomPosition')();
require('prototypes.room')();

module.exports = function() {  
  Creep.prototype.flowTo = function(target) {
    //return false;
    // Flow complete

    let roomName;

    if (typeof target === 'string') {
      roomName = target;
    }
    if (!roomName) {
      if (!target.roomName) {
        if (target.pos && (target.pos.roomName)) {
          target = target.pos;
        } else {
          return;
        }
      }
      roomName = target.roomName;
    }

    if (this.room.name === roomName) { return false; }

    if (!this.memory.flowTo 
      || !(this.memory.flowTo.length > 0) 
      || this.memory.flowTo[this.memory.flowTo.length-1] !== roomName) {
      //console.log("Calculating flow plan for " + this.room.name + ' -> ' + roomName);
      this.memory.flowTo = [this.room.name];
      var delta = [];
      Game.map.findRoute(this.room.name, roomName, {
        routeCallback(roomName) {
          let type = Room.getType(roomName);

          let isMyRoom = Game.rooms[roomName] 
            && Game.rooms[roomName].controller 
            && (Game.rooms[roomName].controller.my 
              || (Game.rooms[roomName].controller.reservation 
                && Game.rooms[roomName].controller.reservation.username === GameState.username));
          if (type === 'Highway' || isMyRoom) {
            return 1;
          } else if (type === 'SourceKeeper' && _.filter(Game.flags, (f) => f.pos.roomName === roomName).length <= 0) {
            return 3.5;
          } else {
            return 2.5;
          }
        }
      }).forEach(function(info) {
        delta.push(info.room);
      });
      this.memory.flowTo = this.memory.flowTo.concat(delta);
    }


    while (this.memory.flowTo && this.memory.flowTo.length > 0 && ((!this.memory.flowTo[0]) || this.memory.flowTo[0] === this.room.name)) {
      this.memory.flowTo.shift();
    }

    if (this.memory.flowTo && this.memory.flowTo.length > 0) {
      let targetRoom = this.memory.flowTo[0];

      if (targetRoom == this.room.name) {
        if (this.pos.x === 0) {
          this.move(RIGHT);
          return true;
        } else if (this.pos.x === 49) {
          this.move(LEFT);
          return true;
        } else if (this.pos.y === 0) {
          this.move(BOTTOM);
          return true;
        } else if (this.pos.y === 49) {
          this.move(TOP);
          return true;
        }
      }

      if (this.memory.flowToPrevious
        && this.memory.flowToPrevious.x === this.pos.x
        && this.memory.flowToPrevious.y === this.pos.y
        && this.memory.flowToPrevious.roomName === this.pos.roomName) {
        //console.log('Flow Jam! [' + this.memory.flowToPrevious.roomName + '] ' 
        //  + this.memory.flowToPrevious.x + ',' + this.memory.flowToPrevious.y);
        this.memory.flowStuck = 10;
        this.moveTo(this.pos.findClosestByRange(this.room.findExitTo(this.memory.flowTo[0])));
        //this.travelTo(this.pos.findClosestByRange(this.room.findExitTo(this.memory.flowTo[0])), { range: 1, ignoreCreeps: false, expiresWhenIncomplete: 10, expiresWhenComplete: 100 });
        return true;
      } else {
        delete this.memory.flowToPrevious;
      }

      if (targetRoom 
        && this.room.memory.flowFields 
        && this.room.memory.flowFields[targetRoom] 
        && this.room.memory.flowFields[targetRoom][this.pos.x]) {
        let direction = this.room.memory.flowFields[targetRoom][this.pos.x][this.pos.y];
        if (direction && direction > 0) {
          let result = this.move(direction);
          if (result === 0) {
            //console.log("Go with the flow!");
            this.room.visual.text(utilities.getVisualDirection(direction), this.pos, {color: 'blue', font: 2.7, opacity: 0.5});
            this.memory.flowToPrevious = { x: this.pos.x, y: this.pos.y, roomName: this.pos.roomName };
            return true;
          } else if (result == ERR_TIRED) {
            return true;
          } else {
            console.log("Flow error: " + result);
            return false;
          }
        }
      }
      //this.travelTo(target, { range: range, ignoreCreeps: false, tryToFlow: false, expiresWhenIncomplete: 2, expiresWhenComplete: 2 });
    } else {
      return false;
    }
  }

  Creep.prototype.travelTo = function(target, opts) {
    //this.moveTo(target); return;

    if (Game.cpu.bucket < 200) {
      if (!GameState.infiniteTravelTo) { GameState.infiniteTravelTo = []; }
      GameState.infiniteTravelTo.push(this.name);

      if (GameState.infiniteTravelTo
        && GameState.infiniteTravelTo.indexOf(this.name) > -1
        && _.groupBy(GameState.infiniteTravelTo)[this.name] 
        && _.groupBy(GameState.infiniteTravelTo)[this.name].length > 8) {

        console.log('<span style="color:red">WHAT THE FUCK</span> ' + this.name + ', ' + this.memory.role + ': ' + this.room.name + ', ' + this.pos.x + ',' + this.pos.y);
        //this.moveTo(target, { reusePath: 15 }); return;
      }
    }
    this.memory.travelledLast = Game.time;

    let range = 0;
    let ignoreCreeps = true;
    let expiresWhenIncomplete = 5;
    let expiresWhenComplete = 100;
    let expiresWhenColliding = 8;

    let flee = false;

    if (opts) {
      range = opts.range;
      if (opts.ignoreCreeps !== undefined) { ignoreCreeps = (opts.ignoreCreeps === true ? true : false); }
      if (opts.expiresWhenColliding >= 0) { expiresWhenColliding = opts.expiresWhenColliding; }
      if (opts.expiresWhenComplete >= 0) { expiresWhenComplete = opts.expiresWhenComplete; }
      if (opts.expiresWhenIncomplete >= 0) { expiresWhenIncomplete = opts.expiresWhenIncomplete; }

      if (opts.flee) {
        flee = true;
      }
    }     
    
    if (!target) { return; }
    if (!target.roomName) {
      if (target.pos && (target.pos.roomName)) {
        target = target.pos;
      } else {
        return;
      }
    }

    if ((target.x === this.pos.x
      && target.y === this.pos.y
      && target.roomName == this.room.name)
      || (range > 0 && this.pos.getRangeTo(target) <= range)) {
      // we're here!
      console.log(this.name + ', ' + this.memory.role + ', why are you moving??');
      delete this.memory.travelTo;
      return;
    }

    if (this.memory.flowTo 
      && this.memory.flowTo.length > 0 
      && _.filter(Game.map.describeExits(this.pos.roomName), (e) => 
        e === this.memory.flowTo[0]).length <= 0) {
      this.memory.flowTo = undefined;
      this.memory.flowStuck = undefined;
    }

    if (this.memory.flowStuck) {
      if (this.memory.flowStuck > 0) {
        this.memory.flowStuck--;
      }
      //console.log("Next exit: " + this.memory.flowTo[0]);
      this.moveTo(this.pos.findClosestByRange(this.room.findExitTo(this.memory.flowTo[0])), { reusePath: 10 });
      return;
    } else {
      if (!(this.memory.travelTo 
        && this.memory.travelTo.path
        && this.memory.travelTo.path.length > 1
        && this.memory.travelTo.path[this.memory.travelTo.path.length-1].roomName === target.roomName)) { 
        if (this.flowTo(target)) {
          this.memory.travelTo = {};
          return; 
        }
      }
    }

    if (!this.memory.travelTo) { this.memory.travelTo = {}; }

    if (this.memory.travelTo && Game.time > this.memory.travelTo.expiresOn) { 
      //console.log("Expiring stale path");
      this.memory.travelTo = {};
      this.memory.flowStuck = 0;
    }

    if (this.memory.travelTo.target
      && this.memory.travelTo.target.roomName === target.roomName 
      && this.memory.travelTo.target.x === target.x 
      && this.memory.travelTo.target.y === target.y
      && this.memory.travelTo.path
      && this.memory.travelTo.path.length > 0) {

      if (this.memory.travelTo.lastPosition 
        && this.memory.travelTo.lastPosition.x === this.pos.x
        && this.memory.travelTo.lastPosition.y === this.pos.y) {
        if (this.memory.travelTo.stuckCount && this.memory.travelTo.stuckCount > 1) {
          console.log('[' + this.room.name + '] ' + this.name + ' stuck');
          this.memory.travelTo = undefined;
          this.memory.flowStuck = undefined;
          this.moveTo(target, { reusePath: 10 });
          return;
        } else {
          if (!this.memory.travelTo.stuckCount) {
            this.memory.travelTo.stuckCount = 1;
          } else {
            this.memory.travelTo.stuckCount++;
          }
        }
      } else {
        this.memory.travelTo.stuckCount = 0;
      }

      if (this.pos.x === this.memory.travelTo.path[0].x
        && this.pos.y === this.memory.travelTo.path[0].y
        && this.room.name === this.memory.travelTo.path[0].roomName) {
        if (!this.memory.travelTo.passed) {
          this.memory.travelTo.passed = [];
        }
        this.memory.travelTo.passed.push(this.memory.travelTo.path.shift());
        while (this.memory.travelTo.passed.length > 5) { this.memory.travelTo.passed.shift(); }
      }

      this.room.visual.poly(_.filter(this.memory.travelTo.path, (pos) => pos.roomName === this.room.name), 
        {stroke: '#0f0', strokeWidth: .2, opacity: .3, lineStyle: 'dashed'});

      if (this.memory.travelTo.passed && this.memory.travelTo.passed.length > 0) {
        this.room.visual.poly(_.filter(this.memory.travelTo.passed, (pos) => pos.roomName === this.room.name), 
          {stroke: '#f00', strokeWidth: .2, opacity: .3, lineStyle: 'dashed'});
      }

      while (this.memory.travelTo.path && this.memory.travelTo.path.length > 0 
        && this.memory.travelTo.path[0].x === this.pos.x && this.memory.travelTo.path[0].y === this.pos.y) {
        this.memory.travelTo.path.shift();
      }

      var step = this.memory.travelTo.path[0];
      if (!step) { 
        console.log('[' + this.room.name + '] ' + this.name + ' No path.');
        this.memory.travelTo = {};
        this.memory.flowStuck = false;
        this.travelTo(target, { range: range });
        return;
      }

      let direction = this.pos.getDirectionTo2(step.x, step.y);
      let dx = step.x - this.pos.x;
      let dy = step.y - this.pos.y;

      if (this.pos.roomName !== step.roomName) {
        if (dx > 45) {
          dx = -1;
        } else if (dx < -45) {
          dx = 1;
        }

        if (dy > 45) {
          dy = -1;
        } else if (dy < -45) {
          dy = 1;
        }
      }

      //console.log(dx + ', ' + dy);

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        console.log('[' + this.room.name + '] ' + this.name + ' invalid step distance. (' + this.pos.x + ',' + this.pos.y + ' -> ' + step.x + ',' + step.y + ')');
        this.memory.travelTo = {};
        this.memory.flowStuck = false;
        this.travelTo(target, { range: range });
        return;
      }

      if (direction === undefined) {
        // We're on the spot...
        console.log('[' + this.room.name + '] ' + this.name + ' invalid step coords? Dir:' + dx + ',' + dy);
        this.memory.travelTo = {};
        this.memory.flowStuck = false;
        this.travelTo(target, { range: range });
        return;
      }    

      var result = this.move(direction);
      //console.log(this.name + ': ' + result);

      if (result === ERR_TIRED) {

      } else if (result < 0) {
        console.log('Pathing issue: ' + result);
        this.memory.travelTo = {};
        this.memory.flowStuck = false;
        //this.travelTo(target, range);
      } else {
        this.memory.travelTo.lastPosition = this.pos;
      }
    } else {
      let ret = PathFinder.search(
        this.pos, {pos:target,range:range},
        {
          // We need to set the defaults costs higher so that we
          // can set the road cost lower in `roomCallback`
          plainCost: 2,
          swampCost: 10,

          roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            if (!room) return;

            if (GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices[roomName]) {
              let costs = PathFinder.CostMatrix.deserialize(GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices[roomName]);
              let creeps = room.find(FIND_CREEPS);
              if (creeps.length > 0) {
                creeps.forEach(function(creep) {
                  if (creep.memory && (!creep.memory.travelledLast || !ignoreCreeps)) {
                    costs.set(creep.pos.x, creep.pos.y, 0xff);
                  }
                });
              }
              return costs;
            } else {
              return;
            }
          },
          maxOps: 512
        }
      );

      if (ret.path) {
        //console.log('Path generated in ' + ret.ops + ', Status: ' + ((ret.incomplete === true) ? 'incomplete' : 'complete'));
        if (!this.memory.travelTo) {
          this.memory.travelTo = {};
          this.memory.flowStuck = false;
        }
        this.memory.travelTo.target = target;
        this.memory.travelTo.path = ret.path;
        this.memory.travelTo.expiresOn = Game.time + Math.min(4, (ret.incomplete === true ? expiresWhenIncomplete : expiresWhenComplete));
        this.memory.travelTo.passed = [];
        if (this.memory.travelTo.path.length > 0) {
          let step = this.memory.travelTo.path[0];
          //console.log(this.name + ': ' + this.pos.x + ', ' + this.pos.y);
          //console.log(step.x + ', ' + step.y);
          //console.log('Taking first step... ' );
          this.move(this.pos.getDirectionTo2(step.x, step.y));
        }
      }
    }

  }

  Creep.prototype.fleeFrom = function(targets, range) {
    if (!range) { 
      range = 7;
    }

    targets = _.map(targets, function(t) { return { pos: (t.pos ? t.pos : t), range: range} });
    for (var i = 0; i < targets.length; i++) {
      //console.log(JSON.stringify(targets[i]));
    }

    let ret = PathFinder.search(
      this.pos, targets,
      {
        flee: true,

        // We need to set the defaults costs higher so that we
        // can set the road cost lower in `roomCallback`
        plainCost: 2,
        swampCost: 10,

        roomCallback: function(roomName) {
          let room = Game.rooms[roomName];
          if (!room) return;

          if (GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices[roomName]) {
            let costs = PathFinder.CostMatrix.deserialize(GameState.memory[GameState.constants.CARTOGRAPHY].costMatrices[roomName]);
            if (true || !ignoreCreeps) {
              let creeps = room.find(FIND_CREEPS);
              if (creeps.length > 0) {
                creeps.forEach(function(creep) {
                  if (creep.memory && !creep.memory.travelledLast) {
                    costs.set(creep.pos.x, creep.pos.y, 0xff);
                  }
                });
              }
            }
            return costs;
          } else {
            return;
          }
        },
        maxOps: 512
      }
    );

    if (ret.path) {
      let step = ret.path[0];
      this.move(this.pos.getDirectionTo2(step.x, step.y));
    }

  }

  Creep.prototype.goUpgrade = function() {
    if (this.room.name !== this.memory.origin) {
      this.memory.returnToOrigin = true;
    } else {
      let controller = Game.rooms[this.memory.origin].controller;

      let sources = controller.pos.findInRange(FIND_STRUCTURES, 4, { filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER 
          || s.structureType === STRUCTURE_STORAGE 
          || s.structureType === STRUCTURE_LINK
      });

      if (sources.length > 0) {
        let idealPositions = [];
        this.room.memory.upgradeSweetSpots = undefined;

        if (this.room.memory.upgradeSweetSpots) {
          idealPositions = JSON.parse(this.room.memory.upgradeSweetSpots);
          //console.log(this.room.name + ', ' + 'yay');
        } else {
          let idealSources = _.filter(sources, (s) => s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK);
          if (idealSources.length > 0)  {
            if (!this.room.memory.sweetUpgrades) {
              this.room.memory.sweetUpgrades = idealSources[0].id;
            }
          }
          let minX = _.min(sources.concat(controller), function(s) { return s.pos.x }).pos.x - 1;
          let minY = _.min(sources.concat(controller), function(s) { return s.pos.y }).pos.y - 1;
          let maxX = _.max(sources.concat(controller), function(s) { return s.pos.x }).pos.x + 1;
          let maxY = _.max(sources.concat(controller), function(s) { return s.pos.y }).pos.y + 1;

          for(let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              let pos = this.room.getPositionAt(x, y);
              if (pos.isPathable(true)
                && pos.getRangeTo(controller) <= 3 
                && pos.getRangeTo(pos.findClosestByRange(sources)) <= 1) {
                idealPositions.push({ x: x, y: y, roomName: this.room.name });
                this.room.visual.text('x', x, y);
              }
            }
          }
          this.room.memory.upgradeSweetSpots = JSON.stringify(idealPositions);
        }

        if (this.pos.getRangeTo(controller) <= 3) {
          this.upgradeController(controller);
        }

        if (this.room.memory.sweetUpgrades) {
          let container = Game.getObjectById(this.room.memory.sweetUpgrades);
          if (container && this.pos.getRangeTo(container) <= 1) {
            this.withdraw(container, RESOURCE_ENERGY);
          }
        }
        let creep = this;

        idealPositions = _.filter(
          _.map(idealPositions, function(pos) { 
            return creep.room.getPositionAt(pos.x, pos.y);
          })
          , (pos) => pos.isPathable());;

        let idealSpotsWeOccupy = _.filter(idealPositions, function(pos) { 
          //console.log('wtf: ' + JSON.stringify(pos));
          return pos.x === creep.pos.x 
          && pos.y === creep.pos.y 
          && pos.roomName === creep.pos.roomName;
        }); 

        if (idealSpotsWeOccupy.length <= 0 && idealPositions.length > 0) {
          //console.log(JSON.stringify(idealPositions[0]));
          let roomPos = Game.rooms[idealPositions[0].roomName].getPositionAt(idealPositions[0].x, idealPositions[0].y);
          //console.log(JSON.stringify(roomPos));
          this.travelTo(roomPos, {range: 0});
        }
      } else {
        if (this.upgradeController(controller) === ERR_NOT_IN_RANGE) {
          this.travelTo(controller, {range: 3, ignoreCreeps: false });
        } else {
          if (this.pos.getRangeTo(controller) > 1) {
            this.move(this.pos.getDirectionTo2(controller.pos.x, controller.pos.y));
          }
        }
      }
    }
  }

  Creep.prototype.goReinforce = function() {
    if (!this.memory.reinforcing) {
      let walls = Game.rooms[this.memory.origin].find(FIND_STRUCTURES, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_WALL
            || object.structureType === STRUCTURE_RAMPART)
            && object.hits > 0 && object.my;
        }
      });

      let creep = this;
      walls.sort((a,b) => (a.hits !== b.hits) ? a.hits - b.hits : a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));

      for(var i = 0; i < walls.length; i++) {
        if (this.pos.getRangeTo(walls[i]) <= 1) {
          return walls[i];
        } else {
          target = this.pos.findClosestByPath([walls[i]]);
          if (target) { return target; }
        }
      }

      if (target) {
        creep.memory.reinforcing = target.id
      }
    }
    
    if (creep.memory.reinforcing) {
      let target = Game.getObjectById(creep.memory.reinforcing);
      if (creep.repair(target) === ERR_NOT_IN_RANGE) {
        creep.travelTo(target, { range: 3 });
      }
      return true;
    }
    return false;
  }

  Creep.prototype.tryToPickUp = function(includeResources, fromLinks) {
    let result = -1;

    let creep = this;
    let target = this.pos.findClosestByRange(FIND_DROPPED_ENERGY, { filter: function(d) {
      return (d.amount > 50 && d.pos.getRangeTo(creep) <= 1);
    }});

    if (target) {
      result = this.pickup(target);
    }

    if (result < 0) {
      let container = this.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER 
              || structure.structureType === STRUCTURE_STORAGE
              || (fromLinks && structure.structureType === STRUCTURE_LINK))
            && ((structure.store && structure.store[RESOURCE_ENERGY] > 0) || (structure.energy && structure.energy > 0))
            || (includeResources && _.sum(structure.store) > 0));
        }
      });
      if (container) {
        if (this.withdraw(container, (includeResources ? RESOURCES_ALL : RESOURCE_ENERGY))) {
          return true;
        }
      }
    } else {
      return true
    }

    return false;
  }

  Creep.prototype.goHarvest = function() {
    let creep = this;
    let rooms = _.filter(Game.rooms, 
      (r) => Room.getType(r.name) !== 'SourceKeeper' 
      || _.filter(Game.creeps, (c) => c.memory.roleSpecificFlag 
        && Game.flags[c.memory.roleSpecificFlag].pos.roomName === r.name
        ).length > 0);

    let inSafeRoom = false;

    rooms.forEach((r) => inSafeRoom = inSafeRoom || r.name === creep.room.name);

    if (!inSafeRoom) {
      console.log("IT'S NOT SAFE HERE!");
      rooms.sort((a,b) => Game.map.getRoomLinearDistance(a.name, creep.room.name) - Game.map.getRoomLinearDistance(b.name, creep.room.name));
      console.log(rooms[0].name);
      if (!this.flowTo(rooms[0].name)) {
        console.log("uh oh");
      }
    } else {
      //choose the source node
      let closestDroppedEnergy = this.pos.findClosestByPath(FIND_DROPPED_ENERGY, { filter : (e) => 
        (((e.amount * 10) / Math.pow(e.pos.getRangeTo(this), 2)) > 7 && e.amount >= 100)
      });

      if (closestDroppedEnergy) {
        if (this.pickup(closestDroppedEnergy) == ERR_NOT_IN_RANGE) {
          this.travelTo(closestDroppedEnergy, { range: 1 });
        }
      } else {
        if (!this.memory.targetEnergyHarvestId) {
          let sources = this.room.find(FIND_SOURCES, { filter: (s) => s.energy > 0 });
          if (sources.length > 0 && this.pos.findClosestByPath(sources)) {
            this.memory.targetEnergyHarvestId = this.pos.findClosestByPath(sources).id;      
          } else {
            this.say("Lost!");
          }
        }

        let containers = this.room.find(FIND_STRUCTURES, { maxOps: 2, filter: { structureType: STRUCTURE_CONTAINER }});
        let container = this.pos.findClosestByRange(containers, 1);
        if (container) {
          this.withdraw(container, RESOURCE_ENERGY);
          if (this.carry.energy == this.carryCapacity) {
            // "oh what a lovely surprise"
            return;
          }
        }

        // attempt to go mine it
        if(this.harvest(Game.getObjectById(this.memory.targetEnergyHarvestId)) == ERR_NOT_IN_RANGE) {
          this.travelTo(Game.getObjectById(this.memory.targetEnergyHarvestId), {range: 1});
        } else {
          // We're here!
          this.memory.targetEnergyHarvestId = null;
        }
      }  
    }    
  }

  Creep.prototype.goGetEnergy = function(forbidContainers, forbidDroppedEnergy) {
    //choose the source node
    let closestDroppedEnergy = this.pos.findClosestByRange(FIND_DROPPED_ENERGY, { filter : (e) => 
      (e.amount / Math.pow(e.pos.getRangeTo(this), 2)) > 7 
      && e.amount >= Math.max(200, this.carryCapacity)
      && e.resourceType === RESOURCE_ENERGY
    });

    if (!forbidDroppedEnergy && closestDroppedEnergy) {
      
      if (this.pickup(closestDroppedEnergy) == ERR_NOT_IN_RANGE) {
        this.travelTo(closestDroppedEnergy, { range: 1 });

        let container = this.pos.findClosestByRange(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_CONTAINER } });
        if (!forbidContainers && container) {
          this.withdraw(container, RESOURCE_ENERGY);
        }
      }
    } else {
      let container = this.pos.findClosestByRange(FIND_STRUCTURES, { 
        filter: (structure) => {
          return (((!forbidContainers && structure.structureType == STRUCTURE_CONTAINER) 
            || structure.structureType == STRUCTURE_STORAGE)
            && structure.store[RESOURCE_ENERGY] > this.carryCapacity);
        }
      });

      if (container) {
        if (this.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          this.travelTo(container, { range: 1 });
          let creep = this;
          let closestDroppedEnergy = this.pos.findClosestByRange(FIND_DROPPED_ENERGY, { filter : (e) => 
            creep.pos.getRangeTo(e) <= 1 && e.resourceType === RESOURCE_ENERGY && e.amount > 1
          });
          if (closestDroppedEnergy) {
            this.pickup(closestDroppedEnergy);
          }
        }
        
      } else {

        let container = this.pos.findClosestByRange(FIND_STRUCTURES, { 
          filter: (structure) => {
            return (structure.structureType == STRUCTURE_TERMINAL
              && structure.store[RESOURCE_ENERGY] > this.carryCapacity);
          }
        });

        if (container) {
          if (this.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.travelTo(container, { range: 1 });
            let creep = this;
            let closestDroppedEnergy = this.pos.findClosestByRange(FIND_DROPPED_ENERGY, { filter : (e) => 
              creep.pos.getRangeTo(e) <= 1 && e.resourceType === RESOURCE_ENERGY && e.amount > 1
            });
            if (closestDroppedEnergy) {
              this.pickup(closestDroppedEnergy);
            }
          }          
        } else {
          
          this.goHarvest();
        }
      }
    }
  }

  Creep.prototype.goConstruct = function() {
    let targets = this.room.find(FIND_CONSTRUCTION_SITES); 

    if(targets.length) {
      let target = this.pos.findClosestByPath(targets);
      if(this.build(target) == ERR_NOT_IN_RANGE) {
        this.travelTo(target, { range: 3 });
        //{visualizePathStyle: {stroke: '#ffffff'}}
      }
      return true;
    } else {
      return false;
    }
  }

  Creep.prototype.reserveRoleSpecificFlag = function(availableFlags) {
    if (!this.memory.roleSpecificFlag) {
      let unreservedFlags = [];

      let allOtherCreeps = _.filter(Game.creeps, 
        (c) => c.memory.role === this.memory.role 
            && c.id !== this.id
            && c.memory.origin == this.memory.origin 
            && c.memory.roleSpecificFlag);

      for (let i = 0; i < availableFlags.length; i++) {
        let flag = availableFlags[i];
        let unreserved = true;
        for (let j = 0; j < allOtherCreeps.length; j++) {
          if (allOtherCreeps[j].memory.roleSpecificFlag === flag) {
            unreserved = false;
          }
        }
        if (unreserved) {
          unreservedFlags.push(flag);
        }
      }
      if (unreservedFlags.length > 0) {
        this.memory.roleSpecificFlag = unreservedFlags[0];;
      }
    }
  }

  RoomPosition.prototype.getCombatTarget = function() {
    let target;

    // Kill healers
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: function(object) {
          return object.getActiveBodyparts(HEAL) > 0 
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then melee attackers
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: function(object) {
          return object.getActiveBodyparts(ATTACK) > 0
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then ranged attackers
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: function(object) {
          return object.getActiveBodyparts(RANGED_ATTACK) > 0
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then workers?
    if (!target) {
      target = this.findClosestByRange(FIND_HOSTILE_CREEPS, {
        filter: function(object) {
          return object.getActiveBodyparts(WORK) > 0
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then towers
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_TOWER || object.structureType === STRUCTURE_SPAWN)
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then any normal this.
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: function(object) {
          return -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then not-walls
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: function(object) {
          return object.structureType !== STRUCTURE_WALL
            && object.structureType !== STRUCTURE_RAMPART 
            && object.hits > 0
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_CONSTRUCTION_SITES, {
        filter: function(object) {
          return -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then, finally, walls
    if (!target) {
      target = this.findClosestByPath(FIND_STRUCTURES, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_WALL
            || object.structureType === STRUCTURE_RAMPART)
            && object.hits > 0 && !object.my
            && (!object.owner || -1 === GameState.allies.indexOf(object.owner.username));
        }
      });
    }
    
    return target;
  }

  Creep.prototype.goFight = function() {
    let target = this.pos.getCombatTarget();
    if (!target) {
      return false;
    } else {
      if (target instanceof ConstructionSite) {
        if (this.attack(this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
          filter: function(object) {
            return 0 > GameState.allies.indexOf(object.owner.username);
          }
        })) == ERR_NOT_IN_RANGE) {
          this.attack(this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
            filter: function(object) {
              return object.hits > 0 && 0 > GameState.allies.indexOf(object.owner.username);
            }
          }));
        }
        this.moveTo(target);
      } else {
        if(this.attack(target) == ERR_NOT_IN_RANGE) {
          if (this.attack(this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
            filter: function(object) {
              return 0 > GameState.allies.indexOf(object.owner.username);
            }
          })) == ERR_NOT_IN_RANGE) {
            this.attack(this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
              filter: function(object) {
                return object.hits > 0 && 0 > GameState.allies.indexOf(object.owner.username);
              }
            }));
          }
          this.moveTo(target);
        }
      }
      return true;
    }
  }

  RoomPosition.prototype.getDismantleTarget = function() {
    let target;

    // Then towers
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: function(object) {
          return object.structureType === STRUCTURE_SPAWN //STRUCTURE_TOWER 
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then not-walls
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: function(object) {
          return object.structureType !== STRUCTURE_WALL
            && object.structureType !== STRUCTURE_RAMPART 
            && object.hits > 0
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_CONSTRUCTION_SITES, {
        filter: function(object) {
          return -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then, finally, walls
    if (!target) {
      let walls = this.findInRange(FIND_STRUCTURES, 7, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_WALL
            || object.structureType === STRUCTURE_RAMPART)
            && object.hits > 0 && !object.my
            && (!object.owner || -1 === GameState.allies.indexOf(object.owner.username));
        }
      });

      let creep = this;
      walls.sort((a,b) => (a.hits !== b.hits) ? a.hits - b.hits : a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));

      for(var i = 0; i < walls.length; i++) {
        if (this.getRangeTo(walls[i]) <= 1) {
          return walls[i];
        } else {
          target = this.findClosestByPath([walls[i]]);
          if (target) { return target; }
        }
      }
    }

    // Then, finally, walls
    if (!target) {
      let walls = this.findInRange(FIND_STRUCTURES, 20, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_WALL
            || object.structureType === STRUCTURE_RAMPART)
            && object.hits > 0 && !object.my
            && (!object.owner || -1 === GameState.allies.indexOf(object.owner.username));
        }
      });
      target = this.findClosestByPath(walls);
    }
    
    return target;
  }

  Creep.prototype.goDismantle = function() {
    let target = this.pos.getDismantleTarget();
    if (!target) {
      return false;
    } else {
      if (target instanceof ConstructionSite) {
        this.moveTo(target, {range: 0});
      } else {
        if(this.dismantle(target) == ERR_NOT_IN_RANGE) {
          this.moveTo(target, { range: 1 });
        }
      }
      return true;
    }
  }

  Creep.prototype.friendlyRangedHeal = function() {
    let target;

    if (!target) {
      target = this.pos.findClosestByPath(FIND_MY_CREEPS);
    }

    if (this.heal(target) == ERR_NOT_IN_RANGE) {
      if (this.rangedHeal(target) == ERR_NOT_IN_RANGE) {
        this.moveTo(target);
      }
    }
  }
}
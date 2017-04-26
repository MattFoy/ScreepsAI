let utilities = require('utilities');
require('prototypes.roomPosition')();
require('prototypes.room')();

module.exports = function() {
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

    if (ret.path && ret.path.length > 0) {
      let step = ret.path[0];
      this.move(this.pos.getDirectionTo2(step.x, step.y));
    }

  }

  Creep.prototype.isBoosted = function(part) {
    for (var i = 0; i < this.body.length; i++) {
      if ((!part || this.body[i].type === part)
        && this.body[i].boost !== undefined) {
        return true;
      }
    }
    return false;
  }

  Creep.prototype.goUpgrade = function() {
    function basicUpgrade(creep) {
      let controller = Game.rooms[creep.memory.origin].controller;
      creep.memory.inUpgradeSweetSpot = false;
      let ignoreCreeps = true;
      if (creep.room.name === creep.memory.origin && creep.pos.getRangeTo(controller) < 4) {
        ignoreCreeps = false;
      }
      if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
        creep.travelTo(controller, { range: 3, ignoreCreeps: ignoreCreeps });
      } else {
        if (creep.pos.getRangeTo(controller) > 1) {
          creep.move(creep.pos.getDirectionTo2(controller.pos.x, controller.pos.y));
        }
      }
    }

    if (this.room.name !== this.memory.origin) {
      this.memory.returnToOrigin = true;
    } else {
      let controller = Game.rooms[this.memory.origin].controller;

      let idealPositions = [];
      if (this.room.memory.sweetUpgrades) {
        try {
          idealPositions = JSON.parse(this.room.memory.upgradeSweetSpots);
        } catch (e) { }
      }

      if (idealPositions.length && idealPositions.length > 0) {
        if (this.pos.getRangeTo(controller) <= 3) {
          this.upgradeController(controller);
        }

        if (this.room.memory.sweetUpgrades 
          && this.carry[RESOURCE_ENERGY] < _.filter(this.body, (b) => b.type === WORK).length) {
          let container = Game.getObjectById(this.room.memory.sweetUpgrades);
          if (container && this.pos.getRangeTo(container) <= 1) {
            this.withdraw(container, RESOURCE_ENERGY);
          }
        }
        if (this.memory.inUpgradeSweetSpot) {
          this.upgradeController(controller);
        } else {
          let creep = this;

          idealPositions = _.filter(
            _.map(idealPositions, function(pos) { 
              return creep.room.getPositionAt(pos.x, pos.y);
            })
            , (pos) => pos.isPathable(false, creep));

          let idealSpotsWeOccupy = _.filter(idealPositions, function(pos) { 
            //console.log('wtf: ' + JSON.stringify(pos));
            return pos.getRangeTo(creep) === 0;
          }); 
          
          if (idealSpotsWeOccupy.length >= 1 && idealPositions.length > 0) {
              this.memory.inUpgradeSweetSpot = true;
              this.upgradeController(controller);
          } else if (idealSpotsWeOccupy.length <= 0 && idealPositions.length > 0) {
            //console.log(JSON.stringify(idealPositions[0]));
            let idealRoomPositions = _.map(idealPositions, (iPos) => 
              Game.rooms[iPos.roomName].getPositionAt(iPos.x, iPos.y));
            let roomPos = this.pos.findClosestByPath(idealRoomPositions);
            if (roomPos) {
              this.travelTo(roomPos, {range: 0, ignoreCreeps: true});
            } else {
              basicUpgrade(this)
            }
          } else {
            basicUpgrade(this);
          }
        }
      } else {
        basicUpgrade(this);
      }
    }
  }

  Creep.prototype.goReinforce = function() {
    if (this.memory.reinforce 
      && this.memory.reinforce.time 
      && this.memory.reinforce.time - Game.time > 1) {
      delete this.memory.reinforce;
    }

    if (!this.memory.reinforce) {
      this.memory.reinforce = {};
      this.memory.reinforce.time = Game.time;
    }

    if (!this.memory.reinforce.targetID) {
      let walls = Game.rooms[this.memory.origin].find(FIND_STRUCTURES, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_WALL
            || object.structureType === STRUCTURE_RAMPART)
            && object.hits > 0 && object.hits < object.hitsMax;
        }
      });

      let creep = this;
      walls.sort((a,b) => (a.hits !== b.hits) 
        ? a.hits - b.hits 
        : a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
      if (walls.length > 0) {
        this.memory.reinforce.targetID = walls[0].id
      } else {
        console.log("No walls to reinforce?");
      }
    }
    
    if (this.memory.reinforce.targetID) {
      let target = Game.getObjectById(this.memory.reinforce.targetID);
      if (this.repair(target) === ERR_NOT_IN_RANGE) {
        this.travelTo(target, { range: 3 });
      } else {
        this.getOutOfTheWay(target);
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
      (r) => Room.getType(r.name) !== 'Highway' && (Room.getType(r.name) !== 'SourceKeeper' 
      || _.filter(Game.creeps, (c) => c.memory.roleSpecificFlag 
        && Game.flags[c.memory.roleSpecificFlag].pos.roomName === r.name
        ).length > 0));

    let inSafeRoom = false;

    rooms.forEach((r) => inSafeRoom = inSafeRoom || r.name === creep.room.name);

    if (!inSafeRoom) {
      console.log("IT'S NOT SAFE HERE!");
      rooms.sort((a,b) => Game.map.getRoomLinearDistance(a.name, creep.room.name) - Game.map.getRoomLinearDistance(b.name, creep.room.name));
      if (rooms[0].controller) {
        this.travelTo(rooms[0].controller);
      } else {

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
            if (this.room.name !== this.memory.origin) {
              //this.memory.returnToOrigin = true;
              this.travelTo(Game.rooms[this.memory.origin].controller, {range: 1});
            }
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
          return (object.structureType === STRUCTURE_TOWER)
            && -1 === GameState.allies.indexOf(object.owner.username);
        }
      });
    }

    // Then towers
    if (!target) {
      target = this.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
        filter: function(object) {
          return (object.structureType === STRUCTURE_SPAWN)
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
        }
        this.moveTo(target);
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
      _.filter(walls, (w) => w.pos.getRangeTo(this) < 10);

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

  Creep.prototype.getOutOfTheWay = function(target) {
    if (target) {
      // we want to stay withing 3 tiles of the target, while being off the road
      if (this.pos.lookFor(LOOK_STRUCTURES).length > 0) {
        let safeSpots = [];
        for (var x = Math.max(1, target.pos.x - 3); x <= Math.min(48, target.pos.x + 3); x++) {
          for (var y = Math.max(1, target.pos.y - 3); y <= Math.min(48, target.pos.y + 3); y++) {
            let pos = this.room.getPositionAt(x, y);
            if (pos.lookFor(LOOK_STRUCTURES).length === 0 && pos.isPathable()) {
              //this.room.visual.text('o', pos);
              safeSpots.push(pos);
              if (pos.getRangeTo(this) <= 1) {
                this.moveTo(pos);
                return;
              }
            }
          }
        }
        if (safeSpots.length > 0) {
          this.moveTo(this.pos.findClosestByPath(safeSpots));
          return;
        }
      }
    } else {
      this.say('Zzz', true);
      if (this.pos.lookFor(LOOK_STRUCTURES).length > 0) {
        this.fleeFrom(this.room.find(FIND_STRUCTURES), 1); 
      }
    }
  }
}
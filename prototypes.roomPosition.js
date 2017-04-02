module.exports = function() {
  RoomPosition.prototype.equals = function(pos) {
    return (this.x === pos.x
      && this.y === pos.y
      && this.roomName === pos.roomName);
  }

  RoomPosition.prototype.getDirectionTo2 = function(x, y) {
    let dx = x - this.x;
    let dy = y - this.y;

    if (dx === 49) {
      dx = -1;
    } else if (dx === -49) {
      dx = 1;
    }

    if (dy === 49) {
      dy = -1;
    } else if (dy === -49) {
      dy = 1;
    }

    if (dx < 0 && dy < 0) {
      return TOP_LEFT;
    } else if (dx === 0 && dy < 0) {
      return TOP;
    } else if (dx > 0 && dy < 0) {
      return TOP_RIGHT;
    } else if (dx < 0 && dy === 0) {
      return LEFT;
    } else if (dx > 0 && dy === 0) {
      return RIGHT;
    } else if (dx < 0 && dy > 0) {
      return BOTTOM_LEFT;
    } else if (dx === 0 && dy > 0) {
      return BOTTOM;
    } else if (dx > 0 && dy > 0) {
      return BOTTOM_RIGHT;
    } else {
      return undefined;
    }
  }

  RoomPosition.prototype.getDirectionOfTravel = function(target) {
    //console.log(this)
    //console.log(target);

    let currentRoom = this.roomName;

    let ret = PathFinder.search(
      this, target,
      {
        // We need to set the defaults costs higher so that we
        // can set the road cost lower in `roomCallback`
        maxRooms: 1,
        plainCost: 2,
        swampCost: 10,

        roomCallback: function(roomName) {
          //console.log(roomName)
          //console.log(currentRoom)
          if (roomName !== currentRoom) { return false; }

          let room = Game.rooms[roomName];
          
          if (!room) {
            console.log('invalid room: ' + roomName);
            return;
          }

          let costs = new PathFinder.CostMatrix;

          room.find(FIND_STRUCTURES).forEach(function(structure) {
            //console.log(structure.structureType);
            if (structure.structureType === STRUCTURE_ROAD) {
              // Favor roads over plain tiles
              costs.set(structure.pos.x, structure.pos.y, 1);
            } else if (structure.structureType !== STRUCTURE_CONTAINER && 
              (structure.structureType !== STRUCTURE_RAMPART || !structure.my)) {
              // Can't walk through non-walkable buildings
              costs.set(structure.pos.x, structure.pos.y, 0xff);
            }
          });
          
          return costs;
        },
        maxOps: 512
      }
    );
    //console.log(JSON.stringify(ret))
    if (ret.path.length > 0) {
      //console.log(ret.ops + ', ' + this.x + ',' + this.y + ' -> ' + ret.path[0].x + ',' + ret.path[0].y)
      if (ret.incomplete) {
        return this.getDirectionTo2(ret.path[0].x, ret.path[0].y);;
      } else {
        return this.getDirectionTo2(ret.path[0].x, ret.path[0].y);
      }
    } else {
      
      return undefined;
    }
  }

  RoomPosition.prototype.isPathable = function(ignoreCreeps, creep) {
    let pathable = true;
    if (creep && creep.pos.x === this.x && creep.pos.y === this.y && creep.room.name === this.roomName) {
      return true;
    }
    this.look().forEach(function(o) {
      if ( (! ignoreCreeps && o.type === 'creep') 
        || (o.type === 'terrain' 
          && o.terrain === 'wall')
        || (o.type === 'structure' 
          && OBSTACLE_OBJECT_TYPES.indexOf(o.structure.structureType) > -1)) {
        pathable = false;
      }
    });
    //console.log('[' + this.roomName + '] ' + this.x + ',' + this.y + ': ' + JSON.stringify(pathable));
    return pathable;
  }
}
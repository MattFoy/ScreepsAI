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

  RoomPosition.prototype.isPathable = function(ignoreCreeps, creep) {
    let pathable = true;
    if (creep && creep.pos.x === this.x && creep.pos.y === this.y && creep.room.name === this.roomName) {
      return true;
    }
    this.look().forEach(function(o) {
      if ((!ignoreCreeps && o.type === 'creep') 
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
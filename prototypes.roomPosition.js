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

  RoomPosition.prototype.getTowerDamage = function() {
    let room = Game.rooms[this.roomName];
    let towers = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });

    let towerDamage = 0;
    for (var i = 0; i < towers.length; i++) {
      let tower = towers[i];
      let distance = this.getRangeTo(tower);
      //console.log('distance: ' + distance);
      let damage = 0;
      if (distance <= TOWER_OPTIMAL_RANGE) {
        damage = TOWER_POWER_ATTACK;
      } else if (distance >= TOWER_FALLOFF_RANGE) {
        damage = TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF);
      } else {
        damage = TOWER_POWER_ATTACK * 
          (1 - ((distance - TOWER_OPTIMAL_RANGE) 
          * (TOWER_FALLOFF / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE))));
      }
      //console.log('Damage: ' + damage);
      towerDamage += damage;
    }
    //console.log('Total: ' + towerDamage);
    return towerDamage;
  }

  RoomPosition.prototype.getRangeTo2 = function(target) {
    if (target.pos) { target = target.pos; }

    if (this.roomName === target.roomName) {
      if (this.x === target.x && this.y === target.y) {
        return 0;
      } else {
        let distance = Math.max(Math.abs(this.x - target.x), Math.abs(this.y - target.y));
        //console.log('distance: ' + distance)
        return distance;
      }
      //return this.getRangeTo(target);
    } else {
      let exits = Game.map.describeExits(this.roomName);
      let x1 = this.x;
      let y1 = this.y;
      let x2, y2;
      if (target.roomName === exits[TOP]) {
        x2 = target.x;
        y2 = target.y - 50;
      } else if (target.roomName === exits[BOTTOM]) { 
        x2 = target.x;
        y2 = target.y + 50;
      } else if (target.roomName === exits[LEFT]) { 
        x2 = target.x - 50;
        y2 = target.y;
      } else if (target.roomName === exits[RIGHT]) { 
        x2 = target.x + 50;
        y2 = target.y;
      } else {
        return Infinity;
      }

      return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    }
  }
}
module.exports = function() {
  Flag.prototype.getTravelCostTo = function(target) {
    let ret = PathFinder.search(
      this.pos, {pos:target,range:2},
      {
        // We need to set the defaults costs higher so that we
        // can set the road cost lower in `roomCallback`
        plainCost: 2,
        swampCost: 10,

        roomCallback: function(roomName) {

        let room = Game.rooms[roomName];
        // In this example `room` will always exist, but since PathFinder 
        // supports searches which span multiple rooms you should be careful!
          if (!room) return;
          let costs = new PathFinder.CostMatrix;

          room.find(FIND_STRUCTURES).forEach(function(structure) {
            if (structure.structureType === STRUCTURE_ROAD) {
              // Favor roads over plain tiles
              costs.set(structure.pos.x, structure.pos.y, 1);
            } else if (structure.structureType !== STRUCTURE_CONTAINER && 
              (structure.structureType !== STRUCTURE_RAMPART || !structure.my)) {
              // Can't walk through non-walkable buildings
              costs.set(structure.pos.x, structure.pos.y, 0xff);
            }
          });
          /*
          // Avoid creeps in the room
          room.find(FIND_CREEPS).forEach(function(creep) {
            costs.set(creep.pos.x, creep.pos.y, 0xff);
          });
          */

          return costs;
        },
        maxOps: 2046
      }
    );

    //console.log('Crunched! ' + (ret.ops) + ' ' + (ret.incomplete ? 'y' : 'n'));
    return ret.cost;
  }
}
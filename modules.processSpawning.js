const profiler = require('screeps-profiler');
const roles = require('roles');
function processSpawning(room) {
  let creepsInRoom = _.filter(Game.creeps, (c) => c.memory.origin === room.name)
  let rolesInRoom = _.groupBy(creepsInRoom, function(c) { return c.memory.role });  
  var spawnQueue = [];

  for (let roleName in roles) {
    if (roles[roleName].spawnType === 'global') {
      if (roles[roleName].spawnCondition(room)) {
        spawnQueue.push(roles[roleName].determineSpawnParams(room));
      }
    } else if (roles[roleName].spawnType === 'quota') {
      let count = (rolesInRoom[roleName] ? 
        _.filter(rolesInRoom[roleName], (c) => !c.ticksToLive 
          || !c.memory.replaceBefore 
          || c.ticksToLive > c.memory.replaceBefore
        ).length 
        : 0);
      let quota = roles[roleName].getQuota(room, rolesInRoom);
      if (count < quota) {
        let body = roles[roleName].determineBodyParts(room, rolesInRoom);
        spawnQueue.push({ memory: {origin: room.name, role: roleName}, body: body });
      }
    } else if (roles[roleName].spawnType === 'reservation') {
      let reserve = room.getUnreservedReservable(roleName, roles[roleName].reservableFilter);
      if (reserve) {
        let body = roles[roleName].determineBodyParts(room, reserve);
        spawnQueue.push({ memory: {origin: room.name, role: roleName, roleSpecificFlag: reserve}, body: body });
      }
    }
  }  
  spawnQueue.sort((a,b) => (roles[a.memory.role].determinePriority ? roles[a.memory.role].determinePriority(room, rolesInRoom) : 100)
          - (roles[b.memory.role].determinePriority ? roles[b.memory.role].determinePriority(room, rolesInRoom) : 100));
  
  _.filter(Game.spawns, (s) => (s.pos.roomName === room.name)).forEach(function(spawn) {
    if (!spawn.spawning && spawnQueue.length > 0) {
      let params = spawnQueue.shift();
      let newName = spawn.createCreep(params.body, params.name, params.memory);
      if (newName < 0) { 
        spawnQueue.unshift(params);
      } else {
        if (params.spawnCallback) { params.spawnCallback(newName); }
      }
    }
  });
}
processSpawning = profiler.registerFN(processSpawning, 'processSpawning');
module.exports = processSpawning;
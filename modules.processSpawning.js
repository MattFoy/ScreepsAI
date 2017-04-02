const profiler = require('screeps-profiler');
const roles = require('roles');

function processSpawning(room) {

  let creepsInRoom = _.filter(Game.creeps, (c) => c.memory.origin === room.name)
  let rolesInRoom = _.groupBy(creepsInRoom, function(c) { return c.memory.role });
  
  let roomStatusReport = ''

  var spawnQueue = [];

  let r = 1;
  roles.spawnPriority.forEach(function (roleName) {
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
      //console.log(roleName + ': ' + count);
      let quota = roles[roleName].getQuota(room, rolesInRoom);
      if (count < quota) {
        let body = roles[roleName].determineBodyParts(room);
        spawnQueue.push({ memory: {origin: room.name, role: roleName}, body: body });
      }
    } else if (roles[roleName].spawnType === 'reservation') {
      let reserve = room.getUnreservedReservable(roleName, roles[roleName].reservableFilter);
      if (reserve) {
        //console.log('Reserve: ' + reserve);
        let body = roles[roleName].determineBodyParts(room, reserve);
        spawnQueue.push({ memory: {origin: room.name, role: roleName, roleSpecificFlag: reserve}, body: body });
      }
    }

    let count = 0;
    let ticksToLive = '~';
    let style = "font-weight:bold;color:white";

    if (rolesInRoom[roleName]) {
      ticksToLive = _.min(rolesInRoom[roleName], 'ticksToLive').ticksToLive;
      if (!ticksToLive) { ticksToLive = ' * '; }
      count = rolesInRoom[roleName].length;
      style = "font-weight:bold;color:green";
    }

    if (_.filter(spawnQueue, (q) => q.memory.role === roleName).length > 0) {
      style = "font-weight:bold;color:orange";
    }

    roomStatusReport += roleName + '(<span style="' + style + '">' 
      + count + '</span> [<em>' + ticksToLive + '</em>]), ';
    if (r++ % 8 == 0) { roomStatusReport += '\n' }
  });
  spawnQueue.sort((a,b) => (roles[a.memory.role].determinePriority ? roles[a.memory.role].determinePriority(room, rolesInRoom) : 100)
          - (roles[b.memory.role].determinePriority ? roles[b.memory.role].determinePriority(room, rolesInRoom) : 100));
  GameState.verbose && console.log(roomStatusReport);
  GameState.verbose && console.log('Queue: ' + (spawnQueue.length > 0 ? _.reduce(_.map(spawnQueue, (q) => q.memory.role), (memo,role) => memo + ', ' + role) : '(empty)'));
  

  room.find(FIND_MY_SPAWNS, (s) => (s.pos.roomName === room.name)).forEach(function(spawn) {
    //console.log(spawn.name);
    if (spawn.spawning) {
      GameState.verbose && console.log(' `--> Spawning a ' + Game.creeps[spawn.spawning.name].memory.role 
          + ' in ' + spawn.spawning.remainingTime + ' ticks.');
    } else {
      if (spawnQueue.length > 0) {
        let params = spawnQueue.shift();
        let newName = spawn.createCreep(params.body, params.name, params.memory);
        if (newName < 0) { 
          spawnQueue.unshift(params);
          GameState.verbose && console.log(' `--> Soon spawning new ' + params.memory.role);
        } else {
          GameState.verbose && console.log(' `--> Spawning new ' + params.memory.role + ': ' + newName);
          if (params.spawnCallback) { params.spawnCallback(newName); }
        }
      }
    }
  });
}

processSpawning = profiler.registerFN(processSpawning, 'processSpawning');

module.exports = processSpawning;
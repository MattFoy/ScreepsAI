var roles = {}

roles['remoteDefender'] = require('roles.remoteDefender');

// The schleppers
roles['bellhop'] = require('roles.bellhop');
roles['labourer'] = require('roles.labourer');

// The CLAIMers
roles['roomReserver'] = require('roles.roomReserver');
roles['roomClaimer'] = require('roles.roomClaimer');

// The core economy generators
roles['upgrader'] = require('roles.upgrader');
roles['builder'] = require('roles.builder');
roles['miner'] = require('roles.miner');
roles['smartHauler'] = require('roles.smartHauler');
roles['mineralExtractor'] = require('roles.mineralExtractor');

roles['trucker'] = require('roles.trucker');

// The venturers and combatants
roles['scout'] = require('roles.scout');
roles['squaddie'] = require('roles.squaddie');

roles['skGuard'] = require('roles.skGuard');
roles['medicSentry'] = require('roles.medicSentry');
roles['rangedSentry'] = require('roles.rangedSentry');
roles['skSentry'] = require('roles.skSentry');

roles['chemist'] = require('roles.chemist');

roles['suicide'] = require('roles.suicide');

module.exports = roles;
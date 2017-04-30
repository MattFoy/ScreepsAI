"use strict";
const profiler = require('screeps-profiler');

function summarize_room_internal(room) {
    if (_.isString(room)) { room = Game.rooms[room]; }
    if (room == null) { return null; }
    if (room.controller == null || !room.controller.my) { return null; }

    const controller_level = room.controller.level;
    const controller_progress = room.controller.progress;
    const controller_needed = room.controller.progressTotal;
    const controller_downgrade = room.controller.ticksToDowngrade;
    const controller_blocked = room.controller.upgradeBlocked;
    const controller_safemode = room.controller.safeMode ? room.controller.safeMode : 0;
    const controller_safemode_avail = room.controller.safeModeAvailable;
    const controller_safemode_cooldown = room.controller.safeModeCooldown;
    const has_storage = room.storage != null;
    const storage_energy = room.storage ? room.storage.store[RESOURCE_ENERGY] : 0;
    const storage_minerals = room.storage ? _.sum(room.storage.store) - storage_energy : 0;
    const energy_avail = room.energyAvailable;
    const energy_cap = room.energyCapacityAvailable;
    const containers = room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_CONTAINER });
    const num_containers = containers == null ? 0 : containers.length;
    const container_energy = _.sum(containers, c => c.store.energy);
    const sources = room.find(FIND_SOURCES);
    const num_sources = sources == null ? 0 : sources.length;
    const source_energy = _.sum(sources, s => s.energy);
    const links = room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_LINK && s.my });
    const num_links = links == null ? 0 : links.length;
    const link_energy = _.sum(links, l => l.energy);
    const minerals = room.find(FIND_MINERALS);
    const mineral = minerals && minerals.length > 0 ? minerals[0] : null;
    const mineral_type = mineral ? mineral.mineralType : "";
    const mineral_amount = mineral ? mineral.mineralAmount : 0;
    const extractors = room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_EXTRACTOR });
    const num_extractors = extractors.length;
    const creeps = _.filter(Game.creeps, c => c.memory.origin == room.name && c.my);
    const num_creeps = creeps ? creeps.length : 0;
    const enemy_creeps = room.find(FIND_HOSTILE_CREEPS);
    const creep_energy = _.sum(Game.creeps, c => c.pos.roomName == room.name ? c.carry.energy : 0);
    const num_enemies = enemy_creeps ? enemy_creeps.length : 0;
    const spawns = room.find(FIND_MY_SPAWNS);
    const num_spawns = spawns ? spawns.length : 0;
    const spawns_spawning =  _.sum(spawns, s => s.spawning ? 1 : 0);
    const towers = room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_TOWER && s.my });
    const num_towers = towers ? towers.length : 0;
    const tower_energy = _.sum(towers, t => t.energy);
    const const_sites = Memory.empire.buildQueues[room.name];
    const my_const_sites = const_sites;
    const num_construction_sites = const_sites.length;
    const num_my_construction_sites = my_const_sites.length;
    const has_terminal = room.terminal != null;
    const terminal_energy = room.terminal ? room.terminal.store[RESOURCE_ENERGY] : 0;
    const terminal_minerals = room.terminal ? room.terminal.store : {};

    if (room.terminal) {
        for (let resType in room.terminal.store) {
            if (room.terminal.store[resType]) {
                if (!Memory.stats.mineralsAvailable[resType]) {
                    Memory.stats.mineralsAvailable[resType] = room.terminal.store[resType]
                } else {
                    Memory.stats.mineralsAvailable[resType] += room.terminal.store[resType]
                }
            }
        }
    }

    if (room.storage) {
        for (let resType in room.storage.store) {
            if (room.storage.store[resType]) {
                if (!Memory.stats.mineralsAvailable[resType]) {
                    Memory.stats.mineralsAvailable[resType] = room.storage.store[resType]
                } else {
                    Memory.stats.mineralsAvailable[resType] += room.storage.store[resType]
                }
            }
        }
    }

    const structure_types = new Set(room.find(FIND_STRUCTURES).map(s => s.structureType));
    const structure_info = {};
    for (const s of structure_types) {
        const ss = room.find(FIND_STRUCTURES, {filter: str => str.structureType == s});
        structure_info[s] = {
            count: ss.length,
            min_hits: _.min(ss, 'hits').hits,
            max_hits: _.max(ss, 'hits').hits,
        };
    }

    const ground_resources = room.find(FIND_DROPPED_RESOURCES);
    const reduced_resources = _.reduce(ground_resources, (acc, res) => { acc[res.resourceType] = _.get(acc, [res.resourceType], 0) + res.amount; return acc; }, {});

    const creep_counts = _.countBy(creeps, c => c.memory.role);

    let retval = {
        room_name: room.name, // In case this gets taken out of context
        controller_level,
        controller_progress,
        controller_needed,
        controller_downgrade,
        controller_blocked,
        controller_safemode,
        controller_safemode_avail,
        controller_safemode_cooldown,
        energy_avail,
        energy_cap,
        num_sources,
        source_energy,
        mineral_type,
        mineral_amount,
        num_extractors,
        has_storage,
        storage_energy,
        storage_minerals,
        has_terminal,
        terminal_energy,
        terminal_minerals,
        num_containers,
        container_energy,
        num_links,
        link_energy,
        num_creeps,
        creep_counts,
        creep_energy,
        num_enemies,
        num_spawns,
        spawns_spawning,
        num_towers,
        tower_energy,
        structure_info,
        num_construction_sites,
        num_my_construction_sites,
        ground_resources: reduced_resources,
    };
    return retval;
} // summarize_room
summarize_room_internal = profiler.registerFN(summarize_room_internal, 'summarize_room_internal');

function summarize_rooms() {
    const now = Game.time;
    // First check if we cached it
    if (global.summarized_room_timestamp == now) {
        return global.summarized_rooms;
    }
    let retval = {};
    for (let r in Game.rooms) {
        let summary = summarize_room_internal(Game.rooms[r]);
        retval[r] = summary;
    }
    global.summarized_room_timestamp = now;
    global.summarized_rooms = retval;
    return retval;
} // summarize_rooms
summarize_rooms = profiler.registerFN(summarize_rooms, 'summarize_rooms');

function summarize_room(room) {
    if (_.isString(room)) { room = Game.rooms[room]; }
    if (room == null) { return null; }
    const sr = summarize_rooms();
    return sr[room.name];
}
summarize_room = profiler.registerFN(summarize_room, 'summarize_room');

module.exports = {
    summarize_room,
    summarize_rooms,
};
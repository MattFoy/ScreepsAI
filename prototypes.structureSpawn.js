module.exports = function() {
  StructureSpawn.prototype.spawnThisCreep = function(opts) {
    if (!opts || !opts.body || opts.body.indexOf(MOVE) === -1) {
      return;
    }
    return this.createCreep(opts.body, opts.name, opts.memory);
  }
}
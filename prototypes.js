module.exports = function() {
  require('prototypes.room')();
  require('prototypes.flag')();
  require('prototypes.creep')();
  require('prototypes.roomPosition')();
  require('prototypes.structureTerminal')();
  
  Array.prototype.average = function() {
    return this.reduce((m,x) => m + x) / this.length;
  }
  Array.prototype.getStandardDeviation = function() {
    return Math.sqrt(_.sum(_.map(this, (x) => Math.pow(x - this.average(), 2) / this.length)));
  }
  Array.prototype.getAboveAverageThreshold = function() {
    return this.average() + this.getStandardDeviation();
  }
}
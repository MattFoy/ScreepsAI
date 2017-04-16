module.exports = function() {

  StructureTerminal.prototype.getBestOrders = function(orderType, resourceType) {
    let energyValue = ((this.getEnergySellPrice() + this.getEnergyBuyPrice()) / 2).toFixed(4);

    var orders = _.filter(Game.market.getAllOrders({
      type: orderType,
      resourceType: resourceType
    }), (o) => o.amount > 0);
    let terminalRoom = this.room.name;
    let terminal = this;

    _.map(orders, function(o) {
      o.energyTransferCost = Game.market.calcTransactionCost(o.amount, terminalRoom, o.roomName);
      if (orderType === ORDER_BUY) {
        let creditsReceived = o.amount * o.price;
        let energyCost = o.energyTransferCost * terminal.getEnergyBuyPrice();
        o.value = (creditsReceived - energyCost) / o.amount;
      } else { // ORDER_SELL
        let creditsSpent = o.amount * o.price;
        let energyCost = o.energyTransferCost * terminal.getEnergySellPrice();
        o.value = (creditsSpent + energyCost) / o.amount;
      }
    });

    if (orderType === ORDER_BUY) {
      orders.sort((a,b) => b.value - a.value);
    } else { 
      orders.sort((a,b) => a.value - b.value);
    }

    for (var i = 0; i < Math.min(orders.length, 5); i++) {
      console.log(JSON.stringify(orders[i]));
    }

    return orders;
  }

  StructureTerminal.prototype.getResourceSellPrice = function(resourceType) {
    let orders = this.getBestOrders(ORDER_BUY, resourceType);

    let sim_smooth = Math.min(5000, _.sum(orders, 'amount'));
    
    let sim_resourcesSold = 0;
    let sim_creditsReceived = 0.0;
    for (var i = 0; i < orders.length && sim_smooth > 0; i++) {
      let sim_sell = Math.min(orders[i].amount, sim_smooth);
      sim_creditsReceived += orders[i].price * sim_sell;
      sim_resourcesSold += sim_sell;
      sim_smooth -= sim_sell;
    }
    let sim_rate = (sim_creditsReceived / sim_resourcesSold).toFixed(5);

    return sim_rate;
  }

  StructureTerminal.prototype.getResourceBuyPrice = function(resourceType) {
    let orders = this.getBestOrders(ORDER_SELL, resourceType);

    let sim_smooth = Math.min(5000, _.sum(orders, 'amount'));
    
    let sim_resourcesSold = 0;
    let sim_creditsReceived = 0.0;
    for (var i = 0; i < orders.length && sim_smooth > 0; i++) {
      let sim_sell = Math.min(orders[i].amount, sim_smooth);
      sim_creditsReceived += orders[i].price * sim_sell;
      sim_resourcesSold += sim_sell;
      sim_smooth -= sim_sell;
    }
    let sim_rate = (sim_creditsReceived / sim_resourcesSold).toFixed(5);

    return sim_rate;
  }

  StructureTerminal.prototype.getEnergySellPrice = function() {
    if (GameState.cachedEnergySellPrice) {
      return GameState.cachedEnergySellPrice;
    }
    var orders = Game.market.getAllOrders({
      type: ORDER_BUY, 
      resourceType: RESOURCE_ENERGY
    });
    let terminalRoom = this.room.name;
    _.map(orders, function(o) {
      o.transferCost = Game.market.calcTransactionCost(o.amount, terminalRoom, o.roomName);
      o.energySent = o.transferCost + o.amount;
      o.creditsReceived = o.amount * o.price;
      o.value = o.creditsReceived / o.energySent;
    });
    orders.sort((a,b) => b.value - a.value);

    // to prevent anomalous outliers from messing with me, try to 'sell' 50k energy
    let sim_smooth = Math.min(50000, _.sum(orders, 'energySent'));
    
    let sim_energySold = 0;
    let sim_creditsReceived = 0.0;
    for (var i = 0; i < orders.length && sim_smooth > 0; i++) {
      let sim_sell = Math.min(orders[i].energySent, sim_smooth);
      sim_creditsReceived += orders[i].value * sim_sell;
      sim_energySold += sim_sell;
      sim_smooth -= sim_sell;
    }
    let sim_rate = (sim_creditsReceived / sim_energySold).toFixed(5);

    GameState.cachedEnergySellPrice = sim_rate;
    return sim_rate;
  }

  StructureTerminal.prototype.getEnergyBuyPrice = function() {
    if (GameState.cachedEnergyBuyPrice) {
      return GameState.cachedEnergyBuyPrice;
    }

    var orders = Game.market.getAllOrders({
      type: ORDER_BUY, 
      resourceType: RESOURCE_ENERGY
    });
    let terminalRoom = this.room.name;
    _.map(orders, function(o) {
      o.transferCost = Game.market.calcTransactionCost(o.amount, terminalRoom, o.roomName);
      o.energySent = o.transferCost + o.amount;
      o.creditsReceived = o.amount * o.price;
      o.value = o.creditsReceived / o.energySent;
    });
    orders.sort((a,b) => b.value - a.value);

    // to prevent anomalous outliers from messing with me, try to 'buy' 50k energy
    let sim_smooth = Math.min(50000, _.sum(orders, 'energySent'));
    
    let sim_energyBought = 0;
    let sim_creditsSpent = 0.0;
    for (var i = 0; i < orders.length && sim_smooth > 0; i++) {
      let sim_buy = Math.min(orders[i].amount, sim_smooth);
      sim_creditsSpent += orders[i].price * sim_buy;
      sim_energyBought += sim_buy;
      sim_smooth -= sim_buy;
    }
    let sim_rate = (sim_creditsSpent / sim_energyBought).toFixed(5);

    GameState.cachedEnergyBuyPrice = sim_rate;
    return sim_rate;
  }

  StructureTerminal.prototype.buy = function(resourceType, amount) {
    let orders = this.getBestOrders(ORDER_SELL, resourceType);
    
    for (var i = 0; i < 10; i++) {
      if (orders[i].amount >= amount) {
        console.log(Game.market.deal(orders[i].id, amount, this.room.name));
        return;
      }
    }
  }

  StructureTerminal.prototype.storeHistoricalPriceData = function() {
    let room = this.room;

    if (!GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name]) {
      GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name] = {};
    }
    if (!GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends) {
      GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends = {};
    }

    for (let i = 0; i < RESOURCES_ALL.length; i++) {
      let resourceType = RESOURCES_ALL[i];
      console.log("Checking " + resourceType);
      if (true || !GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType]) {
        GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType] = {};
        GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_BUY] = [];
        GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_SELL] = [];
      } else {
        while (GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_BUY].length > 100) {
          GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_BUY].shift();
        }
        while (GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_SELL].length > 100) {
          GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_SELL].shift();
        }
      }

      let sellValue = this.getResourceSellPrice(resourceType);
      let buyValue = this.getResourceBuyPrice(resourceType);
      console.log('Buy: ' + buyValue + ', Sell: ' + sellValue);
      GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_BUY].push(sellValue);
      GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[resourceType][ORDER_SELL].push(buyValue);
      // todo check market data and push prices

    }    
  }

  StructureTerminal.prototype.executeRoomPlan = function() { 
    energyResult = room.terminal.getEnergySellPrice();
    hydrogenResult = room.terminal.getResourceSellPrice(RESOURCE_HYDROGEN);      

    let averageEnergyPrice = _.sum(_.takeRight(GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[RESOURCE_ENERGY], 100))
                / Math.min(100, GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[RESOURCE_ENERGY].length);
    
    let averageHydrogenPrice = _.sum(_.takeRight(GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[RESOURCE_HYDROGEN], 100))
                / Math.min(100, GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[RESOURCE_HYDROGEN].length);


    console.log('Average energy price: ' + averageEnergyPrice + ', Average H price: ' + averageHydrogenPrice);

    if (hydrogenResult) {
      console.log('Hydrogen price: ' + hydrogenResult.price);
      let threshold = GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[RESOURCE_HYDROGEN].getAboveAverageThreshold();
      console.log('`---> Threshold:' + threshold);
      if (hydrogenResult.price > threshold) {
        console.log('We should sell to this guy...' + JSON.stringify(hydrogenResult.bestFiveOrders[0]));
        let orderId = hydrogenResult.bestFiveOrders[0].orderId;
        let amount = hydrogenResult.bestFiveOrders[0].amount;
        console.log(orderId + '   ' + amount + '   ' + room.name);
        //amount = 10;
        //console.log(Game.market.deal(orderId, amount, room.name));
        if (Game.market.deal(orderId, amount, room.name) === -6 && amount > 5000) {
          amount = 5000;
          if (Game.market.deal(orderId, amount, room.name) === -6 && amount > 2000) {
            amount = 2000;
            if (Game.market.deal(orderId, amount, room.name) === -6 && amount > 1000) {
              amount = 1000;
              Game.market.deal(orderId, amount, room.name)
            }
          }
        }
      }
    }

    if (energyResult) {
      console.log('Energy price: ' + energyResult.price);
      let threshold = GameState.memory[GameState.constants.MEMORY_ECONOMIC_TRENDS].rooms[room.name].resourcePriceTrends[RESOURCE_ENERGY].getAboveAverageThreshold();
      console.log('`---> Threshold:' + threshold);
      if (energyResult.price > threshold) {
        console.log('We should sell to this guy...' + JSON.stringify(energyResult.bestFiveOrders[0]));
        let orderId = energyResult.bestFiveOrders[0].orderId;
        let amount = energyResult.bestFiveOrders[0].amount;
        console.log(orderId + '   ' + amount + '   ' + room.name);
        amount = 5000;
        //console.log(Game.market.deal(orderId, amount, room.name));              
      }
    }
  } 
  
}
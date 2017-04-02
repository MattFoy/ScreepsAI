module.exports = function(room, hostiles) {
  let bodyPriority = [TOUGH, MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL];

  if (hostiles.length > 0) {
    // put together a squad..
    let totalEnemyAttackPower = 0;
    let totalEnemyRangedPower = 0;
    let totalEnemyHealPower = 0;
    let totalEnemyHealth = 0;
    
    for (var i = 0; i < hostiles.length; i++) {
      totalEnemyAttackPower += hostiles[i].attackPower;
      totalEnemyRangedPower += hostiles[i].rangedPower;
      totalEnemyHealPower += hostiles[i].healPower;
      totalEnemyHealth += hostiles[i].toughness;
    }

    //console.log(totalEnemyHealth + ', ' + totalEnemyAttackPower + ', ' + totalEnemyRangedPower + ', ' + totalEnemyHealPower);

    let attackParts = Math.ceil(totalEnemyAttackPower / ATTACK_POWER);
    let rangeParts = Math.ceil(totalEnemyRangedPower / RANGED_ATTACK_POWER);
    let extraDmgRequired = Math.ceil(totalEnemyHealPower);

    //console.log("Parts Required: " + attackParts + '/' + rangeParts + '/' + extraDmgRequired + '/' + totalEnemyHealth);

    if (rangeParts > attackParts && extraDmgRequired > 0) {
      rangeParts += extraDmgRequired / RANGED_ATTACK_POWER;
    } else if (attackParts >= rangeParts && extraDmgRequired > 0) {
      attackParts += extraDmgRequired / ATTACK_POWER;
    }

    let damageDealtPerTick = (rangeParts * RANGED_ATTACK_POWER) + (attackParts * ATTACK_POWER);
    let ticksToClear = Math.ceil(totalEnemyHealth / damageDealtPerTick);
    let damageReseivedPerTick = (totalEnemyAttackPower + totalEnemyRangedPower);

    let idealBody = [];
    Array(attackParts).fill().forEach(() => idealBody.push(ATTACK) && idealBody.push(MOVE));
    Array(rangeParts).fill().forEach(() => idealBody.push(RANGED_ATTACK) && idealBody.push(MOVE));

    let healthRequired = ticksToClear * damageReseivedPerTick;

    // The enemy's total health minus our    
    let toughsRequired = Math.ceil(((healthRequired) - (idealBody.length * 100)) / 200);
    if (toughsRequired > 0) {
      Array(toughsRequired).fill().forEach(() => idealBody.push(TOUGH) && idealBody.push(MOVE))
    }

    idealBody.sort((a,b) => bodyPriority.indexOf(a) - bodyPriority.indexOf(b));
    // idealBody.unshift(TOUGH);
    // idealBody.push(MOVE);

    let bodyCost = _.reduce(idealBody, (memo,bodyPart) => memo + Number.parseInt(BODYPART_COST[bodyPart]), 0);
    //console.log('Cost: ' + bodyCost);

    let maxEnergy = room.energyCapacityAvailable;
    //maxEnergy = 550;

    let factor = Math.max(bodyCost / maxEnergy, idealBody.length / 50);

    //console.log('Factor: ' + factor)
    //console.log("Ideal body: " + JSON.stringify(idealBody));

    let squad = [];
    if (factor <= 1) {
      // All's well and we can spawn a single responder
      squad.push(idealBody);
    } else {
      // while (factor >= 1 && squad.length < 10) {
      //   let thisAttack = Math.floor(attackParts / factor);
      //   let thisRange = Math.floor(rangeParts / factor);
      //   let body = [];
      //   Array(thisAttack).fill().forEach(() => body.push(ATTACK));
      //   Array(thisRange).fill().forEach(() => body.push(RANGED_ATTACK));
      //   Array(body.length).fill().forEach(() => body.unshift(MOVE));
      //   squad.push(body);
      //   attackParts -= thisAttack;
      //   rangeParts -= thisRange;
      //   factor = (((attackParts * 130) + (rangeParts * 170)) / maxEnergy);
      // }
      return [];
    }

    return squad;
  }
}
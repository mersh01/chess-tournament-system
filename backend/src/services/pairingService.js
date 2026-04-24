const pairingConfig = require('../config/pairing.config');

class PairingService {
  constructor(tournamentConfig) {
    this.config = tournamentConfig;
    this.algorithm = pairingConfig.pairing.algorithm;
  }
  
  generatePairings(players, currentRound, previousMatches) {
    switch(this.algorithm) {
      case 'swiss_dutch':
        return this.swissPairing(players, currentRound, previousMatches);
      case 'round_robin':
        return this.roundRobinPairing(players, currentRound);
      case 'knockout':
        return this.knockoutPairing(players, currentRound);
      default:
        return this.swissPairing(players, currentRound, previousMatches);
    }
  }
  
  swissPairing(players, currentRound, previousMatches) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const pairings = [];
    const paired = new Set();
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      if (paired.has(sortedPlayers[i].playerId.toString())) continue;
      
      const opponent = this.findBestOpponent(
        sortedPlayers[i],
        sortedPlayers.slice(i + 1),
        previousMatches,
        paired
      );
      
      if (opponent) {
        const whitePlayer = this.determineColor(sortedPlayers[i], opponent, previousMatches);
        pairings.push({
          whitePlayer: whitePlayer === sortedPlayers[i] ? sortedPlayers[i].playerId : opponent.playerId,
          blackPlayer: whitePlayer === sortedPlayers[i] ? opponent.playerId : sortedPlayers[i].playerId,
          round: currentRound
        });
        paired.add(sortedPlayers[i].playerId.toString());
        paired.add(opponent.playerId.toString());
      }
    }
    
    return pairings;
  }
  
  findBestOpponent(player, candidates, previousMatches, paired) {
    let available = candidates.filter(c => 
      !paired.has(c.playerId.toString()) && 
      !this.hasPlayedBefore(player.playerId, c.playerId, previousMatches)
    );
    
    if (pairingConfig.pairing.swissRules.maxRatingDifference) {
      available = available.filter(c => 
        Math.abs(player.rating - c.rating) <= 
        pairingConfig.pairing.swissRules.maxRatingDifference
      );
    }
    
    const sameScoreGroup = available.filter(c => 
      Math.abs(player.score - c.score) <= 
      pairingConfig.pairing.swissRules.scoreGrouping.tolerance
    );
    
    if (sameScoreGroup.length > 0) {
      return sameScoreGroup.reduce((closest, current) => {
        return Math.abs(current.rating - player.rating) < 
               Math.abs(closest.rating - player.rating) ? current : closest;
      });
    }
    
    return available.length > 0 ? available[0] : null;
  }
  
  determineColor(player1, player2, previousMatches) {
    // Simple color alternation logic
    const player1LastColor = player1.colorHistory && player1.colorHistory[player1.colorHistory.length - 1];
    const player2LastColor = player2.colorHistory && player2.colorHistory[player2.colorHistory.length - 1];
    
    if (player1LastColor === 'white' && player2LastColor !== 'black') return player2;
    if (player2LastColor === 'white' && player1LastColor !== 'black') return player1;
    if (player1LastColor === 'black') return player1;
    if (player2LastColor === 'black') return player2;
    
    // Default: higher rated player gets white? Or random
    return player1.rating >= player2.rating ? player1 : player2;
  }
  
  hasPlayedBefore(player1Id, player2Id, previousMatches) {
    return previousMatches.some(match => 
      (match.whitePlayer && match.whitePlayer.toString() === player1Id.toString() && 
       match.blackPlayer && match.blackPlayer.toString() === player2Id.toString()) ||
      (match.whitePlayer && match.whitePlayer.toString() === player2Id.toString() && 
       match.blackPlayer && match.blackPlayer.toString() === player1Id.toString())
    );
  }
  
  roundRobinPairing(players, currentRound) {
    const n = players.length;
    const pairings = [];
    const rotated = [...players];
    
    // Simple circle method
    for (let i = 0; i < n / 2; i++) {
      if (rotated[i] && rotated[n - 1 - i]) {
        pairings.push({
          whitePlayer: rotated[i].playerId,
          blackPlayer: rotated[n - 1 - i].playerId,
          round: currentRound
        });
      }
    }
    
    return pairings;
  }
  
  knockoutPairing(players, currentRound) {
    const pairings = [];
    const seeded = [...players].sort((a, b) => b.rating - a.rating);
    
    for (let i = 0; i < seeded.length; i += 2) {
      if (i + 1 < seeded.length) {
        pairings.push({
          whitePlayer: seeded[i].playerId,
          blackPlayer: seeded[i + 1].playerId,
          round: currentRound
        });
      }
    }
    
    return pairings;
  }
}

module.exports = PairingService;
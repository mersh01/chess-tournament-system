module.exports = {
  // Who plays with whom - Pairing algorithms
  pairing: {
    algorithm: "swiss_dutch",  // swiss_dutch, round_robin, elimination
    
    // Swiss system specific rules
    swissRules: {
      avoidRepeatOpponents: true,     // Don't pair same players twice
      colorAlternation: true,          // Alternate white/black
      maxRatingDifference: 400,        // Max rating gap for pairing
      floatRules: "standard",          // standard, uscf, fide
      accelerateBye: true,             // Give stronger players bye if odd number
      
      // Score groups pairing
      scoreGrouping: {
        enabled: true,
        tolerance: 0.5  // Pair within 0.5 points difference
      }
    },
    
    // Round Robin specific rules
    roundRobinRules: {
      algorithm: "circle_method",
      randomizeInitialOrder: true,
      ensureColorBalance: true
    },
    
    // Knockout specific rules
    knockoutRules: {
      bracketType: "single_elimination", // single_elimination, double_elimination
      seedingMethod: "rating",            // rating, random, manual
      consolationBracket: false,
      finalMatchBestOf: 1                  // Number of games in final
    },
    
    // Special pairing conditions
    specialConditions: {
      preventSameClub: {
        enabled: false,      // Set to true to prevent club members playing each other early
        postponeRounds: 3    // Allow after round 3
      },
      
      preventSameFamily: {
        enabled: true,
        postponeRounds: 2
      },
      
      priorityGroups: [
        { name: "Title Holders", priority: 1, avoidEarlyElimination: true },
        { name: "Juniors (U16)", priority: 2, avoidTopPlayers: true },
        { name: "Seniors (60+)", priority: 2, avoidTopPlayers: true }
      ]
    },
    
    // Color assignment rules
    colorRules: {
      alternatingColors: true,
      maxConsecutiveSameColor: 2,
      preferAlternateColors: true,
      balanceOverTournament: true
    },
    
    // Bye handling
    byeRules: {
      maxByesPerPlayer: 1,
      pointsForBye: 1,
      byePreference: "bottom_up"  // bottom_up, top_down, random
    }
  },
  
  // Dynamic pairing adjustments
  dynamicAdjustments: {
    enableMidTournamentChanges: false,
    allowPlayerReentry: false,
    withdrawPenalty: "loss_for_all_games",
    
    // Late arrivals
    lateArrival: {
      allowed: true,
      maxLateRounds: 2,
      pointsDeduction: 0.5,
      pairingPenalty: true
    }
  }
};
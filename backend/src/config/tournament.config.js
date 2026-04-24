module.exports = {
  // Tournament basic settings
  tournament: {
    name: "Chess Championship 2026",
    type: "swiss",        // Options: swiss, round_robin, knockout
    maxPlayers: 32,
    minPlayers: 4,
    rounds: 5,
    
    // Time control
    timeControl: {
      type: "standard",   // standard, rapid, blitz, custom
      initialTime: 600,   // seconds (10 minutes)
      increment: 5,       // seconds per move
      maxTime: 3600       // maximum game time
    },
    
    // Rating system
    ratingSystem: "elo",  // elo, glicko, custom
    initialRating: 1200,
    kFactor: 32,          // ELO K-factor
    
    // Tie-break rules
    tieBreaks: [
      "direct_encounter",  // Head-to-head result
      "buchholz",         // Opponents' scores sum
      "sonneborn_berger", // Weighted opponents' scores
      "performance"       // Tournament performance rating
    ],
    
    // Registration rules
    registration: {
      requiresApproval: false,
      maxPerClub: 3,
      minAge: 6,
      maxAge: 99,
      ratingRequired: false,
      federationRequired: false
    },
    
    // Scoring system
    scoring: {
      win: 1,
      draw: 0.5,
      loss: 0,
      bye: 1,             // Points for bye (no opponent)
      forfeit: 0
    }
  }
};
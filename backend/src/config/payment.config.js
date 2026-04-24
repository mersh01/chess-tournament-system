module.exports = {
  // Payment methods enabled
  enabledMethods: [
    "stripe",      // Credit cards
    "paypal",      // PayPal
    "bank_transfer",
    "cash_on_site"
  ],
  
  // Fee structure
  fees: {
    registration: {
      amount: 50,        // Base fee in USD
      currency: "USD",
      earlyBird: {
        enabled: true,
        discount: 10,    // $10 discount
        deadline: "2026-05-01" // Before this date
      },
      groupDiscount: {
        enabled: true,
        minPlayers: 5,
        discountPercent: 15
      },
      studentDiscount: {
        enabled: true,
        discountPercent: 20,
        requiresId: true
      }
    },
    
    lateRegistration: {
      enabled: true,
      extraFee: 25,
      afterDate: "2026-05-15"
    },
    
    refund: {
      allowed: true,
      deadlineDays: 7,   // Days before tournament start
      feePercent: 10      // Refund processing fee
    }
  },
  
  // Prize pool configuration
  prizePool: {
    distribution: "percentage", // percentage, fixed
    percentages: {
      first: 50,
      second: 25,
      third: 15,
      fourth: 7,
      fifth: 3
    },
    specialPrizes: {
      bestJunior: 100,
      bestSenior: 100,
      bestWoman: 100,
      biggestUpset: 50
    }
  },
  
  // Payment providers API keys (use env variables in production)
  providers: {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      mode: "sandbox" // sandbox or live
    }
  },
  
  // Invoice settings
  invoice: {
    prefix: "CHESS-2026",
    companyName: "Chess Tournament Org",
    companyTaxId: "123456789",
    companyAddress: "123 Chess Street, Board City, BC 12345",
    companyEmail: "finance@chesstournament.com"
  }
};
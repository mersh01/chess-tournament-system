const Payment = require('../models/Payment');
const paymentConfig = require('../config/payment.config');

class PaymentService {
  async calculateRegistrationFee(player, registrationDate) {
    let fee = paymentConfig.fees.registration.amount;
    
    // Check for early bird discount
    if (paymentConfig.fees.registration.earlyBird.enabled) {
      const earlyBirdDeadline = new Date(paymentConfig.fees.registration.earlyBird.deadline);
      if (registrationDate <= earlyBirdDeadline) {
        fee -= paymentConfig.fees.registration.earlyBird.discount;
      }
    }
    
    // Check for late registration fee
    if (paymentConfig.fees.lateRegistration.enabled) {
      const lateDeadline = new Date(paymentConfig.fees.lateRegistration.afterDate);
      if (registrationDate > lateDeadline) {
        fee += paymentConfig.fees.lateRegistration.extraFee;
      }
    }
    
    return Math.max(0, fee);
  }
  
  async createPayment(registrationId, tournamentId, playerId, method, amount) {
    const payment = new Payment({
      registrationId,
      tournamentId,
      playerId,
      amount,
      method,
      transactionId: this.generateTransactionId(),
      status: 'pending'
    });
    
    await payment.save();
    return payment;
  }
  
  generateTransactionId() {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  async processStripePayment(paymentId, stripeToken) {
    // This would integrate with Stripe API
    // For now, return mock success
    return { success: true, transactionId: `stripe_${Date.now()}` };
  }
  
  async processPayPalPayment(paymentId, paypalData) {
    // This would integrate with PayPal API
    return { success: true, transactionId: `paypal_${Date.now()}` };
  }
  
  async completePayment(paymentId, transactionId) {
    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: 'completed',
        transactionId: transactionId,
        paymentDate: new Date()
      },
      { new: true }
    );
  }
}

module.exports = PaymentService;
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import toast from 'react-hot-toast';

const stripePromise = loadStripe('pk_test_placeholder'); // Replace with your Stripe public key

function PaymentGateway() {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    playerName: '',
    rating: '',
    club: ''
  });

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit Card (Stripe)',
      description: 'Pay securely with credit/debit card',
      icon: '💳'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: '💰'
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: '🏦'
    },
    {
      id: 'cash_on_site',
      name: 'Cash on Site',
      description: 'Pay at the venue',
      icon: '💵'
    }
  ];

  const calculateFee = () => {
    let fee = 50; // Base registration fee
    
    // Early bird discount (check if before May 1st)
    const now = new Date();
    const earlyBirdDeadline = new Date('2026-05-01');
    if (now < earlyBirdDeadline) {
      fee -= 10;
    }
    
    return fee;
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      // In production, you would create a payment intent on your backend
      const stripe = await stripePromise;
      
      // Mock successful payment
      setTimeout(() => {
        toast.success('Payment successful! Registration complete.');
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast.error('Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const handlePayPalPayment = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: calculateFee().toString(),
          currency_code: 'USD'
        },
        description: 'Chess Tournament Registration'
      }]
    });
  };

  const handlePayPalApprove = (data, actions) => {
    return actions.order.capture().then((details) => {
      toast.success(`Payment successful! Thank you ${details.payer.name.given_name}`);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    if (!formData.name || !formData.email || !formData.playerName) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (selectedMethod === 'stripe') {
      await handleStripePayment();
    } else if (selectedMethod === 'bank_transfer') {
      toast.success('Registration submitted! Please transfer the fee to the bank account provided.');
    } else if (selectedMethod === 'cash_on_site') {
      toast.success('Registration confirmed! Please bring cash to the venue.');
    }
  };

  return (
    <div className="payment-container">
      <h2>💰 Tournament Registration & Payment</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '2rem' }}>
          <h3>Player Information</h3>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <input
              type="text"
              name="name"
              placeholder="Full Name *"
              value={formData.name}
              onChange={handleInputChange}
              style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address *"
              value={formData.email}
              onChange={handleInputChange}
              style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="text"
              name="playerName"
              placeholder="Chess Player Name *"
              value={formData.playerName}
              onChange={handleInputChange}
              style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="number"
              name="rating"
              placeholder="FIDE Rating (if any)"
              value={formData.rating}
              onChange={handleInputChange}
              style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
            />
            <input
              type="text"
              name="club"
              placeholder="Chess Club (if any)"
              value={formData.club}
              onChange={handleInputChange}
              style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
            />
          </div>
        </div>
        
        <div>
          <h3>Select Payment Method</h3>
          <div className="payment-options">
            {paymentMethods.map(method => (
              <div
                key={method.id}
                className={`payment-method ${selectedMethod === method.id ? 'selected' : ''}`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <div style={{ fontSize: '2rem' }}>{method.icon}</div>
                <h3>{method.name}</h3>
                <p>{method.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div className="price">Total: ${calculateFee()} USD</div>
          <p style={{ margin: '1rem 0', color: '#666', fontSize: '0.875rem' }}>
            Early bird discount applied! Register before May 1st to save $10.
          </p>
          
          {selectedMethod === 'paypal' ? (
            <PayPalScriptProvider options={{ 
              "client-id": "test", // Replace with your PayPal client ID
              currency: "USD"
            }}>
              <PayPalButtons
                createOrder={handlePayPalPayment}
                onApprove={handlePayPalApprove}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  toast.error('Payment failed. Please try again.');
                }}
              />
            </PayPalScriptProvider>
          ) : (
            <button 
              type="submit" 
              className="pay-button"
              disabled={loading || !selectedMethod}
            >
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </form>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '10px' }}>
        <h4>Registration Includes:</h4>
        <ul style={{ marginTop: '0.5rem', listStyle: 'none' }}>
          <li>✓ Full tournament participation</li>
          <li>✓ FIDE-rated games</li>
          <li>✓ Certificate of participation</li>
          <li>✓ Chance to win prizes</li>
          <li>✓ Free coffee & snacks</li>
        </ul>
      </div>
    </div>
  );
}

export default PaymentGateway;
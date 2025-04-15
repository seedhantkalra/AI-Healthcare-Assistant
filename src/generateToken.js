import jwt from 'jsonwebtoken';

/**
 * This file generates a fake JWT token for local development and testing.
 * In production, tokens would come from Cognito or another authentication provider.
 */

// Hardcoded payload (normally comes from user login in a real app)
const payload = {
  userId: 'demo-user-001',                 // Unique ID for the user
  name: 'Dr. Emily',                       // Full name (used for personalization) 
  jobTitle: 'Surgeon',                     // Job title (used to customize prompts)
  workplace: 'Sunnybrook Health Centre',   // Workplace (adds more context to responses)
};

// The same secret used in the backend to verify the token
// In production, this must match your Cognito or secure token validation secret
const secret = 'my-test-secret';

// Sign the token using the payload and secret
// Token is valid for 1 hour
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('\n Here is your test token:\n');
console.log(token);


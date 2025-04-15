// utils/auth.js (ES Module version for local testing)

import jwt from 'jsonwebtoken';

// Secret key used to verify the token's signature
// In production, this should match the secret used by Cognito or your auth provider
const SECRET = 'my-test-secret';

/**
 * This function verifies the JWT sent in the Authorization header of a request.
 * It returns a Promise that resolves with user information if the token is valid,
 * or rejects with an error if the token is missing, invalid, or expired.
 */

export const verifyToken = (req) => {
  return new Promise((resolve, reject) => {
    // Retrieve the Authorization header from the request
    const authHeader = req.headers.authorization;

    // Ensure the header is present and starts with "Bearer"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reject(new Error('Missing or invalid authorization header.'));
    }

    // Extract the token from the header (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    // Verify the token using the shared secret
    jwt.verify(token, SECRET, (err, decoded) => {
      // If token is invalid or verification fails, reject with error
      if (err || !decoded) {
        return reject(new Error('Invalid token'));
      }

      // If valid, extract user details from the decoded payload
      resolve({
        userId: decoded.userId,
        name: decoded.name || '',
        jobTitle: decoded.jobTitle || '',
        workplace: decoded.workplace || '',
      });
    });
  });
};

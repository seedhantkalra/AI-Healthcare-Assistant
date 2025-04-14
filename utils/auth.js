// utils/auth.js (ES Module version for local testing)

import jwt from 'jsonwebtoken';

const SECRET = 'my-test-secret';

export const verifyToken = (req) => {
  return new Promise((resolve, reject) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reject(new Error('Missing or invalid authorization header.'));
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET, (err, decoded) => {
      if (err || !decoded) {
        return reject(new Error('Invalid token'));
      }

      resolve({
        userId: decoded.userId,
        name: decoded.name || '',
        jobTitle: decoded.jobTitle || '',
        workplace: decoded.workplace || '',
      });
    });
  });
};

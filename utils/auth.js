const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const REGION = 'your-region'; // e.g. us-east-1
const USER_POOL_ID = 'your-user-pool-id'; // e.g. us-east-1_ABC123XYZ

const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
};

const verifyToken = (req) => {
  return new Promise((resolve, reject) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reject(new Error('Missing or invalid authorization header.'));
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, getKey, {}, (err, decoded) => {
      if (err || !decoded) {
        return reject(new Error('Invalid token.'));
      }

      resolve({
        userId: decoded.sub,
        name: decoded.name || '',
        jobTitle: decoded['custom:jobTitle'] || '',
        workplace: decoded['custom:workplace'] || '',
      });
    });
  });
};

module.exports = { verifyToken };

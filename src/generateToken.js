import jwt from 'jsonwebtoken';

const payload = {
  userId: 'demo-user-001',
  name: 'Dr. Emily',
  jobTitle: 'Surgeon',
  workplace: 'Sunnybrook Health Centre',
};

const secret = 'my-test-secret';

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('\n Here is your test token:\n');
console.log(token);


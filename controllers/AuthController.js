/**
 * Authenticate a user
 */
import { v4 as uuid4 } from 'uuid';
import hash from '../utils/hash';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const getConnect = async (req, res) => {
  const Authorization = req.headers.authorization;
  const base64Credentials = Authorization.split(' ').splice(1).join('');
  const decodedBase64Credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [email, password] = decodedBase64Credentials.split(':');
  const user = await dbClient.findOne('users', { email });
  if (user && user.password === hash(password)) {
    const token = uuid4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 60 * 60 * 24);
    return res.status(200).json({ token });
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

const getDisconnect = async (req, res) => {
  const token = req.headers['x-token'];
  console.log(token);
  const userId = await redisClient.get(`auth_${token}`);
  if (userId) {
    const deleted = await redisClient.del(`auth_${token}`);
    if (deleted === 1) return res.status(204).end();
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

module.exports = { getConnect, getDisconnect };

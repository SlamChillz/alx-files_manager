/**
 * Defines handler for users route
 */
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import hash from '../utils/hash';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const postNew = async (req, res) => {
  const { email, password } = req.body;
  if (email === undefined) return res.status(400).json({ error: 'Missing email' });
  if (password === undefined) return res.status(400).json({ error: 'Missing password' });
  try {
    const hashPassword = hash(password);
    const result = await dbClient.insertOne('users', { email, password: hashPassword });
    const userQueue = new Queue('userQueue');
    userQueue.on('global:completed', (jobId, result) => { /* eslint-disable-line no-unused-vars */
      console.log(`Job ${jobId} completed!`);
      userQueue.getJob(jobId).then((job) => {
        console.log(`Welcome email has been sent to user ${job.data.userId}`);
        job.remove();
      });
    });
    userQueue.add({ userId: result.insertedId });
    return res.status(201).json({ id: result.insertedId, email });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Already exist' });
    console.log(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (userId) {
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (user) {
      return res.status(200).json({ id: user._id, email: user.email });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

module.exports = { postNew, getMe };

#!/usr/bin/node

/**
 * Redis and Datbase status check and collections count
 */
import dbClient from '../utils/db';
import redisCleint from '../utils/redis';

const getStatus = (req, res) => {
  res.json({ redis: redisCleint.isAlive(), db: dbClient.isAlive() });
};

const getStats = async (req, res) => {
  res.json({ users: await dbClient.nbUsers(), files: await dbClient.nbFiles() });
};

module.exports = { getStats, getStatus };

/**
 * Defines handlers for files routes
 */
import fs from 'fs';
import { ObjectId } from 'mongodb';
import { v4 as uuid4 } from 'uuid';
import mime from 'mime-types';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import Transform from '../utils/transform';

const postUpload = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (token === undefined || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const acceptedType = ['folder', 'file', 'image'];
  const { name, type, data } = req.body;
  const { parentId = 0, isPublic = false } = req.body;
  if (name === undefined) return res.status(400).json({ error: 'Missing name' });
  if (type === undefined || acceptedType.indexOf(type) === -1) return res.status(400).json({ error: 'Missing type' });
  if (data === undefined && type !== 'folder') return res.status(400).json({ error: 'Missing data' });
  if (parentId) {
    const file = await dbClient.findOne('files', { _id: ObjectId(parentId) });
    if (!file) return res.status(400).json({ error: 'Parent not found' });
    if (file.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
  }
  if (type === 'folder') {
    try {
      const result = await dbClient.insertOne('files', {
        userId: ObjectId(userId), name, type, parentId: String(parentId), isPublic,
      });
      return res.status(201).json({
        id: result.insertedId, userId, name, type, isPublic, parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  const rootFolder = process.env.FOLDER_PATH || '/tmp/files_manager';
  const fileName = uuid4();
  let fileContent;
  if (type === 'image') {
    fileContent = data.replace(/^data:image\/\w+;base64,/, '');
    fileContent = Buffer.from(fileContent, 'base64');
  } else {
    fileContent = Buffer.from(data, 'base64').toString('utf8');
  }
  try {
    fs.mkdirSync(`${rootFolder}`, { recursive: true });
    const localPath = (rootFolder[-1] === '/') ? `${rootFolder}${fileName}` : `${rootFolder}/${fileName}`;
    fs.writeFileSync(localPath, fileContent);
    const result = await dbClient.insertOne('files', {
      userId: ObjectId(userId),
      name,
      type,
      parentId: (parentId !== 0) ? ObjectId(parentId) : String(parentId),
      isPublic,
      localPath,
    });
    if (type === 'image') {
      const fileQueue = new Queue('fileQueue');
      fileQueue.add({ userId, fileId: result.insertedId });
    }
    return res.status(201).json({
      id: result.insertedId, userId, name, type, isPublic, parentId,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getShow = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (token === undefined || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const fileId = req.params.id;
  if (fileId && fileId.length !== 24) return res.status(404).json({ error: 'Not found' });
  try {
    const file = await dbClient.findOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });
    delete file.localPath;
    return res.json(Transform([file])[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getIndex = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (token === undefined || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { parentId, page = 0 } = req.query;
  if (parentId && parentId !== '0' && parentId.length !== 24) return res.json([]);
  try {
    const data = await dbClient.listFiles({ userId, parentId, page });
    return res.json(Transform(data[0].data));
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const putPublish = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (token === undefined || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const fileId = req.params.id;
  if (fileId && fileId.length !== 24) return res.status(404).json({ error: 'Not found' });
  try {
    const update = await dbClient.updateOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) }, { $set: { isPublic: true } });
    if (update.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    const updatedFile = await dbClient.findOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) });
    return res.json(Transform([updatedFile])[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const putUnpublish = async (req, res) => {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (token === undefined || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const fileId = req.params.id;
  if (fileId && fileId.length !== 24) return res.status(404).json({ error: 'Not found' });
  try {
    const update = await dbClient.updateOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) }, { $set: { isPublic: false } });
    if (update.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    const updatedFile = await dbClient.findOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) });
    return res.json(Transform([updatedFile])[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getFile = async (req, res) => {
  const fileId = req.params.id;
  const { size } = req.query;
  if (fileId && fileId.length !== 24) return res.status(404).json({ error: 'Not found' });
  const file = await dbClient.findOne('files', { _id: ObjectId(fileId) });
  if (!file) return res.status(404).json({ error: 'Not found' });
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  /* eslint-disable-next-line */
  if (file.isPublic === false && (!userId || file.userId.toString() !== userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (file.type === 'folder') return res.status(400).json({ error: 'A folder doesn\'t have content' });
  if (file.type === 'image') {
    if (size) {
      if (['500', '250', '100'].indexOf(size) === -1) {
        return res.status(400).json({ error: 'Not found' });
      }
      file.localPath = `${file.localPath}_${size}`;
    }
  }
  if (fs.existsSync(file.localPath)) {
    const mimeType = mime.lookup(file.name);
    res.set('Content-Type', mimeType);
    const data = fs.readFileSync(file.localPath);
    return res.end(data);
  }
  return res.status(404).json({ error: 'Not found' });
};

module.exports = {
  postUpload, getShow, getIndex, putPublish, putUnpublish, getFile,
};

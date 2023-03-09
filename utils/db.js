/**
 * MongoDB client connection class
 */
import { MongoClient, ObjectId } from 'mongodb';

class DBClient {
  constructor() {
    const DB_PORT = process.env.DB_PORT || '27017';
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
    const DB_URL = `mongodb://${DB_HOST}:${DB_PORT}`;
    this._client = new MongoClient(DB_URL);
    this.connected = false;
    (async () => {
      try {
        await this._client.connect();
        this.connected = true;
        this._db = this._client.db(DB_DATABASE);
        await this._db.collection('users').createIndex({ email: 1 }, { unique: true });
      } catch (error) {
        console.log(error);
      }
    })();
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers(query = {}) {
    return this._db.collection('users').countDocuments(query);
  }

  async nbFiles(query = {}) {
    return this._db.collection('files').countDocuments(query);
  }

  async insertOne(collection, data) {
    return this._db.collection(collection).insertOne(data);
  }

  async findOne(collection, data) {
    return this._db.collection(collection).findOne(data);
  }

  async updateOne(collection, filter, updateDoc) {
    return this._db.collection(collection).updateOne(filter, updateDoc);
  }

  async listFiles(data) {
    let pipeline = [];
    const { userId, page } = data;
    let { parentId } = data;
    if (parentId === undefined) {
      pipeline = [
        { $match: { userId: ObjectId(userId) } },
        { $facet: { data: [{ $skip: page * 20 }, { $limit: 20 }] } },
      ];
    } else {
      if (parentId !== '0') {
        parentId = ObjectId(parentId);
      }
      pipeline = [
        { $match: { userId: ObjectId(userId), parentId } },
        { $facet: { data: [{ $skip: page * 20 }, { $limit: 20 }] } },
      ];
    }
    return this._db.collection('files').aggregate(pipeline).toArray();
  }
}

const dbClient = new DBClient();

module.exports = dbClient;

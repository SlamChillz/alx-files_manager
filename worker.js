/**
 * A worker that processes the fileQueue
 * It fecthes the file from the mongodb database
 * Creates 3 thumbnails of width size 500, 250 and 100
 */
import fs from 'fs';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

async function thumbnail(path, width) {
  try {
    const newPath = `${path}_${width}`;
    const thumbnail = await imageThumbnail(path, { width });
    fs.writeFileSync(newPath, thumbnail);
    return Promise.resolve(width);
  } catch (error) {
    console.log(error);
    return Promise.reject(width);
  }
}

async function unlink(path, widths) {
  for (const width of widths) {
    fs.unlink(`${path}_${width.value}`, (err) => {
      if (err) console.log(`Error encountered while removing: ${path}_${width.value}`);
    });
  }
}

fileQueue.process((job, done) => {
  const { userId, fileId } = job.data;
  if (userId === undefined) done(new Error('Missing userId'));
  if (fileId === undefined) done(new Error('Missing fileId'));
  dbClient.findOne('files', { _id: ObjectId(fileId), userId: ObjectId(userId) })
    .then((file) => {
      if (!file) throw new Error('File not found');
      const path = file.localPath;
      Promise.allSettled([thumbnail(path, 500), thumbnail(path, 250), thumbnail(path, 100)])
        .then((results) => {
          const fails = results.filter((r) => r.status === 'rejected');
          if (fails.length > 0) {
            const success = results.filter((r) => r.status === 'fulfilled');
            unlink(path, success);
            done(new Error('Could not create thumbnails successfully!'));
          }
          console.log('All thumbnails created!');
          done();
        });
    })
    .catch((err) => {
      console.log(err);
      done(err);
    });
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  try {
    if (userId === undefined) throw new Error('Missing UserId');
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!user) throw new Error('User not found');
    console.log(`Welome ${user.email}`);
    done();
  } catch (error) {
    done(error);
  }
});

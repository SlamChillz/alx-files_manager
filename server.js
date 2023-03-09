/**
 * Application entry point
 */
import express from 'express';
import router from './routes/index';

const PORT = process.env.PORT ? process.env.PORT : 5000;

const app = express();

app.use(express.json());

app.use('/', router);

app.listen(PORT, () => {
  console.log(`Express server is live on port ${PORT}`);
});

export default app;

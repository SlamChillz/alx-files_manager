/**
 * Assign handlers to routes
 */
import { Router } from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UserController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';

const router = Router();

router.get('/stats', AppController.getStats);
router.get('/status', AppController.getStatus);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.post('/users', UserController.postNew);
router.get('/users/me', UserController.getMe);
router.post('/files', FilesController.postUpload);
router.get('/files/:id', FilesController.getShow);
router.get('/files/', FilesController.getIndex);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);
router.get('/files/:id/data', FilesController.getFile);

export default router;

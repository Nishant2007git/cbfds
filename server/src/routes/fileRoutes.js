import express from 'express';
import FileController from '../controllers/fileController.js';
import authenticate from '../middleware/auth.js';

const configureFileRoutes = () => {
  const router = express.Router();
  const fileController = new FileController();

  router.use(authenticate);

  router.get('/', fileController.listFiles);
  router.get('/trash', fileController.listTrashFiles);
  router.post('/:fileId/restore-trash', fileController.restoreFromTrash);
  router.delete('/:fileId/permanent', fileController.deletePermanently);
  router.get('/:fileId/versions', fileController.getFileVersions);
  router.post('/:fileId/restore', fileController.restoreVersion);
  router.delete('/:fileId', fileController.deleteFile);
  router.get('/:fileId/download', fileController.downloadFile);
  router.post('/:fileId/tags', fileController.updateTags);

  return router;
};

export default configureFileRoutes;
export { configureFileRoutes };

const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  listChatUsers,
  listMyRooms,
  createOrGetDirectRoom,
  createGroupRoom,
  listRoomMessages,
  sendRoomMessage,
  markRoomRead,
  uploadChatAttachment,
} = require('../controllers/chatController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'chat');
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (_) {}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safe);
    const base = path.basename(safe, ext);
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.use(auth);

router.get('/users', asyncHandler(listChatUsers));
router.get('/rooms', asyncHandler(listMyRooms));
router.post('/rooms/direct', asyncHandler(createOrGetDirectRoom));
router.post('/rooms/group', asyncHandler(createGroupRoom));
router.get('/rooms/:roomId/messages', asyncHandler(listRoomMessages));
router.post('/rooms/:roomId/messages', asyncHandler(sendRoomMessage));
router.post('/rooms/:roomId/read', asyncHandler(markRoomRead));
router.post('/upload', upload.single('file'), asyncHandler(uploadChatAttachment));

module.exports = router;

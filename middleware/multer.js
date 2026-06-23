import multer from 'multer';

// Use memory storage since we will stream the buffer directly to Cloudinary
const storage = multer.memoryStorage();
export const upload = multer({ 
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});

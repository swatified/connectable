import nextConnect from 'next-connect';
import multer from 'multer';
import connectMongo from '@/lib/mongodb';
import { GridFSBucket } from 'mongodb';

const upload = multer({
  storage: multer.memoryStorage(),
});

const handler = nextConnect();

handler.use(upload.single('file')).post(async (req, res) => {
  try {
    await connectMongo();
    const db = (await connectMongo()).db();
    const bucket = new GridFSBucket(db, { bucketName: 'files' });

    const uploadStream = bucket.openUploadStream(req.file.originalname);
    uploadStream.end(req.file.buffer);

    res.status(200).json({ success: true, message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

export default handler;

import { gfs } from '@/lib/gridfs';

export async function GET(req, { params }) {
  const { filename } = params;

  try {
    const files = await gfs.find({ filename }).toArray();
    if (!files.length) {
      return new Response('File not found', { status: 404 });
    }

    const readStream = gfs.openDownloadStreamByName(filename);
    return new Response(readStream, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
  } catch (error) {
    console.error('Error streaming file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

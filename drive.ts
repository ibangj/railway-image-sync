import { google } from 'googleapis';
import { config } from './config';

const auth = new google.auth.GoogleAuth({
  credentials: config.googleCredentials,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadBufferToDrive(buffer: Buffer, filename: string, folderId: string) {
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: 'image/png',
      body: Buffer.from(buffer),
    },
  });

  console.log(`✅ Uploaded ${filename} to Drive: ID ${res.data.id}`);
}

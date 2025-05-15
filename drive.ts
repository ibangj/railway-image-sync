import { google } from 'googleapis';
import { Readable } from 'stream';
import { config } from './config.js';

const auth = new google.auth.GoogleAuth({
  credentials: config.googleCredentials,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadBufferToDrive(buffer: Buffer, filename: string, folderId: string) {
  if (!filename) {
    console.warn("Filename is empty. Using a default filename 'untitled.png'");
    filename = 'untitled.png';
  }
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signifies end of stream

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: 'image/png',
      body: stream,
    },
  });

  console.log(`✅ Uploaded ${filename} to Drive: ID ${res.data.id}`);
}

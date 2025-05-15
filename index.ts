import { Client } from 'pg';
import fetch from 'node-fetch';
import { config } from './config';
import { uploadBufferToDrive } from './drive';

console.log("ℹ️ Starting application...");

if (!config) {
  console.error("CRITICAL: Configuration is not loaded. Exiting.");
  process.exit(1);
}

console.log("ℹ️ Configuration object:", JSON.stringify(config, null, 2)); // Be careful with sensitive data in logs

const client = new Client(config.pg);

async function startListener() {
  try {
    console.log("ℹ️ Attempting to connect to PostgreSQL...");
    await client.connect();
    console.log("✅ Connected to PostgreSQL successfully.");

    console.log("ℹ️ Attempting to set up LISTEN new_image_event...");
    await client.query('LISTEN new_image_event');
    console.log("✅ LISTEN new_image_event set up successfully.");

    client.on('notification', async (msg) => {
      console.log(`ℹ️ Received notification: ${msg.channel}, Payload: ${msg.payload}`);
      const finalPath = msg.payload!;
      const imageName = finalPath.split('/').pop();
      const url = `${config.apiBaseUrl}${finalPath}`;
      console.log(`📥 New image: ${imageName}, URL: ${url}`);

      try {
        console.log(`ℹ️ Fetching image from ${url}...`);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        console.log(`✅ Image fetched successfully: ${imageName}`);

        console.log(`ℹ️ Uploading ${imageName} to Drive...`);
        await uploadBufferToDrive(buffer, imageName!, config.driveFolderId);
      } catch (err) {
        console.error(`❌ Error processing ${imageName}:`, err);
      }
    });

    console.log('🔁 Listening for image events...');
  } catch (error) {
    console.error("❌ Error in startListener:", error);
    // Consider whether to exit or attempt to reconnect
    process.exit(1); // Exit if listener setup fails, as it's critical
  }
}

startListener().catch(console.error);

console.log('Application started. Hello from index.ts!');

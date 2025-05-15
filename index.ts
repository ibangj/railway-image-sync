import { Client, Notification } from 'pg';
import fetch from 'node-fetch';
import { config } from './config.js';
import { uploadBufferToDrive } from './drive.js';

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

    client.on('notification', async (msg: Notification) => {
      console.log(`ℹ️ Received notification: ${msg.channel}, Payload: ${msg.payload}`);
      const finalPath = msg.payload!;

      let imageName: string;
      let originalImageFile = 'default_image.png'; // Default in case finalPath is weird

      const pathSegments = finalPath.split('/').filter(part => part.length > 0);
      if (pathSegments.length > 0) {
          originalImageFile = pathSegments[pathSegments.length - 1];
      }

      try {
          // Step 1: Query 'images' table to get the session_id using final_path
          const imageQuery = 'SELECT session_id FROM images WHERE final_path = $1';
          console.log(`ℹ️ Querying images table with final_path: ${finalPath}`);
          const imageResult = await client.query(imageQuery, [finalPath]);

          if (imageResult.rows.length > 0) {
              const sessionIdFromImageTable = imageResult.rows[0].session_id;
              console.log(`ℹ️ Found session_id from images table: ${sessionIdFromImageTable}`);

              // Step 2: Query 'sessions' table using the retrieved session_id
              // The column in 'sessions' table is also named 'session_id' based on your screenshot
              const sessionQuery = 'SELECT name, email FROM sessions WHERE session_id = $1';
              console.log(`ℹ️ Querying sessions table with session_id: ${sessionIdFromImageTable}`);
              const sessionResult = await client.query(sessionQuery, [sessionIdFromImageTable]);

              if (sessionResult.rows.length > 0) {
                  const { name, email } = sessionResult.rows[0];
                  console.log(`ℹ️ Found session - Name: ${name}, Email: ${email}`);
                  const safeName = name ? String(name).replace(/[^a-zA-Z0-9_.-]/g, '_') : 'unknown_name';
                  const safeEmail = email ? String(email).replace(/[^a-zA-Z0-9_.-@]/g, '_') : 'unknown_email';
                  
                  const lastDotIndex = originalImageFile.lastIndexOf('.');
                  let baseName = originalImageFile;
                  let extension = '.png'; // Default extension

                  if (lastDotIndex !== -1 && lastDotIndex > 0 && lastDotIndex < originalImageFile.length - 1) {
                      baseName = originalImageFile.substring(0, lastDotIndex);
                      extension = originalImageFile.substring(lastDotIndex);
                  } else {
                      baseName = originalImageFile.replace(/[^a-zA-Z0-9_.-]/g, '_');
                  }
                  
                  imageName = `${safeName}_${safeEmail}_${baseName}${extension}`;
              } else {
                  console.warn(`⚠️ Session not found in sessions table for ID: ${sessionIdFromImageTable}. Using original filename: ${originalImageFile}`);
                  imageName = originalImageFile;
              }
          } else {
              console.warn(`⚠️ Image record not found in images table for final_path: ${finalPath}. Using original filename: ${originalImageFile}`);
              imageName = originalImageFile;
          }
      } catch (dbError) {
          console.error(`❌ Error during database queries:`, dbError);
          imageName = originalImageFile; // Fallback to original filename on DB error
      }

      // Final fallback to ensure imageName is not empty
      if (!imageName) {
          console.warn(`⚠️ imageName ended up empty. Using fallback_default_image.png`);
          imageName = 'fallback_default_image.png';
      }

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
        await uploadBufferToDrive(buffer, imageName, config.driveFolderId);
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

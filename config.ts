export const config = {
    pg: {
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!,
      host: process.env.POSTGRES_HOST!,
      database: process.env.POSTGRES_DB!,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
    },
    apiBaseUrl: process.env.API_BASE_URL!,
    driveFolderId: process.env.GDRIVE_FOLDER_ID!,
    googleCredentials: JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!, 'base64').toString('utf-8')
    ),
  };
  
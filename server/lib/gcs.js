import { Storage } from "@google-cloud/storage";

const projectId = process.env.GCS_PROJECT_ID;
const clientEmail = process.env.GCS_CLIENT_EMAIL;
const privateKey = process.env.GCS_PRIVATE_KEY
  ? process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;
const bucketName = process.env.GCS_BUCKET;

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.warn("GCS is not fully configured. Missing env vars.");
}

const storage = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey
  }
});

export const bucket = storage.bucket(bucketName);

export const uploadBufferToGcs = async ({
  buffer,
  contentType,
  destination
}) => {
  const file = bucket.file(destination);
  await file.save(buffer, {
    resumable: false,
    metadata: { contentType }
  });
  await file.makePublic();
  const encoded = encodeURIComponent(destination).replace(/%2F/g, "/");
  return `https://storage.googleapis.com/${bucketName}/${encoded}`;
};

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { config } from '../config/env';

const SAS_EXPIRY_MINUTES = 15;

function getCredential(): StorageSharedKeyCredential {
  if (!config.AZURE_ACCOUNT_NAME || !config.AZURE_ACCOUNT_KEY) {
    throw new Error('Azure Storage credentials not configured');
  }
  return new StorageSharedKeyCredential(config.AZURE_ACCOUNT_NAME, config.AZURE_ACCOUNT_KEY);
}

function getServiceClient(): BlobServiceClient {
  const cred = getCredential();
  return new BlobServiceClient(
    `https://${config.AZURE_ACCOUNT_NAME}.blob.core.windows.net`,
    cred
  );
}

function generateSAS(userId: string, permissions: string): { sasUrl: string; blobPath: string } {
  const cred = getCredential();
  const blobPath = `vaults/${userId}.enc`;
  const expiresOn = new Date(Date.now() + SAS_EXPIRY_MINUTES * 60 * 1000);
  const containerName = config.AZURE_CONTAINER;

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse(permissions),
      expiresOn,
    },
    cred
  ).toString();

  const sasUrl = `https://${config.AZURE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
  return { sasUrl, blobPath };
}

export function generateUploadSAS(userId: string): { sasUrl: string; blobPath: string } {
  return generateSAS(userId, 'cw');
}

export function generateDownloadSAS(userId: string): { sasUrl: string; blobPath: string } {
  return generateSAS(userId, 'r');
}

// Export getServiceClient to satisfy usage if needed elsewhere (avoids TS unused warning)
export { getServiceClient };

import type {
  SignupRequest, LoginRequest, AuthResponse,
  VaultMetadataResponse, UploadTokenResponse
} from '../types/index.js';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (body: SignupRequest) =>
    apiFetch<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: LoginRequest) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  vaultMetadata: (token: string) =>
    apiFetch<VaultMetadataResponse>('/vault/metadata', {}, token),
  uploadToken: (token: string) =>
    apiFetch<UploadTokenResponse>('/backup/upload-token', { method: 'POST' }, token),
  downloadToken: (token: string) =>
    apiFetch<UploadTokenResponse>('/backup/download-token', {}, token),
  confirmBackup: (token: string, blobPath: string) =>
    apiFetch('/backup/confirm', { method: 'POST', body: JSON.stringify({ blobPath }) }, token),
  uploadToAzure: async (blobUrl: string, data: string): Promise<void> => {
    const res = await fetch(blobUrl, {
      method: 'PUT',
      headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': 'application/octet-stream' },
      body: data,
    });
    if (!res.ok) throw new Error(`Azure upload failed: ${res.status}`);
  },
  downloadFromAzure: async (blobUrl: string): Promise<string> => {
    const res = await fetch(blobUrl);
    if (!res.ok) throw new Error(`Azure download failed: ${res.status}`);
    return res.text();
  },
};

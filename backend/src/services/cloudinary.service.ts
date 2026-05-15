import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

type UploadIntentInput = {
  userId: string;
  providerCode: string;
  ingestionSessionId: string;
  uploadFileId: string;
  originalFilename: string;
};

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function signParams(params: Record<string, string | number>) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${serialized}${env.CLOUDINARY_API_SECRET}`)
    .digest("hex");
}

type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  bytes: number;
  format: string;
};

export const cloudinaryService = {
  async uploadBuffer(params: {
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
    userId: string;
    providerCode: string;
    ingestionSessionId: string;
    uploadFileId: string;
  }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const safeFilename = sanitizeFilename(params.originalFilename);
    const folder = [
      env.CLOUDINARY_UPLOAD_FOLDER,
      "betting",
      params.providerCode,
      params.userId,
      params.ingestionSessionId
    ].join("/");
    const publicId = `${params.uploadFileId}-${safeFilename}`;
    const paramsToSign = { folder, public_id: publicId, timestamp };
    const signature = signParams(paramsToSign);

    const form = new FormData();
    form.append("file", new Blob([params.buffer], { type: params.mimeType }), safeFilename);
    form.append("api_key", env.CLOUDINARY_API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    form.append("folder", folder);
    form.append("public_id", publicId);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: "POST",
      body: form
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AppError(502, `Cloudinary upload failed: ${text}`, "CLOUDINARY_UPLOAD_FAILED");
    }

    const result = await res.json() as CloudinaryUploadResult;
    return {
      publicId: result.public_id,
      publicUrl: result.secure_url,
      fileSizeBytes: result.bytes,
      folder,
      storageObjectKey: result.public_id
    };
  },

  createSignedUploadIntent(input: UploadIntentInput) {
    const timestamp = Math.floor(Date.now() / 1000);
    const safeFilename = sanitizeFilename(input.originalFilename);
    const folder = [
      env.CLOUDINARY_UPLOAD_FOLDER,
      "betting",
      input.providerCode,
      input.userId,
      input.ingestionSessionId
    ].join("/");
    const publicId = `${input.uploadFileId}-${randomUUID()}-${safeFilename}`;
    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp
    };

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      publicId,
      signature: signParams(paramsToSign)
    };
  }
};

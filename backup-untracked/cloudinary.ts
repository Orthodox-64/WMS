// Cloudinary upload utility
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
}

export const uploadToCloudinary = async (file: File): Promise<CloudinaryUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  formData.append('folder', 'wms/client-documents');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}; 
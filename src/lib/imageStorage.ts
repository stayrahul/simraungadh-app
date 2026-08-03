// @ts-nocheck
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Universal Image Uploader for Simraungadh App
 * Automatically uses Cloudinary (25 GB free), ImgBB, Supabase Storage, or Data URI fallback.
 */
export async function uploadImage(
  base64: string,
  folder: string = 'civic_images',
  userId: string = 'guest'
): Promise<string> {
  const cloudinaryCloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudinaryPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const imgbbApiKey = process.env.EXPO_PUBLIC_IMGBB_API_KEY;

  // 1. Try Cloudinary (25 GB Free Storage)
  if (cloudinaryCloudName && cloudinaryPreset) {
    try {
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${base64}`);
      formData.append('upload_preset', cloudinaryPreset);
      formData.append('folder', folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        return data.secure_url;
      }
    } catch (e) {
      console.warn('Cloudinary upload failed, trying fallback...', e);
    }
  }

  // 2. Try ImgBB (Free API Key)
  if (imgbbApiKey) {
    try {
      const formData = new FormData();
      formData.append('image', base64);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data?.data?.url) {
        return data.data.url;
      }
    } catch (e) {
      console.warn('ImgBB upload failed, trying fallback...', e);
    }
  }

  // 3. Try Supabase Storage
  try {
    const bucketName = folder.includes('avatar') ? 'avatars' : 'civic_images';
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

    if (!uploadError) {
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (e) {
    console.warn('Supabase storage upload failed, using data URI fallback...', e);
  }

  // 4. Ultimate Fallback: Data URI (guarantees image display under all network/bucket conditions)
  return `data:image/jpeg;base64,${base64}`;
}

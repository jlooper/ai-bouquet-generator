import axios from "axios";

import { CLOUDINARY_PRESET, PUBLIC_CLOUDINARY_CLOUD_NAME } from "astro:env/client";

function cloudinaryUploadUrl(cloudName) {
  const name = String(cloudName || "").trim();
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(name)}/image/upload`;
}

export const uploadToCloudinary = async (imageBase64) => {
  try {
    const formData = new FormData();
    formData.append("file", imageBase64);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    const response = await axios.post(
      cloudinaryUploadUrl(PUBLIC_CLOUDINARY_CLOUD_NAME),
      formData,
      {
        /* Let the browser set multipart boundary; a bare "multipart/form-data" breaks uploads */
        headers: {},
      }
    );

    return response.data.secure_url; // Return the uploaded image URL
  } catch (error) {
    console.error("Error uploading:", error);
    throw error;
  }
};
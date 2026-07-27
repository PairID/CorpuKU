import { v2 as cloudinary } from 'cloudinary';


// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  // Use URL format if available
  cloudinary.config({
    secure: true
  });
} else {
  // Fallback to individual vars
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Deletes a file from Cloudinary given its URL or public_id
 */
export async function deleteAsset(urlOrId: string | null | undefined) {
  if (!urlOrId) return null;
  
  try {
    let publicId = urlOrId;
    
    // If it's a full URL, extract the public_id
    if (urlOrId.includes("cloudinary.com")) {
      // Split URL into parts
      const parts = urlOrId.split("/");
      // Find the "upload" part and count from there
      const uploadIndex = parts.indexOf("upload");
      if (uploadIndex === -1) return null;
      
      // Skip the version part (starts with 'v') if present
      const startIndex = parts[uploadIndex + 1].startsWith("v") ? uploadIndex + 2 : uploadIndex + 1;
      
      // The rest is the public_id (including folder and file name, excluding extension)
      const fileNameWithExt = parts[parts.length - 1]; // e.g., "my_photo.jpg"
      const fileName = fileNameWithExt.split(".")[0]; // e.g., "my_photo"
      
      const folderParts = parts.slice(startIndex, parts.length - 1);
      publicId = [...folderParts, fileName].join("/");
    }

    console.log("Attempting to delete Cloudinary asset:", publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    return { result: "error", error };
  }
}

export default cloudinary;

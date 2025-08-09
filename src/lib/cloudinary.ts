import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary configuration
export function initCloudinary() {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  
  return cloudinary;
}

// Validate that all required Cloudinary environment variables are present
export function validateCloudinaryConfig() {
  const requiredVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY', 
    'CLOUDINARY_API_SECRET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Cloudinary environment variables: ${missing.join(', ')}`);
  }
}

// Helper function to generate optimized image URLs
export function getOptimizedImageUrl(publicId: string, options: {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: string;
} = {}) {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto'
  } = options;
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn('Cloudinary cloud name not configured');
    return publicId; // Return original if not configured
  }
  
  let transformations = `q_${quality},f_${format}`;
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

export default cloudinary;
import { NextResponse } from 'next/server';
import { initCloudinary, validateCloudinaryConfig } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define admin user emails
const ADMIN_EMAILS = [
  'admin@gearx.com',
  'bheeshma@gearx.com', // Add your email here
  'zoro11112004@gmail.com', // Your current email added as admin
  // Add more admin emails as needed
];

// Simple auth check using custom header (for now)
// In production, you should implement proper Firebase ID token verification
async function verifyAdminAuth(request: Request): Promise<{ isAdmin: boolean; email?: string }> {
  try {
    // Check for custom admin header (set by client-side auth)
    const adminEmail = request.headers.get('x-admin-email');
    const adminToken = request.headers.get('x-admin-token');
    
    // Simple validation - in production, verify Firebase ID token
    if (!adminEmail || !adminToken) {
      return { isAdmin: false };
    }
    
    // Check if email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(adminEmail);
    
    return {
      isAdmin,
      email: adminEmail
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return { isAdmin: false };
  }
}

type UploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: Request) {
  try {
    // Check admin authentication first
    const { isAdmin, email } = await verifyAdminAuth(req);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Validate Cloudinary configuration
    validateCloudinaryConfig();
    
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const folder = (form.get('folder') as string) || 'gearx/questions';
    const publicId = (form.get('public_id') as string) || undefined;

    // Narrow resource_type to allowed union for Cloudinary typings
    const rt = (form.get('resource_type') as string) || 'image';
    const allowed = ['image', 'video', 'raw', 'auto'] as const;
    const resourceType: (typeof allowed)[number] = (allowed as readonly string[]).includes(rt) ? (rt as any) : 'image';

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const buffer = await fileToBuffer(file);
    const cloudinary = initCloudinary();

    const result: UploadResult = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          overwrite: false,
        },
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve({
            secure_url: res.secure_url,
            public_id: res.public_id,
            width: res.width,
            height: res.height,
            format: res.format,
            bytes: res.bytes,
          });
        }
      );
      upload.end(buffer);
    });

    return NextResponse.json({ success: true, asset: result }, { status: 200 });
  } catch (e: any) {
    console.error('Cloudinary upload error:', e);
    const message = typeof e?.message === 'string' ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
# Deploy Guide: GitHub + Vercel + Firebase + Cloudinary

This guide walks you from local repo to a live Vercel deployment, using GitHub as the source of truth. It also captures post-deploy smoke tests and the next steps for adding Firebase Auth and tightening Firestore rules.

Key repo facts
- Next.js app with API routes; build command is `next build` from [package.json](package.json)
- Cloudinary server credentials are read from environment variables in [src/lib/cloudinary.ts](src/lib/cloudinary.ts)
- Upload API route posts multipart files to Cloudinary in [POST()](src/app/api/upload/route.ts:21)
- Firebase SDK is initialized with inline config in [src/lib/firebase.ts](src/lib/firebase.ts) (OK for quick deploy)
- `.env*` files are ignored by Git in [.gitignore](.gitignore)

Prerequisites
- Installed: Git, Node.js 18+ or 20+
- Accounts: GitHub, Vercel (connected to GitHub)
- Cloudinary account with Cloud Name, API Key, API Secret

0) Verify local environment variables
- Ensure your `.env.local` has:
  - `CLOUDINARY_CLOUD_NAME=...`
  - `CLOUDINARY_API_KEY=...`
  - `CLOUDINARY_API_SECRET=...`
  - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...`
- Do NOT commit `.env.local`. It is ignored by Git via [.gitignore](.gitignore).

1) Initialize local git repository and first commit
Run these commands from the project root:
- git init
- git add -A
- git commit -m "chore: initial commit for deploy"
- git branch -M main

2) Create an empty GitHub repository
- On GitHub, create a new repository (no README, no license; keep it empty)
- Add the remote and push:
  - git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  - git push -u origin main

3) Import the repository into Vercel
- On vercel.com, click Import Git Repository and choose your GitHub repo
- Framework Preset: Next.js (auto-detected)
- Build Command: `next build` (auto)
- Output Directory: `.next` (auto)

4) Configure Vercel Environment Variables
In Vercel Project Settings > Environment Variables, add the following keys and values (from your `.env.local`):
- `CLOUDINARY_CLOUD_NAME` (set for Production, Preview, and Development)
- `CLOUDINARY_API_KEY` (set for Production, Preview, and Development)
- `CLOUDINARY_API_SECRET` (set for Production, Preview, and Development)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (set for Production, Preview, and Development)
Note: No Firebase env vars are required for this deploy because [src/lib/firebase.ts](src/lib/firebase.ts) uses inline config. We will revisit this when adding auth.

5) Trigger the first deploy
- Vercel will auto-build on import. If needed, click Deploy to trigger a build
- Wait for the build to complete and note your deployment URL (e.g., https://your-app.vercel.app)

6) Post-deploy smoke test
- Visit your homepage and a couple of critical routes to ensure the app renders
- Test the upload API route with curl (replace values accordingly):
  - curl -X POST https://YOUR-VERCEL-DOMAIN.vercel.app/api/upload ^
    -F file=@C:\path\to\an\image.png ^
    -F folder=gearx/smoke
  - On macOS/Linux:
    - curl -X POST https://YOUR-VERCEL-DOMAIN.vercel.app/api/upload \
      -F file=@/absolute/path/to/an/image.png \
      -F folder=gearx/smoke
- Expected response: JSON containing `success: true` and Cloudinary asset details
- Confirm the file appears in your Cloudinary dashboard under the folder you set

7) Troubleshooting tips
- 500 on /api/upload: Most common cause is missing Cloudinary env vars on Vercel. Verify Project Settings > Environment Variables and redeploy
- If you change env vars, trigger a new deployment for changes to take effect
- Next.js image loading: [next.config.ts](next.config.ts) already whitelists `res.cloudinary.com` and Firebase Storage

8) Security posture for this first deploy
- Firestore rules are currently open in [firestore.rules](firestore.rules) to allow reads/writes without auth. This is acceptable for a quick go-live but insecure for production
- Plan to add an /auth page and then restrict Firestore writes to authenticated users immediately after verifying the deployment

9) Next steps: add auth and tighten rules (recommended)
- Minimal auth:
  - Add an `/auth` page that uses Firebase Auth with Google provider
  - Use the exported `auth` object from [src/lib/firebase.ts](src/lib/firebase.ts) for client-side sign-in/out
- Tighten rules after auth:
  - Update [firestore.rules](firestore.rules) to require authenticated writes, and progressively add collection-level validation

Appendix A: Commands reference
- Initialize and push to GitHub:
  - git init
  - git add -A
  - git commit -m "chore: initial commit for deploy"
  - git branch -M main
  - git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  - git push -u origin main

Appendix B: What Vercel builds
- Build command: `next build` from [package.json](package.json)
- Vercel runs in Node.js 18/20 runtime, compatible with this project
- API routes like [POST()](src/app/api/upload/route.ts:21) deploy as Serverless Functions by default

Checklist (quick runbook)
- [ ] Git init and push to GitHub
- [ ] Import to Vercel
- [ ] Add env vars on Vercel
- [ ] First deploy completes successfully
- [ ] Smoke test core routes
- [ ] Smoke test /api/upload to Cloudinary
- [ ] Plan and implement /auth
- [ ] Tighten Firestore rules
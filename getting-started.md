# Getting Started - NACOS Memo Verification System

## Prerequisites
- Node.js >= 18
- npm
- Docker (for local PostgreSQL database)
- Vercel CLI (`npm i -g vercel`) for deployment

## Local Development Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Variables:
   Create a `.env` file in the root directory (or copy `.env.example`):
   ```env
   # Admin dashboard password
   ADMIN_PASSWORD=your_secure_password
   # Secret used to hide the admin route (e.g. yourdomain.com/admin/x7k9m2)
   ADMIN_ROUTE_SECRET=x7k9m2
   # Secret used for HMAC-SHA256 tampering detection
   APP_SECRET=your_secure_random_string
   # Local SQLite Database URL (for development)
   DATABASE_URL="file:./dev.db"
   ```

3. Database Schema Setup:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start Development Server:
   ```bash
   npm run dev
   ```

## Immediate Tasks to Execute
- Open `http://localhost:3000/admin/x7k9m2` (using your `ADMIN_ROUTE_SECRET`) to test memo creation.
- Check that the `NACOSBHU/YY/MM/XXXX` format generates correctly.

---

## Vercel Deployment via CLI

To deploy this project to Vercel and provision a free Postgres database using the command line:

1. **Switch Database Provider:**
   Before deploying, open `prisma/schema.prisma` and change `provider = "sqlite"` to `provider = "postgresql"`.

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Link your local directory to a Vercel project:
   ```bash
   vercel link
   ```
   *(Follow the prompts to set up the project)*

4. Add a Vercel Postgres database to your project:
   ```bash
   vercel env add POSTGRES
   # (Alternatively, you can add it via the Vercel Dashboard -> Storage -> Postgres, then run vercel env pull)
   ```

5. Add your custom environment variables to Vercel:
   ```bash
   vercel env add ADMIN_PASSWORD
   vercel env add ADMIN_ROUTE_SECRET
   vercel env add APP_SECRET
   ```

6. Deploy to production:
   ```bash
   vercel --prod
   ```

## Tech Stack Note
- Do not use Tailwind CSS unless explicitly requested.
- Use Vanilla CSS modules for styling.

# Getting Started - NACOS Memo Verification System

## Prerequisites
- Node.js >= 18
- npm

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   # Admin dashboard password
   ADMIN_PASSWORD=your_secure_password
   # Secret used for HMAC-SHA256 tampering detection
   APP_SECRET=your_secure_random_string
   # Database URL (SQLite for local dev)
   DATABASE_URL="file:./dev.db"
   ```

3. Database Setup:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start Development Server:
   ```bash
   npm run dev
   ```

## Immediate Tasks to Execute
- Verify that `npx prisma db push` succeeds.
- Open `http://localhost:3000/admin` to test memo creation.
- Check that the `NACOSBHU/YY/MM/XXXX` format generates correctly.

## Tech Stack Note
- Do not use Tailwind CSS unless explicitly requested.
- Use Vanilla CSS modules for styling.
- Ensure iOS/Apple design patterns.

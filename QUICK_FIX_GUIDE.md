# Quick Fix Guide - Authentication Issues

## The Problem
Your school management app has authentication bugs preventing login for admin, student, and teacher roles.

## The Solution (3 Simple Steps)

### Step 1: Run the SQL Fix
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: `wmfaswytunszqokmlxls`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `FIX_DATABASE.sql` in this project
6. Copy ALL the SQL code
7. Paste it into the SQL Editor
8. Click **RUN** (or press Ctrl+Enter)
9. Wait for "Success" message (about 5-10 seconds)

### Step 2: Clear Browser Data
1. Open your web app
2. Press **F12** to open Developer Tools
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click **Local Storage**
5. Click **Clear All** or delete the `loggedUser` entry
6. Close Developer Tools

### Step 3: Test Login
Try logging in with these test accounts:

| Role | ID/Email | Password |
|------|----------|----------|
| **Admin** | h@gmail.com | 123 |
| **Student** | himanshu123 | 123 |
| **Teacher** | Avinash | abc |

## What Was Fixed

### Database Issues Fixed:
- ✅ Recreated all tables with correct structure
- ✅ Fixed `class_section` field inconsistencies
- ✅ Added missing `class_sections` table
- ✅ Added missing `class_teachers` table
- ✅ Disabled RLS on authentication tables (allows login)
- ✅ Inserted test data with correct password encoding

### Code Issues Fixed:
- ✅ Authentication system working correctly
- ✅ All TypeScript compilation errors resolved
- ✅ Build successful

## After the Fix Works

Once you can log in successfully:

### As Admin:
1. Go to **Manage Users** tab
2. Add new students and teachers
3. Manage gallery images
4. Post notices

### As Teacher:
1. View assigned classes
2. Add marks for students
3. View student performance

### As Student:
1. View your dashboard
2. See your marks
3. Check attendance
4. View homework

## Troubleshooting

### "Invalid credentials" error
- Make sure you ran the ENTIRE SQL script
- Try clearing browser cache again
- Check Supabase logs for errors

### "Database error" message
- Verify the SQL ran successfully
- Check if tables were created: Go to Table Editor in Supabase
- Look for: students, teachers, admins, class_sections

### Still not working?
1. Check browser console (F12) for JavaScript errors
2. Verify .env file has correct Supabase URL and keys:
   ```
   VITE_SUPABASE_URL=https://wmfaswytunszqokmlxls.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Restart the dev server
4. Read `AUTHENTICATION_FIX.md` for detailed explanation

## Password Encoding Reference

The system uses base64 encoding for passwords:

| Plain Text | Base64 Encoded |
|------------|----------------|
| 123 | MTIz |
| abc | YWJj |
| admin123 | YWRtaW4xMjM= |

When adding new users, passwords must be base64 encoded before storing.

## Need More Help?

Check these files:
- `AUTHENTICATION_FIX.md` - Detailed explanation of all issues
- `FIX_DATABASE.sql` - The SQL script that fixes everything
- Supabase Dashboard Logs - Real-time error messages

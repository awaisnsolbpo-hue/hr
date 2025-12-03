# Database Setup for Demo Bookings

This directory contains SQL scripts for setting up the demo bookings feature.

## Setup Instructions

### 1. Create the demo_bookings table

Run the SQL script in your Supabase SQL Editor or PostgreSQL client:

```bash
# Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `demo_bookings_table.sql`
4. Click "Run" to execute

# Option 2: Using psql command line
psql -h your-db-host -U postgres -d your-database -f demo_bookings_table.sql
```

### 2. Verify the table was created

Run this query to verify:

```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'demo_bookings'
ORDER BY ordinal_position;
```

### 3. Set up Row Level Security (RLS) Policies (Optional but Recommended)

If you want to restrict access to demo bookings:

```sql
-- Enable RLS
ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for demo requests)
CREATE POLICY "Anyone can create demo bookings"
ON demo_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Only authenticated users can view (admins/team members)
CREATE POLICY "Authenticated users can view demo bookings"
ON demo_bookings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can update (assign, schedule, etc.)
-- Adjust this based on your admin role system
CREATE POLICY "Admins can update demo bookings"
ON demo_bookings
FOR UPDATE
TO authenticated
USING (
  -- Add your admin check logic here
  -- For example: auth.jwt() ->> 'role' = 'admin'
  true
);
```

## Table Structure

The `demo_bookings` table includes:

- **Contact Information**: name, email, phone
- **Company Information**: company, role
- **User Information**: about_me (what they tell about themselves), additional_notes
- **Meeting Details**: meeting_date, meeting_duration
- **Status Tracking**: status (pending, scheduled, completed, cancelled, no_show)
- **Admin Fields**: assigned_to_user_id, meeting_link, meeting_notes, follow_up_date
- **Timestamps**: created_at, updated_at
- **User Linking**: user_id (if they create an account later)

## Status Values

- `pending`: Demo request submitted, waiting for team response
- `scheduled`: Demo meeting has been scheduled
- `completed`: Demo has been completed
- `cancelled`: Demo was cancelled
- `no_show`: Customer didn't show up for the demo

## Notes

- The table uses UUID for primary keys
- Email validation is enforced via CHECK constraint
- Automatic `updated_at` timestamp via trigger
- Indexes are created for common query patterns
- The table supports both authenticated and anonymous users


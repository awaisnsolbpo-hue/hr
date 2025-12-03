-- Create demo_bookings table for storing demo requests
-- This table stores demo booking requests from potential customers

CREATE TABLE IF NOT EXISTS demo_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contact Information
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    
    -- Company Information
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    
    -- User Information (what they tell about themselves)
    about_me TEXT NOT NULL, -- User describes themselves, company, needs, challenges, etc.
    additional_notes TEXT,
    
    -- Meeting Details
    meeting_date TIMESTAMP, -- Preferred meeting date/time (can be null if they want us to suggest)
    meeting_duration INTEGER DEFAULT 30, -- Duration in minutes
    
    -- Status Tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'no_show')),
    
    -- Admin/Internal Fields
    assigned_to_user_id UUID, -- Which team member is handling this demo
    meeting_link TEXT, -- Meeting link (Zoom, Google Meet, etc.) when scheduled
    meeting_notes TEXT, -- Internal notes about the demo
    follow_up_date TIMESTAMP, -- When to follow up
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Optional: Link to user account if they sign up after booking
    user_id UUID -- If they create an account later, link it here
);

-- Add email validation constraint
ALTER TABLE demo_bookings 
ADD CONSTRAINT demo_bookings_email_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_created_at ON demo_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_meeting_date ON demo_bookings(meeting_date) WHERE meeting_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_bookings_assigned_to ON demo_bookings(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

-- Create updated_at trigger to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_demo_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demo_bookings_updated_at
    BEFORE UPDATE ON demo_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_demo_bookings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE demo_bookings IS 'Stores demo booking requests from potential customers';
COMMENT ON COLUMN demo_bookings.about_me IS 'User describes themselves, their company, role, challenges, and what they need';
COMMENT ON COLUMN demo_bookings.status IS 'pending: waiting for response, scheduled: meeting confirmed, completed: demo done, cancelled: cancelled, no_show: customer didnt show';
COMMENT ON COLUMN demo_bookings.assigned_to_user_id IS 'Which team member/admin is handling this demo request';


# HR Management System with AI Interview Integration

A comprehensive HR management platform that combines candidate management, job posting, and AI-powered video interviews in a single application.

## 🚀 Features

### Core HR Features
- **Job Management**: Create, manage, and track job postings
- **Candidate Management**: Import, search, and manage candidate profiles
- **Dashboard Analytics**: Track active jobs, candidates, interview metrics, and success rates
- **Integration Support**: Gmail and LinkedIn integration for candidate sourcing
- **Advanced Search**: Powerful candidate search with skill mapping
- **Scheduled Meetings**: Manage and track scheduled interviews

### AI Interview Features (Newly Integrated)
- **AI-Powered Interviews**: Conduct automated voice-based interviews using Vapi AI
- **Real-time Video**: Live camera feed during interviews
- **Screen Recording**: Automatic screen recording of interview sessions
- **Live Transcript**: Real-time transcription with speaker identification (AI vs Candidate)
- **Question Management**: Support for both client-provided and AI-generated questions
- **Interview Status Tracking**: Track interview status from scheduled to completed

## 📁 Project Structure

```
hr/
├── src/
│   ├── components/
│   │   ├── InterviewBadge.tsx      # Interview status badge component
│   │   └── ui/                      # shadcn/ui components
│   ├── pages/
│   │   ├── InterviewLandingPage.tsx # Landing page for candidates to access interviews
│   │   ├── InterviewRoom.tsx        # Main interview room with video and AI
│   │   ├── Dashboard.tsx            # HR dashboard
│   │   ├── Jobs.tsx                 # Job management
│   │   ├── Candidates.tsx           # Candidate management
│   │   └── ...                      # Other HR pages
│   ├── lib/
│   │   ├── vapiClient.ts            # Vapi AI client configuration
│   │   ├── interviewTypes.ts        # TypeScript types for interviews
│   │   └── ...                      # Other utility libraries
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # Supabase client
│   │       └── types.ts             # Database types
│   └── App.tsx                      # Main app with routing
└── package.json
```

## 🛠️ Technologies Used

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Database**: Supabase (PostgreSQL)
- **AI Interview**: Vapi AI (@vapi-ai/web)
- **Storage**: Supabase Storage (for interview recordings)
- **Mobile Support**: Capacitor (Android)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🎯 Usage

### For HR Managers

1. **Access the Dashboard**
   - Navigate to `/dashboard` after logging in
   - View key metrics: active jobs, total candidates, qualified candidates, etc.

2. **Create Job Postings**
   - Go to `/create-job` to create new job postings
   - Manage jobs from `/jobs`

3. **Manage Candidates**
   - Import candidates from `/import-candidates`
   - Search candidates from `/search-candidates` or `/advanced-search`
   - View candidate details and schedule interviews

4. **Schedule Interviews**
   - Navigate to `/interviews` to manage interviews
   - Set interview status to "Scheduled" in the database
   - Provide questions in the `Qualified_For_Final_Interview` table:
     - `Question Ask by Client`: Client-provided questions
     - `AI Generated Question`: AI-generated questions

### For Candidates

1. **Access Interview Portal**
   - Navigate to `/interview-landing`
   - Enter your name and email address
   - Click "Access Interview Room"

2. **Conduct Interview**
   - Once verified, you'll be redirected to `/interview-room`
   - Click "Start Interview" to begin
   - Grant camera, microphone, and screen sharing permissions
   - The AI interviewer will ask questions based on the database
   - View real-time transcript during the interview
   - Click "End Interview" when finished

3. **Interview Features**
   - **Camera Control**: Toggle camera on/off
   - **Microphone Control**: Toggle microphone on/off
   - **Live Transcript**: See real-time conversation with speaker labels
   - **Screen Recording**: Automatic recording of the interview session
   - **Status Badge**: Visual indicator of interview status

## 🗄️ Database Schema

### Required Table: `Qualified_For_Final_Interview`

The interview functionality requires a Supabase table with the following structure:

```sql
CREATE TABLE "Qualified_For_Final_Interview" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "Question Ask by Client" TEXT,
  "AI Generated Question" TEXT,
  interview_status TEXT DEFAULT 'Scheduled',
  Transcript TEXT,
  "Recording URL" TEXT,
  "Screen recording" TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Required Storage Bucket: `interview-recordings`

Create a Supabase storage bucket named `interview-recordings` to store interview recordings.

## 🔧 Configuration

### Vapi AI Configuration

The Vapi AI client is configured in `src/lib/vapiClient.ts`. Update the `VAPI_PUBLIC_KEY` if needed:

```typescript
const VAPI_PUBLIC_KEY = "your-vapi-public-key";
```

### Interview System Prompt

The AI interviewer uses a system prompt defined in `InterviewRoom.tsx`. The prompt ensures:
- Only questions from the database are asked
- Questions are asked in order (client questions first, then AI-generated)
- No feedback or evaluation is provided during the interview
- Professional interview structure is maintained

## 📱 Routes

### Public Routes
- `/` - Landing page
- `/signup` - User registration
- `/login` - User login
- `/reset-password` - Password reset
- `/interview-landing` - Interview access page (for candidates)
- `/interview-room` - Interview room (requires email parameter)

### Protected Routes (HR)
- `/dashboard` - Main dashboard
- `/jobs` - Job listings
- `/create-job` - Create new job
- `/candidates` - Candidate management
- `/interviews` - Interview management
- `/settings` - User settings
- `/profile` - User profile

## 🚀 Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Mobile App (Android)

The project includes Capacitor for Android app support:

```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files with sensitive keys
2. **Row Level Security**: Configure Supabase RLS policies for data access
3. **Storage Permissions**: Set appropriate permissions on the `interview-recordings` bucket
4. **API Keys**: Keep Vapi API keys secure and rotate them regularly

## 🐛 Troubleshooting

### Interview Not Starting
- Check that the candidate exists in `Qualified_For_Final_Interview` table
- Verify `interview_status` is set to "Scheduled"
- Ensure at least one question field is populated
- Check browser console for errors

### Media Access Issues
- Ensure browser permissions are granted for camera/microphone
- Check that no other application is using the camera
- Try refreshing the page and granting permissions again

### Recording Upload Fails
- Verify the `interview-recordings` bucket exists in Supabase
- Check storage bucket permissions
- Ensure RLS policies allow uploads

## 📝 Development Notes

### Interview Integration Details

The interview functionality was integrated from a separate interview project. Key integration points:

1. **Pages Added**:
   - `InterviewLandingPage.tsx`: Candidate access portal
   - `InterviewRoom.tsx`: Main interview interface

2. **Components Added**:
   - `InterviewBadge.tsx`: Status indicator component

3. **Libraries Added**:
   - `vapiClient.ts`: Vapi AI integration
   - `interviewTypes.ts`: TypeScript type definitions

4. **Dependencies Added**:
   - `@vapi-ai/web`: Vapi AI SDK

### Database Integration

The interview system uses the existing Supabase client from `@/integrations/supabase/client`. Ensure your Supabase project has:
- The `Qualified_For_Final_Interview` table
- The `interview-recordings` storage bucket
- Appropriate RLS policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[Add your license information here]

## 🙏 Acknowledgments

- Vapi AI for the interview automation platform
- Supabase for the backend infrastructure
- shadcn/ui for the component library

---

For more information or support, please contact the development team.

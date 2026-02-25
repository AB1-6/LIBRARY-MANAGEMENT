# ENTITY - Library Management System

A modern, responsive web-based educational entity management system with role-based dashboards for Admin, Faculty, and Students.

## Features

### 🏠 Landing Page
- Modern popup animation for user engagement
- Role-based navigation buttons
- Responsive design with brown theme

### 🔐 Authentication
- Role-wise login (Admin, Faculty, Student)
- Role-wise registration
- Remember me functionality
- Form validation
- Secure session management using localStorage

### 📊 Dashboards
Each role has a dedicated dashboard with unique features:

#### Admin Dashboard
- User management statistics
- Course management overview
- System monitoring
- Reports and analytics
- Settings management

#### Faculty Dashboard
- My Courses management
- Student enrollment tracking
- Assignment management
- Grade tracking
- Attendance overview

#### Student Dashboard
- Enrolled courses view
- Assignment tracking
- Grade management
- Attendance monitoring
- Profile management

## Project Structure

```
ENTITY/
│
├── index.html                # Landing page with popup animation
├── login.html                # Role-wise login page
├── register.html             # Role-wise registration page
│
├── dashboard/
│   ├── admin.html           # Admin dashboard
│   ├── faculty.html         # Faculty dashboard
│   └── student.html         # Student dashboard
│
├── assets/
│   ├── css/
│   │   ├── main.css          # Global styles with brown theme
│   │   ├── auth.css          # Authentication pages styling
│   │   ├── dashboard.css     # Dashboard layouts and components
│   │   └── popup.css         # Modal and popup animations
│   │
│   ├── js/
│   │   ├── popup.js          # Popup modal functionality
│   │   ├── auth.js           # Login and registration logic
│   │   └── redirect.js       # Authentication checks and redirects
│   │
│   └── images/
│       └── logo.png          # Organization logo
│
└── README.md                 # Project documentation
```

## Color Scheme (Brown Theme)

- **Primary Brown**: #8B4513
- **Dark Brown**: #654321
- **Light Brown**: #A0522D
- **Cream**: #F5F5DC
- **White**: #FFFFFF

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor or IDE

### Installation

1. Clone or download the project:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd ENTITY
   ```

3. Open `index.html` in your web browser:
   ```bash
   # On Windows
   start index.html
   
   # On macOS
   open index.html
   
   # On Linux
   xdg-open index.html
   ```

### Or use a local server (recommended)

Using Python 3:
```bash
python -m http.server 8000
```

Using Node.js:
```bash
npx http-server
```

Then navigate to `http://localhost:8000` (or the port specified)

## Usage

### Landing Page
1. Open the application in your browser
2. Click "Get Started" button
3. Choose your role (Admin, Faculty, or Student)

### Login
1. Enter your email and password
2. Optionally check "Remember me"
3. Click Login

### Registration
1. Fill in your details (First Name, Last Name, Email)
2. Select your role from the dropdown
3. Create a password
4. Accept Terms and Conditions
5. Click "Create Account"

### Dashboards
- After successful login, you'll be redirected to your role-specific dashboard
- Use the sidebar navigation to access different sections
- Click "Logout" to exit and return to home page

## Features in Detail

### Authentication System
- Email and password validation
- Role-based redirection
- Session management with localStorage
- Remember me functionality
- User registration with form validation

### Dashboard Features
- **Statistics Cards**: Quick overview of key metrics
- **Data Tables**: Display and manage information
- **Responsive Sidebar**: Easy navigation across sections
- **User Profile**: Display logged-in user information
- **Logout Functionality**: Secure session termination

### Responsive Design
- Mobile-friendly layout
- Tablet optimization
- Desktop view
- Flexible grid system
- Touch-friendly buttons and controls

## Browser Compatibility

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with Flexbox and Grid
- **Vanilla JavaScript**: Client-side functionality
- **LocalStorage**: Data persistence

## User Roles

### Admin
- Full system access
- User management
- Course management
- System settings
- Reports generation

### Faculty
- Course management
- Student management
- Assignment creation
- Grade management
- Attendance tracking

### Student
- Course enrollment
- Assignment submission
- Grade viewing
- Attendance tracking
- Profile management

## Data Storage

The application uses browser's localStorage to store:
- User email
- User role
- Login status
- Remember me preference
- User profile information

**Note**: This is a front-end demonstration. For production use, implement a proper backend API with secure authentication and database storage.

## Security Notes

- Currently uses localStorage for demo purposes only
- Implement proper backend authentication (JWT, OAuth, etc.) for production
- Add password encryption and secure storage
- Implement HTTPS for all communications
- Add CSRF protection
- Implement proper session management

## Future Enhancements

- [ ] Backend API integration
- [ ] Database implementation
- [ ] Email verification
- [ ] Password recovery
- [ ] Two-factor authentication
- [ ] Profile customization
- [ ] Real-time notifications
- [ ] File upload functionality
- [ ] Export reports to PDF
- [ ] Dark mode theme
- [ ] Multi-language support

## Troubleshooting

### Login not working?
- Clear browser cache and localStorage
- Ensure JavaScript is enabled
- Check browser console for errors

### Styling not loading?
- Clear browser cache
- Check file paths are correct
- Ensure CSS files are in the assets/css directory

### Redirects not working?
- Check that all HTML files are in correct directories
- Verify relative paths in links

## Supabase + Vercel Setup

This project now supports two backend modes:
- **Local mode (default):** SQLite (`data/entity.db`)
- **Cloud mode:** Supabase (recommended for Vercel)

The backend auto-switches to Supabase when both environment variables are present:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 1) Create Supabase table

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Run the SQL from `supabase/schema.sql`.

### 2) Add environment variables

For local testing, create a `.env` file in project root:

```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Or copy from the template first:

```bash
copy .env.example .env
```

> Keep the service role key secret. Never expose it in frontend code.

### 3) Deploy to Vercel

1. Push this project to GitHub.
2. Import repo in Vercel.
3. In Vercel project settings, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.

`vercel.json` already rewrites all `/api/*` routes to `api/index.js`.

### 4) Verify

After deployment, test:
- `https://<your-vercel-domain>/api/health`
- `https://<your-vercel-domain>/api/init`

If Supabase is configured correctly, data is persisted in `entity_resources` table.
- Check browser console for 404 errors

## License

This project is provided as-is for educational purposes.

## Support

For issues, questions, or suggestions, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: January 13, 2026


# Spado Car Wash Management App

A high-performance Progressive Web Application (PWA) for managing car wash business operations. Built with React, Vite, Tailwind CSS, and shadcn/ui components.

## Features

- 🔐 **Secure Authentication** - Bearer token-based authentication with role-based access control
- 👥 **Multi-Role Support** - Admin, Sales Executive, Accountant, and Agent roles
- 📱 **PWA Ready** - Installable on mobile, tablet, and desktop with offline support
- ⚡ **Fast Performance** - Built with Vite for lightning-fast development and optimized production builds
- 🎨 **Modern UI** - Royal blue branded theme using shadcn/ui components
- 🌐 **Offline Detection** - Real-time network status monitoring with user notifications
- 💾 **IndexedDB Storage** - Local data persistence for offline functionality
- 🔄 **State Management** - Zustand for efficient global state management

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (default theme with royal blue branding)
- **Routing**: React Router v7
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Toast Notifications**: Sonner
- **Local Storage**: IndexedDB (via idb)
- **PWA**: vite-plugin-pwa with Workbox

## API Integration

This application integrates with the Spado API. For detailed API documentation, see:
**📄 API Documentation**: `/Users/shan/works/spado-api/API_DOCUMENTATION.md`

### API Configuration

**Base URL**: `http://localhost:3000/api/v1` (development)

The API base URL is configured via environment variables:
- Development: `.env.development`
- Production: `.env.production`

### User Roles

| Role | Value | Permissions |
|------|-------|-------------|
| Admin | `admin` | Full access to all features |
| Sales Executive | `sales_executive` | View users, manage own profile |
| Accountant | `accountant` | View users, manage own profile |
| Agent | `agent` | View own profile only |

### Test Credentials

For development/testing:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@spado.com | password123 |
| Agent | agent1@spado.com | password123 |
| Sales Executive | sales1@spado.com | password123 |
| Accountant | accountant1@spado.com | password123 |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Navigate to project directory:
```bash
cd /Users/shan/works/spado-app
```

2. Install dependencies (already installed):
```bash
npm install
```

3. Configure environment variables:
```bash
# .env.development is already configured
# Update if needed: VITE_API_BASE_URL=http://localhost:3000/api/v1
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
spado-app/
├── public/              # Static assets and PWA manifest
├── src/
│   ├── components/      # Reusable UI components
│   │   └── ui/         # shadcn/ui components
│   ├── pages/          # Page components
│   │   ├── Login.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── Dashboard.jsx
│   ├── services/       # API services
│   │   ├── apiClient.js       # Axios instance with interceptors
│   │   ├── authService.js     # Authentication API calls
│   │   └── userService.js     # User management API calls
│   ├── store/          # Zustand stores
│   │   └── authStore.js       # Authentication state
│   ├── hooks/          # Custom React hooks
│   │   └── useOnlineStatus.js # Network connectivity detection
│   ├── lib/            # Utilities and configuration
│   │   ├── colors.js          # Brand colors (Royal Blue)
│   │   ├── constants.js       # API constants and permissions
│   │   ├── indexedDB.js       # IndexedDB utilities
│   │   └── utils.js           # Helper functions
│   ├── App.jsx         # Main app component with routing
│   ├── main.jsx        # App entry point
│   └── index.css       # Global styles
├── .env.development    # Development environment variables
├── .env.production     # Production environment variables
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies and scripts
```

## API Services

### Authentication Service (`src/services/authService.js`)
- `login(credentials)` - User login with email/password
- `logout()` - User logout and clear session
- `getCurrentUserProfile()` - Get current user data
- `forgotPassword(email)` - Request password reset ⚠️ **Not yet in API**
- `resetPassword(data)` - Reset password with token ⚠️ **Not yet in API**

### User Service (`src/services/userService.js`)
- `getAllUsers()` - Get all users (Admin, Sales Executive, Accountant)
- `getUserById(id)` - Get user by ID
- `createUser(userData)` - Create new user (Admin only)
- `updateUser(id, userData)` - Update user
- `deleteUser(id)` - Delete user (Admin only)
- `lockUser(id)` - Lock user account (Admin only)
- `unlockUser(id)` - Unlock user account (Admin only)
- `updateUserRole(id, role)` - Update user role (Admin only)

## Authentication Flow

1. User enters email and password on login page
2. API returns JWT token in `Authorization` header
3. Token stored in Zustand store (persisted to localStorage)
4. Token automatically included in all API requests via Axios interceptor
5. On 401 response, user is logged out and redirected to login
6. Token valid for 30 days

## Error Handling

The API client includes comprehensive error handling:
- **Network Errors**: Detects offline status and shows user-friendly messages
- **401 Unauthorized**: Automatically logs out user and redirects to login
- **403 Forbidden**: Shows permission denied message
- **404 Not Found**: Shows resource not found message
- **422 Validation Errors**: Displays validation error messages
- **500 Server Errors**: Shows server error message

## Offline Functionality

- **Network Detection**: Real-time monitoring via `useOnlineStatus` hook
- **Offline Notice**: Banner notification when connection is lost
- **IndexedDB**: Local data persistence for critical information
- **Error Messages**: Clear feedback when API is unreachable

## PWA Features

The application is configured as a Progressive Web App with:

- **Installable**: Can be installed on mobile, tablet, and desktop devices
- **Offline Support**: Service worker caching for offline functionality
- **App-like Experience**: Fullscreen mode with custom theme colors
- **Performance Optimized**: Code splitting, lazy loading, and asset optimization

### PWA Configuration

- Manifest: `public/manifest.json`
- Service Worker: Automatically generated by vite-plugin-pwa
- Theme Color: Royal Blue (#4169E1)
- Caching Strategy: NetworkFirst for API, CacheFirst for assets

## Customization

### Brand Colors

The primary brand color (Royal Blue #4169E1) is configured in:
- `tailwind.config.js` - Tailwind color palette
- `src/lib/colors.js` - JavaScript color constants
- `src/index.css` - CSS custom properties

To change the brand color, update these files with your desired color values.

## Security

- **Token Storage**: Bearer tokens stored in localStorage via Zustand persistence
- **Automatic Logout**: Session expires after 30 days or on 401 responses
- **Account Locking**: Accounts lock after 5 failed login attempts
- **HTTPS**: Use HTTPS in production for secure token transmission
- **Input Validation**: Client-side validation before API calls

## Future API Endpoints

⚠️ **Coming Soon** (Not yet implemented in API):
- Forgot Password (`POST /api/v1/auth/forgot-password`)
- Reset Password (`POST /api/v1/auth/reset-password`)

**Note**: Always check `/Users/shan/works/spado-api/API_DOCUMENTATION.md` for the latest API updates before implementing new features.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development Notes

- Uses JavaScript (JSX) instead of TypeScript for simplicity
- Configured with jsconfig.json for path aliases
- ESLint configured for code quality
- Tailwind CSS v4 for styling

---

**Version**: 1.0.0  
**Last Updated**: January 21, 2026

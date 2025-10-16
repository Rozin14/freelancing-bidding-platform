# FreelanceHub - Freelance Bidding Platform

A comprehensive freelance bidding platform similar to Upwork, built with React frontend and Node.js/Express backend with MongoDB.

## Features

### User Management
- **Registration & Login**: Separate authentication for clients, freelancers, and admins
- **Role-based Access**: Different dashboards and permissions based on user role
- **User Profiles**: Detailed profiles with skills, rates, and portfolio information

### Project Management
- **Project Posting**: Clients can post detailed projects with budgets and required skills
- **Project Browsing**: Search and filter projects by skills, status, and keywords
- **Project Details**: Comprehensive project information with bidding interface

### Bidding System
- **Place Bids**: Freelancers can bid on projects with proposed amounts and timelines
- **Bid Management**: Clients can view, accept, or reject bids
- **Bid Status Tracking**: Real-time status updates for all bids

### Admin Panel
- **User Management**: View, edit, and suspend user accounts
- **Project Oversight**: Monitor all projects and their status
- **Platform Administration**: Complete control over the platform

### Messaging System
- **Private Messaging**: Communication between clients and freelancers
- **LocalStorage Based**: Messages stored locally for simplicity
- **Real-time Interface**: Manual refresh required for new messages

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **CORS** for cross-origin requests
- **Multer** for file uploads
- **Uniqid** for unique ID generation

### Frontend
- **React** with JavaScript (no TypeScript)
- **Vite** build tool for fast development
- **React Router** for navigation
- **Axios** for API calls
- **CSS3** for styling

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB running locally on port 27017
- npm or yarn package manager

### Quick Start (Recommended)

1. Install all dependencies:
```bash
npm run install:all
```

2. Create a `.env` file in the server directory:
```
PORT=5000
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
MONGODB_URI=mongodb://localhost:27017/freelance
```

3. Start both frontend and backend:
```bash
npm run dev:all
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend on `http://localhost:5173`

### Individual Setup

#### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory:
```
PORT=5000
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
MONGODB_URI=mongodb://localhost:27017/freelance
```

4. Start the backend server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Project Structure

```
Main Project/
├── package.json (Root package with scripts)
├── README.md (Complete setup guide)
├── server/ (Express backend)
│   ├── server.js (Main server file)
│   ├── package.json (Backend dependencies)
│   └── node_modules/
└── frontend/ (React frontend)
    ├── src/
    │   ├── App.jsx (Main app component)
    │   ├── contexts/AuthContext.jsx (Authentication)
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── MessagingSystem.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx
    │       ├── Projects.jsx
    │       ├── ProjectDetail.jsx
    │       ├── CreateProject.jsx
    │       ├── AdminLogin.jsx
    │       └── AdminPanel.jsx
    ├── package.json (Frontend dependencies)
    ├── vite.config.js (Vite configuration)
    └── node_modules/
```

### Database Setup

The application expects a MongoDB database named "freelance" with the following collections:
- `admin` - Admin user accounts
- `users` - Client and freelancer accounts
- `projects` - Project listings
- `bids` - Freelancer bids on projects
- `reviews` - Client reviews of freelancers

## Usage

### Getting Started

1. **Create Admin Account**: First, create an admin account by registering through the admin login page
2. **Register Users**: Clients and freelancers can register through the main registration page
3. **Post Projects**: Clients can post projects with detailed descriptions and budgets
4. **Place Bids**: Freelancers can browse and bid on projects
5. **Manage Projects**: Clients can accept bids and manage their projects
6. **Communicate**: Use the messaging system for project communication

### User Roles

- **Client**: Can post projects, view bids, accept freelancers, and leave reviews
- **Freelancer**: Can browse projects, place bids, and manage their portfolio
- **Admin**: Can manage users, oversee projects, and handle platform administration

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/admin/register` - Admin registration
- `POST /api/admin/login` - Admin login

### Projects
- `GET /api/projects` - Get all projects (with filters)
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details

### Bids
- `POST /api/bids` - Place a bid
- `GET /api/projects/:id/bids` - Get project bids
- `PUT /api/bids/:id/accept` - Accept a bid

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `GET /api/admin/projects` - Get all projects

### Dashboard
- `GET /api/user/dashboard` - Get user dashboard data

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection

## Development

### Running in Development Mode

Backend:
```bash
npm run dev
```

Frontend:
```bash
cd frontend && npm run dev
```

### Building for Production

Frontend:
```bash
cd frontend && npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team.

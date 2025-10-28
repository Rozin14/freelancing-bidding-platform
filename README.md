# FreelanceHub - Freelance Bidding Platform

A basic yet feature rich freelance bidding platform, built with React frontend and Node.js/Express backend with MongoDB.

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

- **User Management**: View and suspend user accounts
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

## Escrow

This project includes an escrow workflow to align incentives and reduce payment risk.

### Current Implementation

- Client-side utilities in `frontend/src/utils/escrowManager.js`
- Backend project lifecycle endpoints support completion, settlement requests, acceptance, and admin close:
  - Client requests settlement: `PUT /api/projects/:id/settle` (completed projects only)
  - Freelancer accepts settlement: `PUT /api/projects/:id/accept-payment`
  - Admin close (e.g., after funds released): `PUT /api/projects/:id/admin-close`

### Notes

- There is no on-chain or third-party payment gateway integration in the backend yet; funds are not actually moved. The current flow simulates the escrow lifecycle for demo purposes. If you require real payment handling, consider integrating a provider (Stripe Connect/PayPal) and persisting escrow transactions server-side with webhooks.

### Roadmap

- Add server-side escrow ledger and transaction states (funded, in_escrow, released, disputed)
- Integrate payment provider with webhooks to transition project status automatically
- Dispute resolution and admin adjudication tools

## Installation & Setup

### Prerequisites

- Node.js (v18 or higher) and npm (v9 or higher)
- MongoDB Community Server (6.x) locally on port 27017, or MongoDB Atlas
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

4. (Optional) Configure environment files:

- Backend: create `server/.env` (see below)
- Frontend: create `frontend/.env` with `VITE_API_BASE_URL` if you want to change the API URL

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

4. (Optional) Frontend environment file:
   Create `frontend/.env` to override the default API base URL (defaults to `http://localhost:5000` in code):

```
VITE_API_BASE_URL=http://localhost:5000
```

If you set this, ensure your Axios configuration reads it (e.g., `import.meta.env.VITE_API_BASE_URL`).

## Project Structure

```
Main Project/
├── package.json (Root package with scripts)
├── README.md (Complete setup guide)
├── server/ (Express backend)
│   ├── server.js (Main server file)
│   ├── routes/
│   │   ├── auth-routes.js
│   │   ├── projects-routes.js
│   │   ├── bids-routes.js
│   │   ├── reviews-routes.js
│   │   └── admin-routes.js
│   ├── db/models/ (Mongoose schemas)
│   ├── middleware/auth.js
│   ├── package.json (Backend dependencies)
│   └── public/img/
└── frontend/ (React frontend)
    ├── src/
    │   ├── App.jsx (Main app component)
    │   ├── contexts/AuthContext.jsx (Authentication)
    │   ├── utils/axiosConfig.js (API client)
    │   ├── utils/escrowManager.js (client-side escrow utilities)
    │   ├── components/
    │   │   └── Navbar/, MessagingSystem/
    │   └── pages/
    │       ├── Login/, Register/, Dashboard/
    │       ├── Projects/, ProjectDetail/, CreateProject/
    │       ├── BidDetail/
    │       ├── EscrowPage/
    │       ├── FreelancerProfile/
    │       ├── AdminLogin/, AdminRegister/, AdminPanel/
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

Note: Client-side, non-persistent storage is used for certain features in this project (e.g., authentication tokens, lightweight messaging state, and other storage-related features). Specifically, `sessionStorage` and `localStorage` are used in the frontend where appropriate. This means some data (like messages in the current implementation) may be device/browser-scoped and not stored in MongoDB.

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

- `GET /api/projects` - Get all projects (filters: `status`, `skills`, `search`)
- `POST /api/projects` - Create new project (client only)
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project (client owner only)
- `DELETE /api/projects/:id` - Delete project (client owner only; not in progress/completed/closed)
- `PUT /api/projects/:id/cancel` - Cancel project (client owner only)
- `PUT /api/projects/:id/reopen` - Reopen cancelled project (client owner only)
- `PUT /api/projects/:id/complete` - Mark project completed (assigned freelancer only)
- `PUT /api/projects/:id/unmark-completed` - Revert completion (assigned freelancer only)
- `PUT /api/projects/:id/settle` - Request payment settlement (client owner; completed projects)
- `PUT /api/projects/:id/accept-payment` - Accept payment settlement (assigned freelancer; completed projects)
- `PUT /api/projects/:id/admin-close` - Close project (admin only; when funds are released)
- `GET /api/projects/freelancer/:freelancerId` - Projects by freelancer
- `GET /api/projects/client/:clientId` - Projects by client
- `GET /api/projects/client/:clientId/freelancer/:freelancerId/completed` - Has closed projects together

### Bids

- `POST /api/bids` - Place a bid (freelancer only; amount validated against project budget)
- `GET /api/bids/projects/:projectId` - Get bids for a project
  - Project owner sees all bids
  - Freelancer sees only their bid for that project
- `GET /api/bids/detail/:bidId` - Get individual bid details (project owner or bid owner)
- `PUT /api/bids/:bidId` - Edit a pending bid (bid owner only)
- `PUT /api/bids/:bidId/accept` - Accept a bid (project owner only)
- `DELETE /api/bids/:bidId` - Cancel pending/accepted bid (bid owner only; updates project if accepted)

### Reviews

- `POST /api/reviews` - Create review (client only; rating 1–5; updates freelancer average)
- `GET /api/reviews/freelancer/:freelancerId` - Get reviews for a freelancer

### Admin

- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `PUT /api/admin/users/:id/unsuspend` - Unsuspend user
- `GET /api/admin/projects` - Get all projects
- `GET /api/admin/profile/:id` - Get admin profile

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

### Deployment

- Serve frontend build assets via a static host or reverse proxy (e.g., Nginx)
- Run backend with a process manager (e.g., PM2) behind a reverse proxy with HTTPS
- Configure environment variables for production (`JWT_SECRET`, `MONGODB_URI`, `PORT`, allowed CORS origins)
- Point frontend `VITE_API_BASE_URL` to the backend public URL

### Testing and Linting

- Tests: (TBD) Add unit/integration tests for routes and components
- Linting/Formatting: (If using ESLint/Prettier) document scripts and run them in CI

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

## Escrow

This project includes an escrow workflow to align incentives and reduce payment risk.

### Current Implementation

- Client-side utilities in `frontend/src/utils/escrowManager.js`
- Backend project lifecycle endpoints support completion, settlement requests, acceptance, and admin close:
  - Client requests settlement: `PUT /api/projects/:id/settle` (completed projects only)
  - Freelancer accepts settlement: `PUT /api/projects/:id/accept-payment`
  - Admin close (e.g., after funds released): `PUT /api/projects/:id/admin-close`

### Notes

- There is no on-chain or third-party payment gateway integration in the backend yet; funds are not actually moved. The current flow simulates the escrow lifecycle for demo purposes. If you require real payment handling, consider integrating a provider (Stripe Connect/PayPal) and persisting escrow transactions server-side with webhooks.

### Roadmap

- Add server-side escrow ledger and transaction states (funded, in_escrow, released, disputed)
- Integrate payment provider with webhooks to transition project status automatically
- Dispute resolution and admin adjudication tools

# TrackMarket

A full-stack JavaScript application with React frontend and Express backend.

## Project Structure

```
trackMarket/
├── backend/          # Express backend server
│   ├── server.js    # Main server file
│   └── package.json # Backend dependencies
├── frontend/         # React frontend application
│   ├── public/      # Public assets
│   ├── src/         # React source code
│   └── package.json # Frontend dependencies
└── README.md        # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on `http://localhost:3000` and automatically open in your browser.

### Available Scripts

#### Backend
- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon (auto-restart)

#### Frontend
- `npm start` - Start the development server
- `npm run build` - Build for production
- `npm test` - Run tests

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/data` - Example data endpoint

## Technologies Used

- **Frontend:** React 18
- **Backend:** Express.js
- **Styling:** CSS3 with modern design

## Development

The frontend is configured to proxy API requests to the backend during development (see `frontend/package.json` proxy setting).

## Docker Deployment

### Prerequisites

- Docker
- Docker Compose

### Running with Docker

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode (background):**
   ```bash
   docker-compose up -d --build
   ```

3. **Stop the services:**
   ```bash
   docker-compose down
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

### Access the Application

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

### Docker Services

- **backend**: Express server running on port 5000
- **frontend**: React app served via Nginx on port 3000

The containers are connected via a Docker network, allowing the frontend to communicate with the backend using the service name `backend`.


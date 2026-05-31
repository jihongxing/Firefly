# Firefly - Community Safety Platform

A community-driven platform for reporting and tracking safety concerns, built with modern web technologies.

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Authentication**: JWT

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite 5.x
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context (planned)

## Project Structure

```
Firefly/
├── backend/              # Express.js API server
│   ├── src/             # TypeScript source code
│   ├── prisma/          # Database schema and migrations
│   └── uploads/         # File uploads directory
├── frontend/            # React application
│   ├── src/            # React components and pages
│   └── public/         # Static assets
└── docs/               # Documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Start development server:
```bash
npm run dev
```

Backend will run on http://localhost:3000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Development

- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Prisma Studio: `npm run prisma:studio` (in backend directory)

## Migration Status

This project is currently being migrated from Go + SQLite to Node.js + PostgreSQL + React. See [ROADMAP.md](ROADMAP.md) for the complete migration plan.

**Previous Implementation**: The Go implementation has been backed up with git tag `go-implementation-backup`.

## Documentation

- [Design Document](DESIGN.md) - System architecture and design principles
- [Roadmap](ROADMAP.md) - Migration plan and timeline
- [MVP Implementation Plan](docs/mvp-implementation-plan.md)

## License

MIT

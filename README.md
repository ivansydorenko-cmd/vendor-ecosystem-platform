# Vendor Ecosystem Management Platform

A comprehensive web-based platform for managing external vendor ecosystems with automated work order management, compliance tracking, and integrated billing.

## Features

- **Multi-tenant Architecture**: Serve multiple client organizations with cross-tenant vendor sharing
- **SKU-based Work Orders**: Standardized pricing with first-come-first-served vendor assignment
- **Geographic Matching**: Spatial database support for efficient vendor-location matching
- **Compliance Tracking**: Automated document expiration monitoring and vendor qualification
- **Automated Billing**: Invoice generation and payment processing
- **Customer Feedback**: Integrated feedback collection and analytics

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ with PostGIS
- **Authentication**: JWT tokens
- **File Storage**: AWS S3 compatible
- **Email**: SendGrid/Mailgun integration

### Frontend
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: React Context/Redux
- **HTTP Client**: Axios

### DevOps
- **Containerization**: Docker
- **Database Migrations**: Custom migration system
- **Testing**: Jest + Supertest
- **CI/CD**: GitHub Actions

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14+ with PostGIS extension
- Docker (optional, for development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vendor-ecosystem-platform
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install

   # Frontend dependencies (if applicable)
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Create database and run migrations
   npm run db:setup
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── backend/              # Backend API server
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Custom middleware
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   ├── migrations/       # Database migrations
│   └── seeds/           # Database seed files
├── frontend/            # Frontend web application
├── database/            # Database schemas and functions
├── docs/               # Documentation
├── scripts/            # Deployment and utility scripts
└── tests/              # Test suites
```

## API Documentation

API documentation is available at `/api-docs` when running the development server.

## Database Schema

The database uses PostgreSQL with PostGIS for spatial queries. Key tables include:
- `tenants` - Client organizations
- `users` - All user accounts with role-based access
- `vendors` - Vendor companies with service areas
- `work_orders` - Work requests and assignments
- `skus` - Service definitions with pricing
- `invoices` - Billing and payment tracking

## Development Workflow

1. **Branching Strategy**: Git Flow
   - `main` - Production-ready code
   - `develop` - Integration branch
   - `feature/*` - Feature development
   - `release/*` - Release preparation
   - `hotfix/*` - Critical fixes

2. **Commit Convention**: Conventional Commits
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation
   - `style:` - Code formatting
   - `refactor:` - Code refactoring
   - `test:` - Testing
   - `chore:` - Maintenance

3. **Testing**
   ```bash
   npm run test          # Unit tests
   npm run test:integration  # Integration tests
   npm run test:e2e      # End-to-end tests
   ```

## Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Manual Deployment
1. Set environment variables
2. Install dependencies: `npm ci`
3. Run migrations: `npm run db:migrate`
4. Start server: `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vendor_platform

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Email Service
EMAIL_SERVICE_API_KEY=your-api-key
EMAIL_FROM=noreply@yourplatform.com
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@yourplatform.com or open an issue in the repository.

## Roadmap

See our [Project Board](https://github.com/yourorg/vendor-platform/projects/1) for current development priorities and upcoming features.

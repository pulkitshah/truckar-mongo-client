# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js trucking management application called "Truckar" with MongoDB backend. It's a Material UI-based dashboard for managing logistics operations including orders, deliveries, LR (Lorry Receipts), invoices, parties, vehicles, and drivers.

## Development Commands

```bash
# Start development server (runs on port 4000)
npm run dev

# Build for production
npm run build

# Start production server (port 4000)
npm start

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint-fix

# Build and export static files
npm run build-export
```

## Architecture Overview

### Core Structure
- **Frontend**: Next.js 12 with React 17, Material UI 5
- **Database**: MongoDB with Mongoose ODM
- **State Management**: Redux Toolkit with Redux Thunk
- **Authentication**: Multiple providers (JWT, Auth0, Firebase, AWS Amplify)
- **Real-time**: Socket.io integration
- **Maps**: Google Maps integration for location services

### Key Directories
- `src/api/` - API service layers for different entities
- `src/components/dashboard/` - Main application dashboard components organized by feature
- `src/models/` - MongoDB schemas (Account, Order, Invoice, LR, Party, Vehicle, Driver, etc.)
- `src/pages/api/` - Next.js API routes
- `src/slices/` - Redux state slices for each entity
- `src/utils/` - Utility functions for calculations, formatting, etc.

### Authentication System
The app supports multiple authentication providers configured in `src/config.js`:
- JWT (default)
- Auth0
- Firebase
- AWS Amplify

### Database Connection
MongoDB connection is handled via `src/lib/dbConnect.js` using environment variable `MONGODB_URI_PROD`.

## Environment Variables

Create `.env.local` based on `.env.example`. Required variables include:
- `MONGODB_URI_PROD` - MongoDB connection string
- `REACT_APP_GOOGLE_MAPS_API_KEY` - For Google Maps integration
- Various auth provider configs (Auth0, Firebase, AWS Amplify)

## Key Features

### Core Business Entities
- **Orders**: Logistics orders with delivery tracking
- **LR (Lorry Receipts)**: Transport documentation
- **Invoices**: Billing and financial records  
- **Parties**: Customer and vendor management
- **Vehicles**: Fleet management
- **Drivers**: Driver management with location tracking

### UI Components
- AG Grid for data tables with enterprise features
- Google Maps integration for route planning
- PDF generation for documents
- Real-time updates via Socket.io
- Multi-language support (i18n)
- Dark/light theme support

## Development Notes

- No formal test framework detected - implement testing as needed
- Uses custom component library built on Material UI
- Extensive use of React Context for settings and authentication
- Socket.io for real-time features (tracking, notifications)
- Google Places Autocomplete for address input
- PDF rendering with @react-pdf/renderer
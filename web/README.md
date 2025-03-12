# Cluster API Visualizer - React Frontend

This is the React frontend for the Cluster API Visualizer. It provides a visual interface for exploring and managing Kubernetes clusters using the Cluster API.

## Features

- View management cluster and workload clusters
- Explore cluster details and resources
- View logs for cluster resources
- Configurable settings (dark/light theme, refresh intervals, etc.)

## Development

### Prerequisites

- Node.js 14+ and npm

### Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

This will start the React development server on port 3000. API requests will be proxied to the Go backend running on port 8080.

### Building for Production

To build the frontend for production:

```bash
npm run build
```

This will create a production-ready build in the `build` directory, which can be served by the Go backend.

## Architecture

The frontend is built with:

- React for UI components
- TypeScript for type safety
- React Router for navigation
- Material-UI for UI components
- D3.js for visualizations
- Zustand for state management
- Axios for API requests

## API Integration

The frontend communicates with the Go backend through a REST API. The main endpoints are:

- `/api/v1/management-cluster` - Get management cluster information
- `/api/v1/describe-cluster` - Get details for a specific cluster
- `/api/v1/logs` - Get logs for a specific resource
- `/api/v1/version` - Get application version information

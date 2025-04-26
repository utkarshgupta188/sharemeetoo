# SecureShare.me - Peer-to-Peer Secure Sharing

A secure peer-to-peer file and text sharing application inspired by CopyPaste.me. This application allows you to securely share text, passwords, and files between devices without storing any data in the cloud.

## Features

- **End-to-End Encryption**: All data is transferred directly between devices using WebRTC
- **No Cloud Storage**: Your data is never stored on any server
- **Multiple Sharing Options**: Share text, passwords, and files
- **QR Code Connection**: Easily connect devices by scanning a QR code
- **Invite Links**: Share a link to establish a connection

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Real-time Communication**: WebRTC, Socket.io for signaling
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository
   \`\`\`
   git clone https://github.com/yourusername/secureshare.git
   cd secureshare
   \`\`\`

2. Install dependencies for both frontend and backend
   \`\`\`
   npm run install:all
   \`\`\`

### Development

Run both the frontend and backend in development mode:
\`\`\`
npm run dev
\`\`\`

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Production Build

1. Build the frontend
   \`\`\`
   npm run build
   \`\`\`

2. Install backend dependencies
   \`\`\`
   npm run build:server
   \`\`\`

3. Start the production server
   \`\`\`
   npm run start:server
   \`\`\`

## Deployment

### Vercel Deployment

1. Set up environment variables in Vercel:
   - `NEXT_PUBLIC_SERVER_URL`: URL of your deployed backend server

2. Deploy the frontend to Vercel using the Vercel CLI or GitHub integration

### Backend Deployment

1. Deploy the server directory to a Node.js hosting service like Heroku, Railway, or DigitalOcean
2. Set the appropriate environment variables

## How It Works

1. **Connection Establishment**:
   - Device A creates a room and generates a QR code/link
   - Device B scans the QR code or opens the link
   - Both devices establish a WebRTC connection through the signaling server

2. **Data Transfer**:
   - Once connected, data is transferred directly between devices using WebRTC data channels
   - No data passes through the server after the connection is established

3. **Security**:
   - All data is encrypted end-to-end
   - No data is stored on any server
   - Connections are temporary and close when the session ends

## License

MIT

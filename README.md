# Canvas WhatsApp Ops - Airbnb Internal Tool

A high-fidelity React prototype for managing Twilio WhatsApp messaging operations at Airbnb.

## Features

### 1. Credentials Setup
- Configure Twilio Account SID and Auth Token
- Live API authentication with visual connection status
- Security disclaimer for production credentials

### 2. Template Designer (Content API)
- Pre-populated use case: "Abandoned Booking - London Listing"
- Create and manage WhatsApp message templates
- Pre-flight validation for variable placeholders
- **Meta Rejection Simulation**: Test how the system handles rejected templates
- Manual review & resubmit workflow with TAM escalation
- Template library with status tracking
- **Full API visibility**: See every Content API call (Method, URL, Headers, Body)

### 3. Campaign Orchestrator (Messaging API)
- Live WhatsApp message sending with pre-filled variables
- Smart SMS fallback toggle
- Real-time message preview
- **Live API execution**: Send actual test messages
- Real-time API response display with message SID tracking
- **Full API visibility**: See every Messaging API call

### 4. Global Health & Observability
- **Traffic Monitor**: Live stats for Brazil 🇧🇷, Mexico 🇲🇽, and India 🇮🇳
- **Mexico Compliance**: RFC (tax ID) requirements for local numbers
- **Reputation Gauge**: Visual sender quality score (Green/Yellow/Red)
- **Frequency Cap Handling**: Error 131049 simulation with auto-fallback
- **Reputation Protection**: Toggle to enable SMS fallback for WABA tier protection
- **Error Dictionary**: Comprehensive error codes (63051, 131049, 21610) with Transient vs. Permanent labels
- **Event Streams**: Real-time webhook terminal showing `delivered`, `read`, `sent`, and `failed` events

## Design Philosophy

Built with Airbnb's "Cereal" design language:
- Clean, minimalist interface
- High contrast for readability
- Consistent spacing and typography
- Signature Airbnb red (#FF385C) for primary actions

## Technology Stack

- **React 18** - Modern functional components with hooks
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful, consistent icons
- **Vite** - Fast development and build tool

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

The app will be available at `http://localhost:5173`

### Key Components

- `App.jsx` - Main application with sidebar navigation
- `CredentialsSetup.jsx` - API authentication management
- `TemplateDesigner.jsx` - WhatsApp template creation with Content API
- `CampaignOrchestrator.jsx` - Live message sending with Messaging API
- `GlobalHealth.jsx` - Monitoring, observability, and error handling
- `ApiCallDisplay.jsx` - Reusable syntax-highlighted API call viewer

## Critical Features

### Backend API Visibility

Every action in the app shows the exact Twilio API call:
- HTTP Method (POST, GET)
- Full URL with Account SID
- Headers including Authorization
- JSON request body
- Dark-mode syntax highlighting for easy reading

### Meta Rejection Workflow

1. Create template
2. Simulate rejection (Error 63040)
3. Trigger manual review
4. Alert TAM for Meta escalation
5. Resubmit via Content API

### Reputation Protection

1. Monitor sender quality score
2. Detect frequency cap errors (131049)
3. Auto-divert to SMS fallback
4. Protect WhatsApp Business Account tier
5. Log all fallback actions

## API Integration Points

### Twilio Content API
- `POST /v1/Content` - Create templates
- `GET /v1/Content` - List templates
- `POST /v1/Content/{ContentSid}/ApprovalRequests/whatsapp` - Resubmit for approval

### Twilio Messaging API
- `POST /2010-04-01/Accounts/{AccountSid}/Messages.json` - Send messages
- Support for WhatsApp and SMS channels
- StatusCallback webhooks for delivery tracking

## Environment Variables

No environment variables required - credentials are entered via the UI.

## Production Notes

- This is a prototype/demo application
- Credentials are stored in component state (not persisted)
- Simulated API responses for some features
- Real API calls can be enabled by implementing fetch logic

## License

Internal Airbnb tool - Not for external distribution

---

Built with ❤️ by the Airbnb Messaging Team

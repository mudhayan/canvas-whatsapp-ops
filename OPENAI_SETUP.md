# OpenAI AI Review Setup

This application uses OpenAI's GPT-4 for AI-powered WhatsApp template content review.

## ✅ Current Status

**Both servers are running!**
- ✅ Backend: http://localhost:3001
- ✅ Frontend: http://localhost:5173

## Prerequisites

1. **OpenAI API Key**: Get one from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Node.js**: Your current version (16.x) works fine

## Quick Start (Already Done!)

### 1. Backend Server ✅ RUNNING

The backend is already running on port 3001.

To restart it later:
```bash
npm run server
```

### 2. Frontend ✅ RUNNING

The frontend is already running on port 5173.

To restart it later:
```bash
npm run dev
```

### 3. Add Your OpenAI API Key

1. Open http://localhost:5173 in your browser
2. Navigate to "Template Designer"
3. Scroll to "AI Content Review" section
4. Enter your OpenAI API key (starts with `sk-...`)
5. Click "AI Content Review" button

## How It Works

### Architecture

```
Frontend (Browser)          Backend (Node.js)           OpenAI API
     |                            |                          |
     |  1. Set API Key            |                          |
     |--------------------------->|                          |
     |                            | Store key in memory      |
     |                            |                          |
     |  2. Review Request         |                          |
     |--------------------------->|                          |
     |  (template content)        |                          |
     |                            |  3. GPT-4 API Call       |
     |                            |------------------------->|
     |                            |  (with stored key)       |
     |                            |                          |
     |                            |<-------------------------|
     |  4. Review Results         |  (AI analysis)           |
     |<---------------------------|                          |
     |  (approval likelihood)     |                          |
```

### Security

- **API Key**: Stored in backend server memory (not in browser localStorage)
- **Backend Server**: Runs locally on your machine
- **Never Exposed**: API key never appears in browser DevTools or network requests
- **Session-Based**: Key is lost when server restarts (you'll need to re-enter it)

## What The AI Reviews

The AI analyzes templates for:

### 1. WhatsApp Best Practices
- ✓ Placeholder positioning (can't be at start/end)
- ✓ Placeholder spacing (no {{1}}{{2}})
- ✓ Whitespace issues
- ✓ Emoji count (< 10)
- ✓ Tone and friendliness
- ✓ Generic/vague content detection

### 2. Forbidden Content (US/Canada)
- 🚫 High-risk financial (payday loans, crypto, stocks)
- 🚫 Third-party lead generation
- 🚫 Debt collection/consolidation
- 🚫 Get-rich-quick schemes
- 🚫 Illegal substances (cannabis, CBD, vape)
- 🚫 Prescription drugs
- 🚫 Gambling
- 🚫 S.H.A.F.T. (Sex, Hate, Alcohol, Firearms, Tobacco)

### 3. Additional Checks
- ✓ Language matching
- ✓ URL shortener compliance
- ✓ Business legitimacy

## AI Response Format

The AI provides:
- **Approval Likelihood**: HIGH / MEDIUM / LOW
- **Critical Issues**: Blocking problems (will cause rejection)
- **Warnings**: Potential issues to address
- **Suggestions**: Specific improvements
- **Tone Assessment**: Evaluation of message friendliness
- **Forbidden Category Flag**: If template relates to prohibited content

Color-coded results:
- 🟢 **Green** = HIGH approval likelihood
- 🟡 **Yellow** = MEDIUM approval likelihood  
- 🔴 **Red** = LOW approval likelihood or critical issues

## Cost Considerations

**OpenAI Pricing** (as of 2024):
- GPT-4 Turbo: ~$10 per million input tokens, ~$30 per million output tokens
- Average review: ~600 input tokens, ~300 output tokens
- **Cost per review**: ~$0.015 (1.5 cents)

Budget-friendly option:
- 100 reviews = ~$1.50
- 1000 reviews = ~$15

Monitor usage at: [platform.openai.com/usage](https://platform.openai.com/usage)

## Using The AI Review

### Step-by-Step

1. **Create a template** in the Template Designer
2. **Enter message body** with any variables ({{1}}, {{2}}, etc.)
3. **Add buttons** if needed
4. **Click "AI Content Review"** (purple button with sparkle icon ✨)
5. **Wait 2-5 seconds** for analysis
6. **Review feedback** and make improvements
7. **Run again** after edits to verify

### Example Workflow

```
Template: "Get rich quick with crypto! Invest now!"
     ↓
AI Review: LOW approval likelihood
- Critical: Forbidden category (cryptocurrency)
- Critical: Get-rich-quick scheme language
- Warning: Missing placeholders for personalization
     ↓
Revised: "Hi {{1}}, your booking at {{2}} is confirmed!"
     ↓
AI Review: HIGH approval likelihood
- ✓ Friendly tone
- ✓ Legitimate business purpose
- ✓ Proper personalization
```

## Troubleshooting

### "Backend Not Connected"

**Check**: Is the server running?
```bash
curl http://localhost:3001/health
```

**Fix**: Start the server:
```bash
npm run server
```

### "OpenAI API key not set"

**Fix**: Enter your API key in the UI's "AI Content Review" section

### "Invalid API key" or "401 Unauthorized"

**Check**: API key is valid
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Verify key is active
3. Check you have credits/billing set up

**Fix**: Re-enter the correct API key

### CORS Errors

**Symptom**: Browser console shows CORS errors

**Fix**: Backend includes CORS headers. Make sure:
1. Backend is running on port 3001
2. Frontend is on port 5173
3. No other services using these ports

### Rate Limits

**Symptom**: "Rate limit exceeded" error

**Fix**: OpenAI has rate limits by tier:
- Free tier: Very limited
- Pay-as-you-go: Higher limits
- Wait a minute and try again
- Upgrade your OpenAI account tier

## Development

### Backend Code

- `server.js` - Express server that proxies to OpenAI
- Stores API key in memory (server restart clears it)
- Uses GPT-4 with JSON response format
- Returns structured review data

### Frontend Code

- `src/components/TemplateDesigner.jsx` - Main component
- Checks backend health on mount
- Sends API key once to backend
- Sends template for review
- Displays color-coded results

## Advanced: Environment Variables

For production or persistent storage, use environment variables:

1. Create `.env` file:
```bash
OPENAI_API_KEY=sk-your-key-here
```

2. Update `server.js`:
```javascript
const openaiApiKey = process.env.OPENAI_API_KEY;
```

3. No need to enter key in UI

## Next Steps

1. ✅ Servers are running
2. ✅ Open http://localhost:5173
3. ✅ Go to Template Designer
4. ⬜ Enter OpenAI API key
5. ⬜ Create a template
6. ⬜ Click "AI Content Review"
7. ⬜ Review feedback
8. ⬜ Iterate and improve!

---

**Questions?** Check the main README.md for general app information.

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

// Node 18+ has native fetch, no polyfills needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Store API key (in production, use environment variables)
let openaiApiKey = null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'OpenAI proxy server is running',
    hasApiKey: !!openaiApiKey
  });
});

// Set API key endpoint
app.post('/api/set-key', (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  openaiApiKey = apiKey;
  res.json({ success: true, message: 'API key set successfully' });
});

// AI Review endpoint
app.post('/api/ai-review', async (req, res) => {
  try {
    const { template } = req.body;

    if (!openaiApiKey) {
      return res.status(401).json({
        error: 'OpenAI API key not set. Please set your API key first.'
      });
    }

    if (!template || !template.body) {
      return res.status(400).json({
        error: 'Template body is required'
      });
    }

    console.log('Analyzing template with OpenAI...');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });

    // Build the prompt
    const prompt = `You are a WhatsApp template content reviewer for Twilio. Analyze this template for compliance with WhatsApp policies and Twilio's messaging guidelines.

**Template Content:**
Name: ${template.friendlyName}
Language: ${template.language}
Body: ${template.body}
Buttons: ${JSON.stringify(template.buttons || [])}

**Review Criteria:**

1. **WhatsApp Template Best Practices:**
   - Placeholders ({{1}}, {{2}}, etc.) CANNOT appear at the beginning or end of messages
   - Placeholders must have spacing between them (no {{1}}{{2}})
   - Avoid excessive whitespace, newlines, or tabs
   - Emoji count should be < 10 per template
   - Content should be friendly and conversational, not overly generic or vague
   - Generic content that could enable abuse will be rejected

2. **Forbidden Content Categories (US/Canada):**
   - High-risk financial services: payday loans, short-term high-interest loans, cryptocurrency, stocks/investing platforms
   - Third-party lead generation or marketing
   - Debt collection, consolidation, reduction, or credit repair
   - "Get rich quick" schemes, work-from-home scams, pyramid schemes
   - Illegal substances: cannabis, CBD, kratom, vape, e-cigarettes, fireworks
   - Prescription drugs
   - Gambling: casino, betting, sports picks, sweepstakes (except approved Short Code)
   - S.H.A.F.T.: Sex, Hate, Alcohol (without age-gating), Firearms, Tobacco, Vape

3. **Additional Restrictions:**
   - No free public URL shorteners (must be company-branded)
   - Content must match selected language
   - Must be specific to a legitimate business purpose

**Your Task:**
Analyze the template and provide a structured review with:
- **approval_likelihood**: "HIGH", "MEDIUM", or "LOW"
- **critical_issues**: Array of blocking issues that will cause rejection
- **warnings**: Array of potential issues that may cause rejection
- **suggestions**: Array of improvements to increase approval chances
- **forbidden_category_detected**: Boolean - true if template relates to any forbidden category
- **tone_assessment**: Brief assessment of message tone and friendliness

Return ONLY a valid JSON object with these fields. Be thorough but concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert WhatsApp template reviewer. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    console.log('OpenAI response received');

    try {
      const result = JSON.parse(responseText);
      res.json(result);
    } catch (parseError) {
      res.json({
        error: 'Failed to parse AI response',
        raw: responseText
      });
    }

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({
      error: error.message || 'Failed to complete AI review',
      details: error.toString()
    });
  }
});

// 10DLC Campaign Review endpoint
app.post('/api/campaign-review', async (req, res) => {
  try {
    const { campaign } = req.body;

    if (!openaiApiKey) {
      return res.status(401).json({
        error: 'OpenAI API key not set. Please set your API key first.'
      });
    }

    if (!campaign) {
      return res.status(400).json({
        error: 'Campaign data is required'
      });
    }

    console.log('Analyzing 10DLC campaign with OpenAI...');

    // Fetch and analyze Privacy Policy and Terms of Service URLs
    let privacyPolicyContent = 'URL provided but content not fetched';
    let termsOfServiceContent = 'URL provided but content not fetched';

    if (campaign.privacyPolicyUrl) {
      try {
        console.log(`Fetching Privacy Policy: ${campaign.privacyPolicyUrl}`);
        const response = await fetch(campaign.privacyPolicyUrl);
        const html = await response.text();
        // Extract text content (strip HTML tags)
        const textContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();
        privacyPolicyContent = textContent.substring(0, 10000); // First 10k chars
        console.log('Privacy Policy fetched successfully');
      } catch (error) {
        console.error('Error fetching Privacy Policy:', error.message);
        privacyPolicyContent = `ERROR: Could not fetch URL - ${error.message}`;
      }
    }

    if (campaign.termsOfServiceUrl) {
      try {
        console.log(`Fetching Terms of Service: ${campaign.termsOfServiceUrl}`);
        const response = await fetch(campaign.termsOfServiceUrl);
        const html = await response.text();
        // Extract text content (strip HTML tags)
        const textContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();
        termsOfServiceContent = textContent.substring(0, 10000); // First 10k chars
        console.log('Terms of Service fetched successfully');
      } catch (error) {
        console.error('Error fetching Terms of Service:', error.message);
        termsOfServiceContent = `ERROR: Could not fetch URL - ${error.message}`;
      }
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });

    // Build the prompt
    const prompt = `You are a 10DLC A2P messaging compliance expert for US carriers. Analyze this campaign registration for compliance with carrier requirements, CTIA guidelines, and messaging best practices.

**Campaign Details:**
Use Case: ${campaign.useCase}
Description: ${campaign.description}
Message Flow: ${campaign.messageFlow}
Brand Website: ${campaign.brandWebsite}
Privacy Policy URL: ${campaign.privacyPolicyUrl}
Terms of Service URL: ${campaign.termsOfServiceUrl}

**FETCHED PRIVACY POLICY CONTENT:**
${privacyPolicyContent}

**FETCHED TERMS OF SERVICE CONTENT:**
${termsOfServiceContent}

**Sample Messages:**
${campaign.sampleMessages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n')}

**Campaign Attributes:**
- Embedded Links: ${campaign.hasEmbeddedLinks ? 'Yes' : 'No'}
- Phone Numbers: ${campaign.hasPhoneNumbers ? 'Yes' : 'No'}
- Age-Gated Content: ${campaign.hasAgeGatedContent ? 'Yes' : 'No'}
- Direct Lending: ${campaign.hasDirectLending ? 'Yes' : 'No'}

**Opt-In:**
Keywords: ${campaign.optInKeywords}
Message: ${campaign.optInMessage}

**Opt-Out:**
Keywords: ${campaign.optOutKeywords}
Message: ${campaign.optOutMessage}

**Help:**
Keywords: ${campaign.helpKeywords}
Message: ${campaign.helpMessage}

**Review Criteria:**

1. **Required Disclosures in Message Flow:**
   - "Message and data rates may apply" or equivalent
   - Message frequency disclosure
   - "Reply HELP for help" or equivalent
   - "Reply STOP to opt out" or equivalent
   - Link to Privacy Policy (must be a URL)
   - Link to Terms & Conditions (must be a URL)

2. **Opt-In Message Requirements:**
   - Brand name must be present
   - Message frequency disclosure
   - "Message and data rates may apply"
   - HELP and STOP instructions

3. **Opt-Out Message Requirements:**
   - Brand name must be present
   - Confirmation that user will not receive further messages
   - Must acknowledge the opt-out request

4. **Help Message Requirements:**
   - Brand name must be present
   - Support contact information (email, phone, or website)

5. **Sample Messages Requirements:**
   - At least one must include opt-out language (STOP, unsubscribe, etc.)
   - Brand name should be present
   - Variables should use [brackets] format
   - Must reflect the stated use case
   - No prohibited content

6. **Prohibited Content (US/Canada):**
   - High-risk financial services (payday loans, crypto, short-term loans)
   - Third-party lead generation
   - Debt collection/consolidation/repair
   - Get-rich-quick schemes
   - Illegal substances (cannabis, CBD, kratom, vape)
   - Prescription drugs
   - Gambling (unless approved)
   - S.H.A.F.T. violations (Sex, Hate, Alcohol without age-gating, Firearms, Tobacco)

7. **Privacy Policy Requirements (ANALYZE THE FETCHED CONTENT ABOVE):**
   - URL must be provided and referenced in message flow
   - **CRITICAL**: Review the actual Privacy Policy content fetched above. It MUST explicitly state that mobile opt-in data and SMS consent will NOT be shared with or sold to third parties or affiliates for marketing purposes
   - Must avoid vague language like "We do not sell personal information" or "Personal information will not be shared" (TOO VAGUE - will be rejected)
   - The policy must SPECIFICALLY mention SMS/mobile/text messaging opt-in data protection
   - Must clearly disclose what data is collected and how it's used
   - Check if the fetched content shows errors (404, certificate issues, etc.)
   - Can allow sharing with non-marketing support services (e.g., customer service subcontractors) but must explicitly exclude SMS opt-in data from sharing
   - **If the Privacy Policy lacks explicit SMS opt-in non-sharing language, this is a CRITICAL ISSUE**

8. **Terms of Service Requirements (ANALYZE THE FETCHED CONTENT ABOVE):**
   - URL must be provided and referenced in message flow
   - **Review the actual Terms of Service content fetched above**
   - Must include program/brand name and description
   - Must include EXACT phrase: "Message and data rates may apply" (check fetched content)
   - Must include message frequency disclosure (e.g., "Message frequency varies" or "4 messages per month") - check if present
   - Must include customer care instructions (e.g., "Reply HELP for help") - verify in fetched content
   - Must include opt-out instructions (e.g., "Text STOP to cancel") - should be bold/prominent - verify in fetched content
   - Must include link back to Privacy Policy - check if present in fetched content
   - Must include EXACT phrase: "Carriers are not liable for any delayed or undelivered messages" - verify in fetched content
   - **List what's present and what's missing based on the actual fetched content**

9. **Age-Gated Content:**
   - If hasAgeGatedContent is true, verify proper age-gating disclosures
   - Must not violate S.H.A.F.T. policies

10. **Campaign Description Quality:**
   - Must clearly answer: Who sends? Who receives? Why do they receive?
   - Must align with use case and sample messages
   - Cannot be generic or vague

**IMPORTANT VALIDATION NOTES:**
- The Privacy Policy URL and Terms of Service URL MUST be referenced/linked in the "Message Flow" field
- **I HAVE FETCHED THE ACTUAL CONTENT FROM BOTH URLs - ANALYZE THE FETCHED CONTENT ABOVE**
- Privacy Policy MUST contain explicit non-sharing language for mobile opt-in data (not vague statements) - CHECK THE FETCHED CONTENT
- Terms of Service MUST contain ALL required elements including exact phrases mentioned above - CHECK THE FETCHED CONTENT
- If fetched content shows errors (404, certificate issues), this is a critical issue
- Be VERY specific about what's missing in the actual Privacy Policy and Terms content you see above

**Your Task:**
Analyze the campaign INCLUDING THE FETCHED PRIVACY POLICY AND TERMS CONTENT and provide a structured review.

**REQUIRED JSON STRUCTURE - YOU MUST INCLUDE ALL FIELDS:**
{
  "approval_likelihood": "HIGH" | "MEDIUM" | "LOW",
  "forbidden_category_detected": true | false,
  "compliance_summary": "brief overall assessment",
  "field_feedback": {
    "description": {
      "issues": ["list of specific problems with this field"],
      "recommendation": "COMPLETE compliant replacement text"
    },
    "messageFlow": {
      "issues": ["list of specific problems with this field"],
      "recommendation": "COMPLETE compliant replacement text"
    },
    "optInMessage": {
      "issues": ["list of specific problems"],
      "recommendation": "COMPLETE compliant replacement text"
    },
    "optOutMessage": {
      "issues": ["list of specific problems"],
      "recommendation": "COMPLETE compliant replacement text"
    },
    "helpMessage": {
      "issues": ["list of specific problems"],
      "recommendation": "COMPLETE compliant replacement text"
    },
    "sampleMessages": {
      "issues": ["list of specific problems"],
      "recommendation": ["array", "of", "2-3 compliant sample messages"]
    }
  }
}

**CRITICAL INSTRUCTIONS FOR field_feedback:**
1. This field is MANDATORY - always include it, even if all sub-objects are empty {}
2. Only include sub-objects for fields that have compliance issues
3. For each problematic field, provide:
   - "issues": Array of 2-5 specific problems (e.g., "Missing 'Message and data rates may apply'", "No brand name", "Uses URL shortener bit.ly")
   - "recommendation": COMPLETE, ready-to-use compliant text
4. Use placeholders like [BRAND_NAME], [COMPANY], [FREQUENCY] where specific business details are needed
5. Be specific about what's wrong - users will see this next to the field

**When to include fields in field_feedback:**
- description: if vague, too short, doesn't answer who sends/receives/why, or too generic
- messageFlow: if missing ANY required disclosure (exact phrase "Message and data rates may apply", frequency, "Reply HELP", "Reply STOP", privacy URL, terms URL)
- optInMessage: if missing brand name, frequency disclosure, rates disclosure, or HELP/STOP instructions
- optOutMessage: if missing brand name, doesn't confirm no further messages, or unprofessional
- helpMessage: if missing brand name, missing specific contact info (email/phone), or unhelpful
- sampleMessages: if using URL shorteners (bit.ly, etc.), missing brand name, no opt-out language, scam-like content, pressure tactics (URGENT, ACT NOW), or looks like spam

Return ONLY valid JSON. Each recommendation must be fully compliant, complete, and ready to use.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a 10DLC compliance expert. Always respond with valid JSON only. Always include the recommended_values field with compliant replacement text for any non-compliant fields.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000
    });

    const responseText = completion.choices[0].message.content;
    console.log('OpenAI campaign review received');

    try {
      const result = JSON.parse(responseText);
      res.json(result);
    } catch (parseError) {
      res.json({
        error: 'Failed to parse AI response',
        raw: responseText
      });
    }

  } catch (error) {
    console.error('Error calling OpenAI for campaign review:', error);
    res.status(500).json({
      error: error.message || 'Failed to complete campaign review',
      details: error.toString()
    });
  }
});

// Serve frontend for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: /health`);
  console.log(`🤖 AI Review endpoint: /api/ai-review`);
  console.log(`🔑 Set API key: POST /api/set-key`);
});

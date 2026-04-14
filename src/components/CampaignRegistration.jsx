import React, { useState, useEffect } from 'react';
import { Phone, Send, CheckCircle, XCircle, Loader2, Sparkles, AlertTriangle, ExternalLink, Wand2 } from 'lucide-react';

const CampaignRegistration = ({ credentials, isConnected }) => {
  const [campaign, setCampaign] = useState({
    useCase: 'MARKETING',
    description: '',
    messageFlow: '',
    sampleMessages: ['', ''],
    hasEmbeddedLinks: false,
    hasPhoneNumbers: false,
    hasAgeGatedContent: false,
    hasDirectLending: false,
    optInKeywords: 'START, OPTIN, YES',
    optInMessage: '',
    optOutKeywords: 'STOP, UNSUBSCRIBE, CANCEL, END, QUIT',
    optOutMessage: '',
    helpKeywords: 'HELP, INFO',
    helpMessage: '',
    brandWebsite: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: ''
  });

  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          const data = await response.json();
          setBackendConnected(true);
          setApiKeySet(data.hasApiKey || false);
        }
      } catch (error) {
        console.log('Backend not connected:', error.message);
        setBackendConnected(false);
      }
    };

    checkBackend();
  }, []);

  const useCaseOptions = [
    { value: 'MARKETING', label: 'Marketing', description: 'Promotional content, offers, sales' },
    { value: 'CUSTOMER_CARE', label: 'Customer Care', description: 'Support, service, assistance' },
    { value: 'ACCOUNT_NOTIFICATIONS', label: 'Account Notifications', description: 'Updates, alerts, reminders' },
    { value: 'MIXED', label: 'Mixed', description: 'Combination of multiple use cases' },
    { value: '2FA', label: '2FA / OTP', description: 'Two-factor authentication, one-time passwords' },
    { value: 'HIGHER_EDUCATION', label: 'Higher Education', description: 'Colleges, universities' },
    { value: 'LOW_VOLUME', label: 'Low Volume Mixed', description: 'Under 6k messages/month, mixed content' }
  ];

  const addSampleMessage = () => {
    if (campaign.sampleMessages.length < 5) {
      setCampaign({
        ...campaign,
        sampleMessages: [...campaign.sampleMessages, '']
      });
    }
  };

  const updateSampleMessage = (index, value) => {
    const newSamples = [...campaign.sampleMessages];
    newSamples[index] = value;
    setCampaign({ ...campaign, sampleMessages: newSamples });
  };

  const removeSampleMessage = (index) => {
    if (campaign.sampleMessages.length > 1) {
      const newSamples = campaign.sampleMessages.filter((_, idx) => idx !== index);
      setCampaign({ ...campaign, sampleMessages: newSamples });
    }
  };

  const validateFields = () => {
    const errors = {};

    // Required field validation
    if (!campaign.description || campaign.description.trim().length < 20) {
      errors.description = 'Campaign description is required (minimum 20 characters)';
    }

    if (!campaign.messageFlow || campaign.messageFlow.trim().length < 50) {
      errors.messageFlow = 'Message flow is required and must include all required disclosures (minimum 50 characters)';
    }

    if (!campaign.messageFlow.includes('Message and data rates')) {
      errors.messageFlow = (errors.messageFlow || '') + ' Missing "Message and data rates may apply"';
    }

    if (!campaign.messageFlow.includes('HELP') && !campaign.messageFlow.includes('help')) {
      errors.messageFlow = (errors.messageFlow || '') + ' Missing HELP instructions';
    }

    if (!campaign.messageFlow.includes('STOP') && !campaign.messageFlow.includes('stop')) {
      errors.messageFlow = (errors.messageFlow || '') + ' Missing STOP instructions';
    }

    if (!campaign.brandWebsite || !campaign.brandWebsite.match(/^https?:\/\/.+/)) {
      errors.brandWebsite = 'Valid brand website URL is required (must start with http:// or https://)';
    }

    if (!campaign.privacyPolicyUrl || !campaign.privacyPolicyUrl.match(/^https?:\/\/.+/)) {
      errors.privacyPolicyUrl = 'Valid privacy policy URL is required';
    }

    if (!campaign.termsOfServiceUrl || !campaign.termsOfServiceUrl.match(/^https?:\/\/.+/)) {
      errors.termsOfServiceUrl = 'Valid terms of service URL is required';
    }

    // Check if URLs are referenced in message flow
    if (campaign.messageFlow && campaign.privacyPolicyUrl && !campaign.messageFlow.includes(campaign.privacyPolicyUrl)) {
      errors.messageFlow = (errors.messageFlow || '') + ' Privacy Policy URL must be referenced in message flow';
    }

    if (campaign.messageFlow && campaign.termsOfServiceUrl && !campaign.messageFlow.includes(campaign.termsOfServiceUrl)) {
      errors.messageFlow = (errors.messageFlow || '') + ' Terms of Service URL must be referenced in message flow';
    }

    // Sample messages validation
    const filledSamples = campaign.sampleMessages.filter(msg => msg.trim().length > 0);
    if (filledSamples.length < 2) {
      errors.sampleMessages = 'At least 2 sample messages are required';
    }

    const hasOptOutLanguage = filledSamples.some(msg =>
      msg.toLowerCase().includes('stop') ||
      msg.toLowerCase().includes('unsubscribe') ||
      msg.toLowerCase().includes('opt out') ||
      msg.toLowerCase().includes('opt-out')
    );
    if (filledSamples.length >= 2 && !hasOptOutLanguage) {
      errors.sampleMessages = 'At least one sample must include opt-out language (STOP, unsubscribe, etc.)';
    }

    // Opt-in message validation
    if (!campaign.optInMessage || campaign.optInMessage.trim().length < 20) {
      errors.optInMessage = 'Opt-in confirmation message is required';
    }

    // Opt-out message validation
    if (!campaign.optOutMessage || campaign.optOutMessage.trim().length < 10) {
      errors.optOutMessage = 'Opt-out confirmation message is required';
    }

    // Help message validation
    if (!campaign.helpMessage || campaign.helpMessage.trim().length < 10) {
      errors.helpMessage = 'Help response message is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyRecommendation = (fieldName, value) => {
    if (fieldName === 'sampleMessages') {
      // Handle array values
      setCampaign({ ...campaign, sampleMessages: value });
    } else {
      setCampaign({ ...campaign, [fieldName]: value });
    }
    // Clear the error for this field
    if (fieldErrors[fieldName]) {
      setFieldErrors({ ...fieldErrors, [fieldName]: null });
    }
  };

  // Helper to get field feedback from AI review
  const getFieldFeedback = (fieldName) => {
    return aiReviewResult?.field_feedback?.[fieldName] || null;
  };

  // Inline feedback component
  const FieldFeedback = ({ fieldName }) => {
    const feedback = getFieldFeedback(fieldName);
    if (!feedback || !feedback.issues || feedback.issues.length === 0) return null;

    return (
      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-sm font-semibold text-orange-900 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Issues Found:
            </div>
            <ul className="text-xs text-orange-800 space-y-1 ml-5 list-disc">
              {feedback.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>

        {feedback.recommendation && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-green-900 flex items-center gap-1">
                <Wand2 className="w-4 h-4" />
                Recommended Fix:
              </div>
              <button
                onClick={() => applyRecommendation(fieldName, feedback.recommendation)}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
              >
                <Wand2 className="w-3 h-3" />
                Apply Fix
              </button>
            </div>
            <div className="text-xs text-gray-700 bg-white p-2 rounded border border-green-200 font-mono whitespace-pre-wrap">
              {Array.isArray(feedback.recommendation)
                ? feedback.recommendation.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n\n')
                : feedback.recommendation}
            </div>
          </div>
        )}
      </div>
    );
  };

  const applyAllRecommendations = () => {
    if (!aiReviewResult?.field_feedback) return;

    const updatedCampaign = { ...campaign };
    const clearedErrors = { ...fieldErrors };

    Object.entries(aiReviewResult.field_feedback).forEach(([fieldName, feedback]) => {
      if (feedback.recommendation) {
        updatedCampaign[fieldName] = feedback.recommendation;
        if (clearedErrors[fieldName]) {
          clearedErrors[fieldName] = null;
        }
      }
    });

    setCampaign(updatedCampaign);
    setFieldErrors(clearedErrors);
  };

  const fillDemoData = () => {
    setCampaign({
      useCase: 'MARKETING',
      description: 'Acme Travel sends promotional offers and travel deals to customers who have opted in through our website or mobile app. Recipients are existing customers who want to receive updates about special offers, new destinations, and exclusive discounts.',
      messageFlow: 'Users opt in by texting START to our number or by checking the SMS opt-in box on our website during account creation. By opting in, you agree to receive marketing messages from Acme Travel about travel deals and promotions. Message frequency varies, typically 2-4 messages per month. Message and data rates may apply. Reply HELP for help or STOP to opt out at any time. For more information, see our Privacy Policy at https://acmetravel.example.com/privacy and Terms of Service at https://acmetravel.example.com/terms',
      sampleMessages: [
        'Hi [Name]! ✈️ Acme Travel here with an exclusive offer: 30% off flights to Hawaii this week only! Book now at acmetravel.com/deals. Reply STOP to unsubscribe.',
        'Acme Travel: Your dream vacation awaits! [Destination] packages starting at $[Price]. Limited availability. Visit acmetravel.com or call 1-800-ACME-FLY. Text STOP to opt out.',
        'Last chance! [Offer] expires tonight at midnight. Book your next adventure with Acme Travel: acmetravel.com/flash-sale. Reply STOP to unsubscribe, HELP for support.'
      ],
      hasEmbeddedLinks: true,
      hasPhoneNumbers: true,
      hasAgeGatedContent: false,
      hasDirectLending: false,
      optInKeywords: 'START, OPTIN, YES, JOIN',
      optInMessage: 'Welcome to Acme Travel! You\'re now subscribed to exclusive travel deals and offers. Expect 2-4 messages per month. Message and data rates may apply. Reply HELP for help or STOP to cancel. View our Privacy Policy: https://acmetravel.example.com/privacy',
      optOutKeywords: 'STOP, UNSUBSCRIBE, CANCEL, END, QUIT',
      optOutMessage: 'You have been unsubscribed from Acme Travel marketing messages. You will not receive any further promotional texts from us. Thank you for being a customer!',
      helpKeywords: 'HELP, INFO, SUPPORT',
      helpMessage: 'Acme Travel Support: For assistance, email support@acmetravel.com or call 1-800-ACME-FLY (Mon-Fri 9am-6pm EST). To unsubscribe, reply STOP. View Terms: https://acmetravel.example.com/terms',
      brandWebsite: 'https://acmetravel.example.com',
      privacyPolicyUrl: 'https://acmetravel.example.com/privacy',
      termsOfServiceUrl: 'https://acmetravel.example.com/terms'
    });
    setFieldErrors({});
    setAiReviewResult(null);
  };

  const fillNonCompliantData = () => {
    setCampaign({
      useCase: 'MARKETING',
      description: 'Our company sends promotional messages to customers who sign up on our website to receive special offers and deals.',
      messageFlow: 'Sign up on our website to get exclusive deals. Message frequency varies. Message and data rates may apply. Reply HELP for help. Reply STOP to opt out. See our privacy policy at https://example.com/privacy and terms at https://example.com/terms',
      sampleMessages: [
        'URGENT! Limited time offer - save big today! Click here: bit.ly/deals123. Reply STOP to end.',
        'CONGRATULATIONS! You won! Claim your prize now at bit.ly/claim456 before it expires!',
        'Hey there! Get cash fast with our amazing loan offers. Apply today: bit.ly/loans789'
      ],
      hasEmbeddedLinks: true,
      hasPhoneNumbers: false,
      hasAgeGatedContent: false,
      hasDirectLending: false,
      optInKeywords: 'START, OPTIN, YES',
      optInMessage: 'Thanks for signing up! You will get messages from us.',
      optOutKeywords: 'STOP, UNSUBSCRIBE, CANCEL, END, QUIT',
      optOutMessage: 'You are unsubscribed.',
      helpKeywords: 'HELP, INFO',
      helpMessage: 'For help contact us at our website.',
      brandWebsite: 'https://example.com',
      privacyPolicyUrl: 'https://example.com/privacy',
      termsOfServiceUrl: 'https://example.com/terms'
    });
    setFieldErrors({});
    setAiReviewResult(null);
  };

  const runAiCampaignReview = async () => {
    if (!backendConnected || !apiKeySet) {
      setAiReviewResult({
        error: 'Backend not connected or API key not set. Please configure OpenAI API key in Credentials Setup.'
      });
      return;
    }

    // Validate all fields first
    if (!validateFields()) {
      return;
    }

    setAiReviewing(true);
    setAiReviewResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/campaign-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign: campaign
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('AI Review Result:', result);
        console.log('Has recommended_values?', !!result.recommended_values);
        console.log('recommended_values keys:', result.recommended_values ? Object.keys(result.recommended_values) : 'none');
        setAiReviewResult(result);
      } else {
        setAiReviewResult({
          error: result.error || 'Failed to complete AI review',
          details: result.details
        });
      }
    } catch (error) {
      console.error('AI review error:', error);
      setAiReviewResult({
        error: error.message || 'Failed to connect to backend server'
      });
    } finally {
      setAiReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Phone className="w-8 h-8 text-airbnb-red" />
          <div>
            <h2 className="text-2xl font-bold text-airbnb-dark">10DLC Campaign Registration</h2>
            <p className="text-airbnb-gray">Register your A2P 10DLC campaign with AI-powered compliance checking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fillDemoData}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle className="w-4 h-4" />
            Fill Compliant Data
          </button>
          <button
            onClick={fillNonCompliantData}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <AlertTriangle className="w-4 h-4" />
            Fill Non-Compliant Data
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <p className="text-sm font-semibold text-blue-900">💡 10DLC Registration Requirements</p>
        <p className="text-sm text-blue-800 mt-2">
          All fields must comply with carrier requirements and include proper disclosures, opt-in/opt-out language, and privacy policy links.
        </p>
        <div className="mt-3">
          <a
            href="https://support.twilio.com/hc/en-us/articles/1260803225669-Message-throughput-MPS-and-Trust-Scores-for-A2P-10DLC-in-the-US"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-900 font-semibold hover:text-blue-700 underline"
          >
            📖 Read 10DLC Campaign Requirements →
          </a>
        </div>
      </div>

      {!backendConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ AI Review Unavailable</p>
          <p className="text-sm text-yellow-800 mt-1">
            Start the backend server to enable AI compliance checking: <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono">npm run server</code>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Campaign Details */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Campaign Information</h3>

            <div className="space-y-4">
              {/* Use Case */}
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                  Campaign Use Case <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={campaign.useCase}
                  onChange={(e) => setCampaign({ ...campaign, useCase: e.target.value })}
                >
                  {useCaseOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign Description */}
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                  Campaign Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`input-field ${fieldErrors.description ? 'border-red-500' : ''}`}
                  rows="4"
                  placeholder="Who is sending? Who is receiving? Why are they receiving it?"
                  value={campaign.description}
                  onChange={(e) => {
                    setCampaign({ ...campaign, description: e.target.value });
                    if (fieldErrors.description) {
                      setFieldErrors({ ...fieldErrors, description: null });
                    }
                  }}
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.description}
                  </p>
                )}
                {!fieldErrors.description && !getFieldFeedback('description') && (
                  <p className="text-xs text-airbnb-gray mt-1">
                    Must answer: who sends, who receives, and why they receive messages
                  </p>
                )}
                <FieldFeedback fieldName="description" />
              </div>

              {/* Message Flow / Call to Action */}
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                  Message Flow (Call to Action) <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`input-field ${fieldErrors.messageFlow ? 'border-red-500' : ''}`}
                  rows="6"
                  placeholder="How do users opt in? Must include: service description, 'Message and data rates may apply', frequency, 'Reply HELP for help', 'Reply STOP to opt out', Privacy Policy link, Terms & Conditions link"
                  value={campaign.messageFlow}
                  onChange={(e) => {
                    setCampaign({ ...campaign, messageFlow: e.target.value });
                    if (fieldErrors.messageFlow) {
                      setFieldErrors({ ...fieldErrors, messageFlow: null });
                    }
                  }}
                />
                {fieldErrors.messageFlow && (
                  <p className="text-xs text-red-600 mt-1 font-semibold whitespace-pre-line">
                    ⚠️ {fieldErrors.messageFlow}
                  </p>
                )}
                {!fieldErrors.messageFlow && !getFieldFeedback('messageFlow') && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Include all required disclosures and links to Privacy Policy & Terms
                  </p>
                )}
                <FieldFeedback fieldName="messageFlow" />
              </div>

              {/* Brand Website */}
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                  Brand Website <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  className={`input-field ${fieldErrors.brandWebsite ? 'border-red-500' : ''}`}
                  placeholder="https://example.com"
                  value={campaign.brandWebsite}
                  onChange={(e) => {
                    setCampaign({ ...campaign, brandWebsite: e.target.value });
                    if (fieldErrors.brandWebsite) {
                      setFieldErrors({ ...fieldErrors, brandWebsite: null });
                    }
                  }}
                />
                {fieldErrors.brandWebsite && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.brandWebsite}
                  </p>
                )}
              </div>

              {/* Privacy Policy URL */}
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                  Privacy Policy URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  className={`input-field ${fieldErrors.privacyPolicyUrl ? 'border-red-500' : ''}`}
                  placeholder="https://example.com/privacy"
                  value={campaign.privacyPolicyUrl}
                  onChange={(e) => {
                    setCampaign({ ...campaign, privacyPolicyUrl: e.target.value });
                    if (fieldErrors.privacyPolicyUrl) {
                      setFieldErrors({ ...fieldErrors, privacyPolicyUrl: null });
                    }
                  }}
                />
                {fieldErrors.privacyPolicyUrl ? (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.privacyPolicyUrl}
                  </p>
                ) : (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Must explicitly state mobile opt-in data won't be shared with third parties
                  </p>
                )}
              </div>

              {/* Terms of Service URL */}
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                  Terms of Service URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  className={`input-field ${fieldErrors.termsOfServiceUrl ? 'border-red-500' : ''}`}
                  placeholder="https://example.com/terms"
                  value={campaign.termsOfServiceUrl}
                  onChange={(e) => {
                    setCampaign({ ...campaign, termsOfServiceUrl: e.target.value });
                    if (fieldErrors.termsOfServiceUrl) {
                      setFieldErrors({ ...fieldErrors, termsOfServiceUrl: null });
                    }
                  }}
                />
                {fieldErrors.termsOfServiceUrl ? (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.termsOfServiceUrl}
                  </p>
                ) : (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Must include: frequency, fees, HELP/STOP, carrier liability, privacy link
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sample Messages */}
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Sample Messages (2-5 required)</h3>

            <div className="space-y-3">
              {campaign.sampleMessages.map((message, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1">
                    <textarea
                      className="input-field text-sm"
                      rows="3"
                      placeholder={`Sample ${idx + 1}: Include brand name, opt-out language, and use [brackets] for variables`}
                      value={message}
                      onChange={(e) => updateSampleMessage(idx, e.target.value)}
                    />
                  </div>
                  {campaign.sampleMessages.length > 1 && (
                    <button
                      onClick={() => removeSampleMessage(idx)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 self-start"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              {campaign.sampleMessages.length < 5 && (
                <button onClick={addSampleMessage} className="btn-secondary text-sm w-full">
                  + Add Sample Message
                </button>
              )}

              {fieldErrors.sampleMessages ? (
                <p className="text-xs text-red-600 font-semibold">
                  ⚠️ {fieldErrors.sampleMessages}
                </p>
              ) : !getFieldFeedback('sampleMessages') && (
                <p className="text-xs text-airbnb-gray">
                  At least one sample must include opt-out language (e.g., "Reply STOP to unsubscribe")
                </p>
              )}
              <FieldFeedback fieldName="sampleMessages" />
            </div>
          </div>

          {/* Campaign Attributes */}
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Campaign & Content Attributes</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={campaign.hasEmbeddedLinks}
                  onChange={(e) => setCampaign({ ...campaign, hasEmbeddedLinks: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-airbnb-dark">Messages contain embedded links</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={campaign.hasPhoneNumbers}
                  onChange={(e) => setCampaign({ ...campaign, hasPhoneNumbers: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-airbnb-dark">Messages contain phone numbers</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={campaign.hasAgeGatedContent}
                  onChange={(e) => setCampaign({ ...campaign, hasAgeGatedContent: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-airbnb-dark">Age-gated content (alcohol, tobacco, etc.)</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={campaign.hasDirectLending}
                  onChange={(e) => setCampaign({ ...campaign, hasDirectLending: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-airbnb-dark">Direct lending or loan arrangements</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Keywords & Messages */}
        <div className="space-y-6">
          {/* Opt-In */}
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Opt-In</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Opt-In Keywords</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="START, OPTIN, YES"
                  value={campaign.optInKeywords}
                  onChange={(e) => setCampaign({ ...campaign, optInKeywords: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Opt-In Confirmation Message</label>
                <textarea
                  className={`input-field ${fieldErrors.optInMessage ? 'border-red-500' : ''}`}
                  rows="4"
                  placeholder="Must include: brand name, frequency, 'Message and data rates may apply', HELP/STOP instructions"
                  value={campaign.optInMessage}
                  onChange={(e) => {
                    setCampaign({ ...campaign, optInMessage: e.target.value });
                    if (fieldErrors.optInMessage) {
                      setFieldErrors({ ...fieldErrors, optInMessage: null });
                    }
                  }}
                />
                {fieldErrors.optInMessage && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.optInMessage}
                  </p>
                )}
                <FieldFeedback fieldName="optInMessage" />
              </div>
            </div>
          </div>

          {/* Opt-Out */}
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Opt-Out</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Opt-Out Keywords</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="STOP, UNSUBSCRIBE, CANCEL, END, QUIT"
                  value={campaign.optOutKeywords}
                  onChange={(e) => setCampaign({ ...campaign, optOutKeywords: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Opt-Out Confirmation Message</label>
                <textarea
                  className={`input-field ${fieldErrors.optOutMessage ? 'border-red-500' : ''}`}
                  rows="4"
                  placeholder="Must include: brand name, confirmation that no further messages will be sent"
                  value={campaign.optOutMessage}
                  onChange={(e) => {
                    setCampaign({ ...campaign, optOutMessage: e.target.value });
                    if (fieldErrors.optOutMessage) {
                      setFieldErrors({ ...fieldErrors, optOutMessage: null });
                    }
                  }}
                />
                {fieldErrors.optOutMessage && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.optOutMessage}
                  </p>
                )}
                <FieldFeedback fieldName="optOutMessage" />
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Help</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Help Keywords</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="HELP, INFO"
                  value={campaign.helpKeywords}
                  onChange={(e) => setCampaign({ ...campaign, helpKeywords: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Help Response Message</label>
                <textarea
                  className={`input-field ${fieldErrors.helpMessage ? 'border-red-500' : ''}`}
                  rows="4"
                  placeholder="Must include: brand name, support contact info (email, phone, or website)"
                  value={campaign.helpMessage}
                  onChange={(e) => {
                    setCampaign({ ...campaign, helpMessage: e.target.value });
                    if (fieldErrors.helpMessage) {
                      setFieldErrors({ ...fieldErrors, helpMessage: null });
                    }
                  }}
                />
                {fieldErrors.helpMessage && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    ⚠️ {fieldErrors.helpMessage}
                  </p>
                )}
                <FieldFeedback fieldName="helpMessage" />
              </div>
            </div>
          </div>

          {/* AI Review Button */}
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <h3 className="font-semibold text-airbnb-dark mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Compliance Review
            </h3>

            <p className="text-sm text-airbnb-gray mb-4">
              AI checks for required disclosures, privacy policy links, prohibited content, and compliance issues
            </p>

            <button
              onClick={runAiCampaignReview}
              disabled={!backendConnected || !apiKeySet || aiReviewing}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700"
            >
              {aiReviewing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Campaign...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Run AI Compliance Check
                </>
              )}
            </button>
          </div>

          {/* AI Review Results */}
          {aiReviewResult && (
            <div className={`card border-2 ${
              aiReviewResult.error ? 'bg-red-50 border-red-200' :
              aiReviewResult.approval_likelihood === 'HIGH' ? 'bg-green-50 border-green-200' :
              aiReviewResult.approval_likelihood === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`w-5 h-5 ${
                  aiReviewResult.error ? 'text-red-600' :
                  aiReviewResult.approval_likelihood === 'HIGH' ? 'text-green-600' :
                  aiReviewResult.approval_likelihood === 'MEDIUM' ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
                <span className={`font-semibold ${
                  aiReviewResult.error ? 'text-red-800' :
                  aiReviewResult.approval_likelihood === 'HIGH' ? 'text-green-800' :
                  aiReviewResult.approval_likelihood === 'MEDIUM' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {aiReviewResult.error ? 'AI Review Error' :
                   `Approval Likelihood: ${aiReviewResult.approval_likelihood}`}
                </span>
              </div>

              {aiReviewResult.error && (
                <div className="text-sm text-red-700">
                  {aiReviewResult.error}
                </div>
              )}

              {!aiReviewResult.error && (
                <>
                  {aiReviewResult.forbidden_category_detected && (
                    <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded">
                      <div className="flex items-center gap-2 text-red-900 font-semibold text-sm mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Prohibited Content Detected
                      </div>
                      <p className="text-xs text-red-800">
                        Campaign may relate to prohibited content categories
                      </p>
                    </div>
                  )}

                  {aiReviewResult.critical_issues && aiReviewResult.critical_issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-800 mb-1">🚫 Critical Issues:</div>
                      <ul className="text-sm text-red-700 space-y-1 ml-5 list-disc">
                        {aiReviewResult.critical_issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiReviewResult.warnings && aiReviewResult.warnings.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Warnings:</div>
                      <ul className="text-sm text-yellow-700 space-y-1 ml-5 list-disc">
                        {aiReviewResult.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiReviewResult.suggestions && aiReviewResult.suggestions.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-blue-800 mb-1">💡 Suggestions:</div>
                      <ul className="text-sm text-blue-700 space-y-1 ml-5 list-disc">
                        {aiReviewResult.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiReviewResult.compliance_summary && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-sm font-semibold text-purple-800 mb-1">Compliance Summary:</div>
                      <p className="text-sm text-purple-700">{aiReviewResult.compliance_summary}</p>
                    </div>
                  )}

                  {/* Apply All Recommendations Button */}
                  {aiReviewResult.field_feedback && Object.keys(aiReviewResult.field_feedback).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
                              <Wand2 className="w-5 h-5" />
                              Apply All AI Recommendations
                            </div>
                            <p className="text-xs text-green-800">
                              Click to automatically fix all {Object.keys(aiReviewResult.field_feedback).length} field(s) with compliance issues
                            </p>
                          </div>
                          <button
                            onClick={applyAllRecommendations}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            <Wand2 className="w-4 h-4" />
                            Apply All Fixes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Old recommendations section - keeping for backward compatibility */}
                  {aiReviewResult.recommended_values && Object.keys(aiReviewResult.recommended_values).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-green-800 flex items-center gap-2">
                          <Wand2 className="w-4 h-4" />
                          AI-Generated Compliant Text
                        </div>
                        <button
                          onClick={applyAllRecommendations}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                        >
                          <Wand2 className="w-3 h-3" />
                          Apply All
                        </button>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(aiReviewResult.recommended_values).map(([fieldName, value]) => {
                          const fieldLabels = {
                            description: 'Campaign Description',
                            messageFlow: 'Message Flow',
                            optInMessage: 'Opt-In Confirmation',
                            optOutMessage: 'Opt-Out Confirmation',
                            helpMessage: 'Help Message',
                            sampleMessages: 'Sample Messages'
                          };

                          return (
                            <div key={fieldName} className="bg-white border border-green-300 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="text-sm font-semibold text-green-900">
                                  {fieldLabels[fieldName] || fieldName}
                                </div>
                                <button
                                  onClick={() => applyRecommendation(fieldName, value)}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  Apply
                                </button>
                              </div>
                              <div className="text-xs text-green-800 bg-green-50 p-2 rounded border border-green-200 font-mono whitespace-pre-wrap">
                                {Array.isArray(value) ? value.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n\n') : value}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignRegistration;

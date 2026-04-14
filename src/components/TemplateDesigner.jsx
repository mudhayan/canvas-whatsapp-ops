import React, { useState, useEffect } from 'react';
import { Palette, Send, AlertTriangle, CheckCircle, XCircle, Eye, Loader2, MessageSquare, Image, Video, FileIcon, Phone, MapPin, ExternalLink, Sparkles } from 'lucide-react';
import ApiCallDisplay from './ApiCallDisplay';
import IPhoneMockup from './IPhoneMockup';

const TemplateDesigner = ({ credentials, isConnected }) => {
  const [contentType, setContentType] = useState('text');
  const [template, setTemplate] = useState({
    friendlyName: '',
    language: 'en',
    body: '',
    buttons: [],
    mediaType: null,
    mediaUrl: '',
    exampleValues: {}
  });

  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createApiResponse, setCreateApiResponse] = useState(null);
  const [preflightResult, setPreflightResult] = useState(null);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);

  const contentTypes = [
    { id: 'text', name: 'Text Only', icon: MessageSquare, description: 'Simple text message' },
    { id: 'text_buttons', name: 'Text + Buttons', icon: MessageSquare, description: 'Text with quick replies or CTAs' },
    { id: 'image', name: 'Image + Text', icon: Image, description: 'Image with text caption' },
    { id: 'video', name: 'Video + Text', icon: Video, description: 'Video with text caption' },
    { id: 'document', name: 'Document + Text', icon: FileIcon, description: 'PDF or document with text' },
    { id: 'location', name: 'Location', icon: MapPin, description: 'Share a location' },
    { id: 'call_to_action', name: 'Call to Action', icon: Phone, description: 'Phone number or URL action' }
  ];

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

  const handleContentTypeChange = (type) => {
    setContentType(type);

    const defaults = {
      text: { buttons: [], mediaType: null, mediaUrl: '' },
      text_buttons: { buttons: [{ type: 'quick_reply', text: '' }], mediaType: null, mediaUrl: '' },
      image: { buttons: [], mediaType: 'image', mediaUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400' },
      video: { buttons: [], mediaType: 'video', mediaUrl: '' },
      document: { buttons: [], mediaType: 'document', mediaUrl: '' },
      location: { buttons: [], mediaType: null, mediaUrl: '', latitude: '', longitude: '', label: '' },
      call_to_action: { buttons: [{ type: 'phone', text: 'Call Us', phone: '' }], mediaType: null, mediaUrl: '' }
    };

    setTemplate({ ...template, ...defaults[type] });
    setPreflightResult(null);
  };

  const addButton = (type) => {
    if (template.buttons.length < 3) {
      setTemplate({
        ...template,
        buttons: [...template.buttons, { type, text: '', url: type === 'cta' || type === 'url' ? '' : undefined, phone: type === 'phone' ? '' : undefined }]
      });
    }
  };

  const updateButton = (index, field, value) => {
    const newButtons = [...template.buttons];
    newButtons[index][field] = value;
    setTemplate({ ...template, buttons: newButtons });
  };

  const removeButton = (index) => {
    const newButtons = template.buttons.filter((_, idx) => idx !== index);
    setTemplate({ ...template, buttons: newButtons });
  };

  const runPreflightCheck = () => {
    const errors = [];
    const warnings = [];

    if (!template.body.trim()) {
      errors.push('Message body cannot be empty');
    }

    const variablePattern = /\{\{(\d+)\}\}/g;
    const matches = template.body.match(variablePattern);
    const variableCount = matches ? matches.length : 0;

    if (variableCount > 0) {
      const numbers = matches.map(m => parseInt(m.match(/\d+/)[0]));
      const sorted = [...numbers].sort((a, b) => a - b);
      const sequential = sorted.every((num, idx) => num === idx + 1);

      if (!sequential) {
        errors.push('Variable placeholders must be sequential starting from {{1}}');
      }

      // Check if example values are provided for all variables
      numbers.forEach(num => {
        if (!template.exampleValues[num] || !template.exampleValues[num].trim()) {
          warnings.push(`Example value missing for variable {{${num}}}`);
        }
      });
    }

    const bodyLength = template.body.length;
    if (bodyLength > 1024) {
      errors.push(`Message too long (${bodyLength}/1024 characters)`);
    } else if (bodyLength > 900) {
      warnings.push(`Message approaching limit (${bodyLength}/1024 characters)`);
    }

    if (template.buttons.length > 3) {
      errors.push('Maximum 3 buttons allowed');
    }

    if (template.buttons.length > 0) {
      const ctaButtons = template.buttons.filter(b => b.type === 'cta' || b.type === 'url');
      if (ctaButtons.length > 2) {
        errors.push('Maximum 2 call-to-action buttons allowed');
      }

      template.buttons.forEach((btn, idx) => {
        if (!btn.text || btn.text.trim() === '') {
          errors.push(`Button ${idx + 1} text is required`);
        }
        if ((btn.type === 'cta' || btn.type === 'url') && !btn.url) {
          errors.push(`Button ${idx + 1} URL is required for call-to-action buttons`);
        }
        if (btn.type === 'phone' && !btn.phone) {
          errors.push(`Button ${idx + 1} phone number is required`);
        }
      });
    }

    if (template.mediaUrl && !template.mediaType) {
      errors.push('Media type is required when media URL is provided');
    }

    setPreflightResult({
      passed: errors.length === 0,
      errors,
      warnings,
      stats: {
        variables: variableCount,
        length: bodyLength,
        buttons: template.buttons.length
      }
    });
  };

  const runAiContentReview = async () => {
    if (!backendConnected) {
      setAiReviewResult({
        error: 'Backend server not running. Please start the server with: npm run server'
      });
      return;
    }

    if (!apiKeySet) {
      setAiReviewResult({
        error: 'Please set your OpenAI API key in the Credentials Setup page first'
      });
      return;
    }

    if (!template.body.trim()) {
      setAiReviewResult({
        error: 'Message body cannot be empty'
      });
      return;
    }

    setAiReviewing(true);
    setAiReviewResult(null);

    try {
      // Call AI review endpoint
      const response = await fetch('http://localhost:3001/api/ai-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template: template
        })
      });

      const result = await response.json();

      if (response.ok) {
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

  const createTemplate = async () => {
    if (!isConnected) {
      setCreateError({ message: 'Please connect your Twilio credentials first' });
      return;
    }

    if (!template.friendlyName || !template.body) {
      setCreateError({ message: 'Template name and body are required' });
      return;
    }

    setCreating(true);
    setCreateSuccess(null);
    setCreateError(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      // Build the Content API payload
      const payload = {
        friendly_name: template.friendlyName,
        language: template.language,
        types: {}
      };

      // Add text type (required)
      payload.types['twilio/text'] = {
        body: template.body
      };

      // Add media type if media is present
      if (template.mediaType && template.mediaUrl) {
        payload.types['twilio/media'] = {
          body: template.body,
          media: [template.mediaUrl]
        };
      }

      // Add location type
      if (contentType === 'location' && template.latitude && template.longitude) {
        payload.types['twilio/location'] = {
          latitude: parseFloat(template.latitude),
          longitude: parseFloat(template.longitude),
          label: template.label || ''
        };
      }

      // Add quick-reply/call-to-action type if buttons are present
      if (template.buttons.length > 0) {
        const actions = template.buttons.map(btn => {
          const action = {
            title: btn.text,
            id: btn.text.toLowerCase().replace(/\s+/g, '_')
          };

          if (btn.type === 'cta' || btn.type === 'url') {
            action.type = 'URL';
            action.url = btn.url;
          } else if (btn.type === 'phone') {
            action.type = 'PHONE_NUMBER';
            action.phone_number = btn.phone;
          } else {
            action.type = 'QUICK_REPLY';
          }

          return action;
        });

        payload.types['twilio/quick-reply'] = {
          body: template.body,
          actions: actions
        };

        payload.types['twilio/call-to-action'] = {
          body: template.body,
          actions: actions
        };
      }

      // Step 1: Create the template
      const response = await fetch('https://content.twilio.com/v1/Content', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setCreateApiResponse(data);
        setCreateSuccess({
          sid: data.sid,
          friendlyName: data.friendly_name,
          message: 'Template created successfully! Go to Template Library to submit for WhatsApp approval.'
        });
      } else {
        setCreateApiResponse(data);
        setCreateError({
          code: data.code,
          message: data.message,
          moreInfo: data.more_info,
          details: data.details || 'Failed to create template'
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setCreateError({
        message: error.message || 'Failed to create template. Please try again.',
        details: error.toString()
      });
    } finally {
      setCreating(false);
    }
  };

  // Extract variables from body
  const variableMatches = template.body.match(/\{\{(\d+)\}\}/g);
  const variables = variableMatches ? [...new Set(variableMatches.map(v => v.match(/\d+/)[0]))].sort() : [];

  // Generate preview message
  let previewMessage = template.body || 'Your message will appear here...';
  variables.forEach(varNum => {
    const exampleValue = template.exampleValues[varNum] || `{{${varNum}}}`;
    previewMessage = previewMessage.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), exampleValue);
  });

  const createApiPayload = {
    friendly_name: template.friendlyName,
    language: template.language,
    types: {
      'twilio/text': {
        body: template.body
      },
      ...(template.buttons.length > 0 && {
        'twilio/quick-reply': {
          body: template.body,
          actions: template.buttons.map(btn => ({
            title: btn.text,
            id: btn.text.toLowerCase().replace(/\s+/g, '_'),
            type: btn.type === 'phone' ? 'PHONE_NUMBER' : (btn.type === 'cta' || btn.type === 'url' ? 'URL' : 'QUICK_REPLY'),
            ...(btn.url && { url: btn.url }),
            ...(btn.phone && { phone_number: btn.phone })
          }))
        }
      }),
      ...(template.mediaType && template.mediaUrl && {
        'twilio/media': {
          body: template.body,
          media: [template.mediaUrl]
        }
      })
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="w-8 h-8 text-airbnb-red" />
        <div>
          <h2 className="text-2xl font-bold text-airbnb-dark">Template Designer</h2>
          <p className="text-airbnb-gray">Design and create WhatsApp message templates using Twilio's Content API</p>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ Connect your credentials first</p>
          <p className="text-sm text-yellow-800 mt-1">API credentials required to create templates</p>
        </div>
      )}

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <p className="text-sm font-semibold text-blue-900">💡 Template Approval Tips</p>
        <p className="text-sm text-blue-800 mt-2">
          Creating templates that get approved by Meta requires following specific guidelines.
        </p>
        <div className="mt-3">
          <a
            href="https://www.twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses#tips-for-creating-templates"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-900 font-semibold hover:text-blue-700 underline"
          >
            📖 Read Tips for Creating Templates That Get Approved →
          </a>
        </div>
      </div>

      {/* Choose Content Type - Full Width */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-airbnb-dark">Choose Content Type</h3>
          <a
            href="https://www.twilio.com/docs/content/content-types-overview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <span>Content Types Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {contentTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => handleContentTypeChange(type.id)}
                className={`p-2 rounded-lg border-2 transition-all text-left ${
                  contentType === type.id
                    ? 'border-airbnb-red bg-red-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${contentType === type.id ? 'text-airbnb-red' : 'text-gray-600'}`} />
                <div className="font-semibold text-xs text-airbnb-dark">{type.name}</div>
                <div className="text-xs text-airbnb-gray mt-0.5 leading-tight">{type.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Template Details */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-airbnb-dark mb-4">Template Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Template Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., welcome_message"
                  value={template.friendlyName}
                  onChange={(e) => setTemplate({ ...template, friendlyName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Language</label>
                <select
                  className="input-field"
                  value={template.language}
                  onChange={(e) => setTemplate({ ...template, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="pt">Portuguese (Português)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                </select>
              </div>

              {(contentType === 'image' || contentType === 'video' || contentType === 'document') && (
                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">Media URL</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://example.com/image.jpg"
                    value={template.mediaUrl}
                    onChange={(e) => setTemplate({ ...template, mediaUrl: e.target.value })}
                  />
                </div>
              )}

              {contentType === 'location' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-airbnb-dark mb-2">Latitude</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="37.7749"
                        value={template.latitude || ''}
                        onChange={(e) => setTemplate({ ...template, latitude: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-airbnb-dark mb-2">Longitude</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="-122.4194"
                        value={template.longitude || ''}
                        onChange={(e) => setTemplate({ ...template, longitude: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Location Label</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Our Office"
                      value={template.label || ''}
                      onChange={(e) => setTemplate({ ...template, label: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Message Body</label>
                <textarea
                  className="input-field font-mono text-sm"
                  rows="5"
                  placeholder="Enter your message. Use {{1}}, {{2}}, etc. for variables"
                  value={template.body}
                  onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-airbnb-gray">
                    Use {`{{1}}`}, {`{{2}}`}, etc. for variable placeholders
                  </p>
                  <p className="text-xs text-airbnb-gray">
                    {template.body.length}/1024
                  </p>
                </div>
              </div>

              {variables.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                    Example Values (Required for WhatsApp Approval)
                  </label>
                  <div className="space-y-2">
                    {variables.map((varNum) => (
                      <div key={varNum} className="flex gap-2 items-center">
                        <span className="text-sm font-mono text-airbnb-gray w-16">{`{{${varNum}}}`}</span>
                        <input
                          type="text"
                          className="input-field flex-1"
                          value={template.exampleValues[varNum] || ''}
                          onChange={(e) => setTemplate({
                            ...template,
                            exampleValues: { ...template.exampleValues, [varNum]: e.target.value }
                          })}
                          placeholder={`Example for {{${varNum}}}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 These example values will be submitted to WhatsApp for template approval
                  </p>
                </div>
              )}

              {(contentType === 'text_buttons' || contentType === 'call_to_action' || template.buttons.length > 0) && (
                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                    Buttons (Max 3)
                  </label>
                  <div className="space-y-2 mb-3">
                    {template.buttons.map((btn, idx) => (
                      <div key={idx} className="flex gap-2">
                        <select
                          className="input-field w-32"
                          value={btn.type}
                          onChange={(e) => updateButton(idx, 'type', e.target.value)}
                        >
                          <option value="quick_reply">Quick Reply</option>
                          <option value="cta">CTA</option>
                          <option value="url">URL</option>
                          <option value="phone">Phone</option>
                        </select>
                        <input
                          type="text"
                          className="input-field flex-1"
                          placeholder="Button text"
                          value={btn.text}
                          onChange={(e) => updateButton(idx, 'text', e.target.value)}
                        />
                        {(btn.type === 'cta' || btn.type === 'url') && (
                          <input
                            type="text"
                            className="input-field flex-1"
                            placeholder="URL"
                            value={btn.url || ''}
                            onChange={(e) => updateButton(idx, 'url', e.target.value)}
                          />
                        )}
                        {btn.type === 'phone' && (
                          <input
                            type="text"
                            className="input-field flex-1"
                            placeholder="+1234567890"
                            value={btn.phone || ''}
                            onChange={(e) => updateButton(idx, 'phone', e.target.value)}
                          />
                        )}
                        <button
                          onClick={() => removeButton(idx)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {template.buttons.length < 3 && (
                    <div className="flex gap-2">
                      <button onClick={() => addButton('quick_reply')} className="btn-secondary text-sm">
                        + Quick Reply
                      </button>
                      <button onClick={() => addButton('cta')} className="btn-secondary text-sm">
                        + CTA
                      </button>
                      <button onClick={() => addButton('phone')} className="btn-secondary text-sm">
                        + Phone
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* AI Content Review Status */}
              <div className="border-t-2 border-gray-200 pt-4">
                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    AI Content Review
                    <span className="ml-2 text-xs font-normal text-purple-600">(Powered by GPT-4)</span>
                  </label>

                  {!backendConnected && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-xs text-yellow-900 font-semibold mb-1">⚠️ Backend Not Connected</p>
                      <p className="text-xs text-yellow-800">
                        Start the backend server: <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono">npm run server</code>
                      </p>
                    </div>
                  )}

                  {backendConnected && !apiKeySet && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-300 rounded">
                      <p className="text-xs text-blue-900 font-semibold mb-1">🔑 API Key Required</p>
                      <p className="text-xs text-blue-800">
                        Set your OpenAI API key in the <strong>Credentials Setup</strong> page to enable AI reviews
                      </p>
                    </div>
                  )}

                  {backendConnected && apiKeySet && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-300 rounded flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-green-800 font-semibold">AI Reviews Enabled</p>
                    </div>
                  )}

                  <p className="text-xs text-airbnb-gray">
                    AI-powered analysis checks for WhatsApp policy compliance, forbidden content, and approval likelihood
                  </p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={runPreflightCheck}
                  disabled={!template.body}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  Pre-flight Check
                </button>
                <button
                  onClick={runAiContentReview}
                  disabled={!template.body || !backendConnected || !apiKeySet || aiReviewing}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {aiReviewing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Content Review
                    </>
                  )}
                </button>
                <button
                  onClick={createTemplate}
                  disabled={!template.friendlyName || !template.body || creating || !isConnected}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Create Template
                    </>
                  )}
                </button>
              </div>

              {preflightResult && (
                <div className={`border-2 rounded-lg p-4 ${
                  preflightResult.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {preflightResult.passed ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Pre-flight Check Passed ✓</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-800">Pre-flight Check Failed</span>
                      </>
                    )}
                  </div>

                  {preflightResult.errors.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-800 mb-1">Errors:</div>
                      <ul className="text-sm text-red-700 space-y-1 ml-5 list-disc">
                        {preflightResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preflightResult.warnings.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-yellow-800 mb-1">Warnings:</div>
                      <ul className="text-sm text-yellow-700 space-y-1 ml-5 list-disc">
                        {preflightResult.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preflightResult.passed && (
                    <div>
                      <div className="text-sm font-semibold text-green-800 mb-1">Stats:</div>
                      <ul className="text-sm text-green-700 space-y-1 ml-5">
                        <li>✓ Variables: {preflightResult.stats.variables}</li>
                        <li>✓ Message length: {preflightResult.stats.length}/1024 characters</li>
                        <li>✓ Buttons: {preflightResult.stats.buttons}</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {aiReviewResult && (
                <div className={`border-2 rounded-lg p-4 ${
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
                       `AI Review: ${aiReviewResult.approval_likelihood} Approval Likelihood`}
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
                            Forbidden Category Detected
                          </div>
                          <p className="text-xs text-red-800">
                            This template may relate to a prohibited content category for US/Canada messaging
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

                      {aiReviewResult.tone_assessment && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="text-sm font-semibold text-purple-800 mb-1">Tone Assessment:</div>
                          <p className="text-sm text-purple-700">{aiReviewResult.tone_assessment}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {createSuccess && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">{createSuccess.message}</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <div><strong>Template Name:</strong> {createSuccess.friendlyName}</div>
                    <div><strong>Content SID:</strong> <span className="font-mono">{createSuccess.sid}</span></div>
                    {createSuccess.approvalStatus && (
                      <div><strong>Approval Status:</strong> <span className="badge-warning">{createSuccess.approvalStatus}</span></div>
                    )}
                  </div>
                </div>
              )}

              {createError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 mb-3">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Failed to Create Template</span>
                  </div>
                  <div className="space-y-2 text-sm text-red-700">
                    {createError.code && <div><strong>Error Code:</strong> <span className="font-mono">{createError.code}</span></div>}
                    {createError.message && <div><strong>Message:</strong> {createError.message}</div>}
                    {createError.details && <div><strong>Details:</strong> {createError.details}</div>}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Column - Live Preview */}
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
            <h3 className="font-semibold text-airbnb-dark mb-4 text-center">Live Preview</h3>
            <IPhoneMockup
              message={previewMessage}
              buttons={template.buttons}
              mediaType={template.mediaType}
              mediaUrl={template.mediaUrl}
            />
          </div>
        </div>
      </div>

      {/* API Call Display - Full Width */}
      <div className="card">
        <div className="mb-4">
          <a
            href="https://www.twilio.com/docs/content/content-api-resources"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            📖 Content API Documentation →
          </a>
        </div>
        <ApiCallDisplay
          method="POST"
          url="https://content.twilio.com/v1/Content"
          headers={{
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
          }}
          body={createApiPayload}
          title="Step 1: Create Template - Content API"
        />
      </div>

      {/* API Call Displays - Post Creation */}

      {createApiResponse && (
        <div className="card bg-gray-50">
          <h4 className="font-semibold text-airbnb-dark mb-3">Create Template API Response</h4>
          <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
            <div className="text-yellow-300 mb-2">Response:</div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(createApiResponse, null, 2)}</pre>
          </div>
        </div>
      )}

    </div>
  );
};

export default TemplateDesigner;

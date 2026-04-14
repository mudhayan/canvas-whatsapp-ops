import React, { useState, useEffect } from 'react';
import { Send, Smartphone, CheckCircle2, Loader2, RefreshCw, XCircle, Webhook } from 'lucide-react';
import ApiCallDisplay from './ApiCallDisplay';
import IPhoneMockup from './IPhoneMockup';

const CampaignOrchestrator = ({ credentials, isConnected }) => {
  const [sendingMode, setSendingMode] = useState('without_fallback'); // 'without_fallback' or 'with_fallback'
  const [campaign, setCampaign] = useState({
    contentSid: '',
    to: 'whatsapp:+18326201190',
    from: '',
    messagingServiceSid: '',
    variables: {
      '1': '',
      '2': ''
    }
  });

  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState(null);
  const [messageStatus, setMessageStatus] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [senderNumbers, setSenderNumbers] = useState([]);
  const [messagingServices, setMessagingServices] = useState([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [messageLogs, setMessageLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isConnected && credentials.accountSid && credentials.authToken) {
      fetchSenderNumbers();
      fetchMessagingServices();
      fetchTemplates();
    }
  }, [isConnected, credentials]);

  useEffect(() => {
    if (sendingMode === 'with_fallback') {
      // Send with Fallback - use Messaging Service
      setCampaign(prev => ({ ...prev, to: 'whatsapp:+17132133896' }));
      // Auto-select "Airbnb - WhatsApp with SMS Fallback" messaging service
      const airbnbService = messagingServices.find(s => s.friendlyName === 'Airbnb - WhatsApp with SMS Fallback');
      if (airbnbService) {
        setCampaign(prev => ({ ...prev, messagingServiceSid: airbnbService.sid }));
      }
    } else if (sendingMode === 'without_fallback') {
      // Send without Fallback - use Specific Sender (Twilio Bennett Demo)
      setCampaign(prev => ({ ...prev, to: 'whatsapp:+18326201190' }));
      // Auto-select "Twilio Bennett Demo" sender
      const bennettSender = senderNumbers.find(s => s.friendlyName === 'Twilio Bennett Demo');
      if (bennettSender) {
        setCampaign(prev => ({ ...prev, from: bennettSender.senderId }));
      }
    }
  }, [sendingMode, senderNumbers, messagingServices]);

  const fetchSenderNumbers = async () => {
    setLoadingSenders(true);
    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      const sendersResponse = await fetch(
        `https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=20`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (sendersResponse.ok) {
        const sendersData = await sendersResponse.json();

        const whatsappSenders = (sendersData.senders || []).map(sender => ({
          phoneNumber: sender.sender_id?.replace('whatsapp:', '') || '',
          friendlyName: sender.profile?.name || sender.sender_id,
          senderId: sender.sender_id,
          sid: sender.sid,
          status: sender.status
        }));

        setSenderNumbers(whatsappSenders);

        // Set first sender as default
        if (whatsappSenders.length > 0 && !campaign.from) {
          setCampaign({ ...campaign, from: whatsappSenders[0].senderId });
        }
      } else {
        setSenderNumbers([]);
      }
    } catch (error) {
      console.error('Error fetching sender numbers:', error);
      setSenderNumbers([]);
    } finally {
      setLoadingSenders(false);
    }
  };

  const fetchMessagingServices = async () => {
    setLoadingServices(true);
    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      const servicesResponse = await fetch(
        `https://messaging.twilio.com/v1/Services?PageSize=20`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();

        const services = (servicesData.services || []).map(service => ({
          sid: service.sid,
          friendlyName: service.friendly_name,
          dateCreated: service.date_created
        }));

        setMessagingServices(services);

        // Set first service as default
        if (services.length > 0 && !campaign.messagingServiceSid) {
          setCampaign({ ...campaign, messagingServiceSid: services[0].sid });
        }
      } else {
        setMessagingServices([]);
      }
    } catch (error) {
      console.error('Error fetching messaging services:', error);
      setMessagingServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch('https://content.twilio.com/v1/Content', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.contents || []);

        // Set first template as default
        if (data.contents && data.contents.length > 0 && !campaign.contentSid) {
          setCampaign({ ...campaign, contentSid: data.contents[0].sid });
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchMessageLogs = async () => {
    setLoadingLogs(true);
    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json?PageSize=10`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessageLogs(data);
      }
    } catch (error) {
      console.error('Error fetching message logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const sendMessage = async () => {
    setSending(true);
    setResponse(null);
    setMessageStatus(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      const formData = new URLSearchParams();
      formData.append('To', campaign.to);

      // Use either messaging service (with fallback) or specific sender (without fallback)
      if (sendingMode === 'with_fallback') {
        formData.append('MessagingServiceSid', campaign.messagingServiceSid);
      } else {
        formData.append('From', campaign.from);
      }

      formData.append('ContentSid', campaign.contentSid);
      formData.append('ContentVariables', JSON.stringify(campaign.variables));

      const apiResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        }
      );

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        setResponse({
          sid: data.sid,
          status: data.status,
          to: data.to,
          from: data.from,
          date_created: data.date_created,
          price: data.price,
          uri: data.uri,
          error_code: null,
          error_message: null
        });

        // Simulate status updates (in production, this would come from webhook)
        setMessageStatus({
          currentStatus: data.status,
          statusHistory: [
            { status: 'queued', timestamp: new Date().toISOString(), description: 'Message queued for delivery' }
          ]
        });
      } else {
        setResponse({
          sid: null,
          status: 'failed',
          to: campaign.to,
          from: sendingMode === 'with_fallback' ? `MessagingService: ${campaign.messagingServiceSid}` : campaign.from,
          date_created: new Date().toISOString(),
          price: null,
          uri: null,
          error_code: data.code,
          error_message: data.message
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setResponse({
        sid: null,
        status: 'failed',
        to: campaign.to,
        from: sendingMode === 'with_fallback' ? `MessagingService: ${campaign.messagingServiceSid}` : campaign.from,
        date_created: new Date().toISOString(),
        price: null,
        uri: null,
        error_code: 'CLIENT_ERROR',
        error_message: error.message
      });
    } finally {
      setSending(false);
    }
  };

  const messagePayload = {
    To: campaign.to,
    ...(sendingMode === 'with_fallback'
      ? { MessagingServiceSid: campaign.messagingServiceSid }
      : { From: campaign.from }
    ),
    ContentSid: campaign.contentSid,
    ContentVariables: JSON.stringify(campaign.variables)
  };

  // Get current template for preview
  const currentTemplate = templates.find(t => t.sid === campaign.contentSid);

  // Find body from any content type (card, quick-reply, text, whatsapp, etc.)
  let templateBody = 'Select a template to preview';
  if (currentTemplate?.types) {
    const contentTypes = Object.values(currentTemplate.types);
    const typeWithBody = contentTypes.find(type => type.body);
    if (typeWithBody) {
      templateBody = typeWithBody.body;
    }
  }

  let previewMessage = templateBody;
  Object.keys(campaign.variables).forEach(key => {
    previewMessage = previewMessage.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), campaign.variables[key]);
  });

  // Get buttons/actions from any content type that has them
  let templateButtons = [];
  if (currentTemplate?.types) {
    const contentTypes = Object.values(currentTemplate.types);
    const typeWithActions = contentTypes.find(type => type.actions);
    if (typeWithActions) {
      templateButtons = typeWithActions.actions;
    }
  }

  // Extract variables from selected template
  const variableMatches = templateBody.match(/\{\{(\d+)\}\}/g);
  const templateVariables = variableMatches ? [...new Set(variableMatches.map(v => v.match(/\d+/)[0]))].sort() : [];

  const messageStatuses = [
    { status: 'queued', color: 'bg-blue-100 text-blue-700', description: 'Message has been queued for sending' },
    { status: 'sending', color: 'bg-blue-100 text-blue-700', description: 'Message is being sent' },
    { status: 'sent', color: 'bg-green-100 text-green-700', description: 'Message sent to WhatsApp' },
    { status: 'delivered', color: 'bg-green-100 text-green-700', description: 'Message delivered to recipient' },
    { status: 'read', color: 'bg-purple-100 text-purple-700', description: 'Message read by recipient' },
    { status: 'failed', color: 'bg-red-100 text-red-700', description: 'Message failed to send' },
    { status: 'undelivered', color: 'bg-red-100 text-red-700', description: 'Message not delivered' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Send className="w-8 h-8 text-airbnb-red" />
        <div>
          <h2 className="text-2xl font-bold text-airbnb-dark">Demo - Send a Message</h2>
          <p className="text-airbnb-gray">Send live WhatsApp messages using approved templates</p>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ Connect your credentials first</p>
          <p className="text-sm text-yellow-800 mt-1">Sender numbers and templates will be loaded from your account</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Message Configuration */}
        <div className="space-y-6">
          <div className="card">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
              <p className="text-sm font-semibold text-blue-900">💡 SMS Fallback Feature</p>
              <div className="text-sm text-blue-800 mt-2 space-y-1">
                <div><strong>Send with Fallback:</strong> If WhatsApp fails, automatically retry via SMS</div>
                <div><strong>Send without Fallback:</strong> WhatsApp only - no SMS fallback if delivery fails</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Template</label>
                <select
                  className="input-field"
                  value={campaign.contentSid}
                  onChange={(e) => {
                    // Reset variables when template changes
                    const newTemplate = templates.find(t => t.sid === e.target.value);
                    let body = '';

                    if (newTemplate?.types) {
                      // Find body from any content type (card, quick-reply, text, whatsapp, etc.)
                      const contentTypes = Object.values(newTemplate.types);
                      const typeWithBody = contentTypes.find(type => type.body);
                      if (typeWithBody) {
                        body = typeWithBody.body;
                      }
                    }

                    const matches = body.match(/\{\{(\d+)\}\}/g);
                    const vars = matches ? [...new Set(matches.map(v => v.match(/\d+/)[0]))] : [];
                    const newVars = {};
                    vars.forEach(v => {
                      newVars[v] = '';
                    });
                    setCampaign({ ...campaign, contentSid: e.target.value, variables: newVars });
                  }}
                  disabled={!isConnected}
                >
                  {templates.length === 0 ? (
                    <option value="">No templates available</option>
                  ) : (
                    templates.map((tmpl) => (
                      <option key={tmpl.sid} value={tmpl.sid}>
                        {tmpl.friendly_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">Delivery Method</label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendingMode"
                      value="without_fallback"
                      checked={sendingMode === 'without_fallback'}
                      onChange={(e) => setSendingMode(e.target.value)}
                      className="w-4 h-4 text-airbnb-red focus:ring-airbnb-red"
                    />
                    <span className="text-sm text-airbnb-dark">Send without Fallback</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendingMode"
                      value="with_fallback"
                      checked={sendingMode === 'with_fallback'}
                      onChange={(e) => setSendingMode(e.target.value)}
                      className="w-4 h-4 text-airbnb-red focus:ring-airbnb-red"
                    />
                    <span className="text-sm text-airbnb-dark">Send with Fallback</span>
                  </label>
                </div>

                {sendingMode === 'without_fallback' ? (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-sm text-airbnb-gray mb-1">Using Sender:</div>
                    <div className="text-sm font-semibold text-airbnb-dark">
                      {loadingSenders ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        campaign.from ? (
                          senderNumbers.find(s => s.senderId === campaign.from)?.friendlyName || 'Twilio Bennett Demo'
                        ) : 'No sender selected'
                      )}
                    </div>
                    <div className="text-xs text-airbnb-gray mt-1">WhatsApp only - no SMS fallback</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-sm text-airbnb-gray mb-1">Using Messaging Service:</div>
                    <div className="text-sm font-semibold text-airbnb-dark">
                      {loadingServices ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        campaign.messagingServiceSid ? (
                          messagingServices.find(s => s.sid === campaign.messagingServiceSid)?.friendlyName || 'Airbnb - WhatsApp with SMS Fallback'
                        ) : 'No service selected'
                      )}
                    </div>
                    <div className="text-xs text-airbnb-gray mt-1">Automatic SMS fallback if WhatsApp fails</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-airbnb-dark mb-2">To (Recipient WhatsApp Number)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="whatsapp:+18326201190"
                  value={campaign.to}
                  onChange={(e) => setCampaign({ ...campaign, to: e.target.value })}
                />
                <p className="text-xs text-airbnb-gray mt-1">Format: whatsapp:+1234567890 (include country code)</p>
              </div>

              {templateVariables.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">Template Variables</label>
                  <div className="space-y-2">
                    {templateVariables.map((key) => (
                      <div key={key} className="flex gap-2 items-center">
                        <span className="text-sm font-mono text-airbnb-gray w-16">{`{{${key}}}`}</span>
                        <input
                          type="text"
                          className="input-field flex-1"
                          value={campaign.variables[key] || ''}
                          onChange={(e) => setCampaign({
                            ...campaign,
                            variables: { ...campaign.variables, [key]: e.target.value }
                          })}
                          placeholder={`Value for {{${key}}}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={sendMessage}
                disabled={
                  sending ||
                  !isConnected ||
                  !campaign.to ||
                  !campaign.contentSid ||
                  (sendingMode === 'without_fallback' && !campaign.from) ||
                  (sendingMode === 'with_fallback' && !campaign.messagingServiceSid)
                }
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5" />
                    Send WhatsApp Message
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Message Status Tracking */}
          {messageStatus && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-airbnb-dark mb-3 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-blue-600" />
                Message Status Tracking
              </h3>
              <p className="text-sm text-airbnb-gray mb-4">
                Status updates will be sent to your webhook URL as the message progresses through delivery stages.
              </p>

              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-airbnb-gray mb-1">Current Status</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                    messageStatuses.find(s => s.status === messageStatus.currentStatus)?.color || 'bg-gray-100 text-gray-700'
                  }`}>
                    {messageStatus.currentStatus}
                  </span>
                </div>

                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-airbnb-gray mb-2">Possible Status Values</div>
                  <div className="space-y-1">
                    {messageStatuses.map((status, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono ${status.color}`}>
                          {status.status}
                        </span>
                        <span className="text-airbnb-gray">{status.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-300">
                  <div className="text-yellow-300 mb-2">Example Webhook Payload:</div>
                  <pre className="whitespace-pre-wrap">{JSON.stringify({
                    MessageSid: response?.sid || 'SM...',
                    MessageStatus: 'delivered',
                    To: campaign.to,
                    From: sendingMode === 'with_fallback' ? 'whatsapp:+1234567890' : campaign.from,
                    ...(sendingMode === 'with_fallback' && { MessagingServiceSid: campaign.messagingServiceSid }),
                    AccountSid: credentials.accountSid,
                    ApiVersion: '2010-04-01',
                    SmsStatus: 'delivered',
                    SmsSid: response?.sid || 'SM...'
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
            <h3 className="font-semibold text-airbnb-dark mb-4 text-center">Live Preview</h3>
            <IPhoneMockup
              message={previewMessage}
              buttons={templateButtons.map(btn => ({
                type: btn.url ? 'cta' : (btn.phone_number ? 'phone' : 'quick_reply'),
                text: btn.title,
                url: btn.url,
                phone: btn.phone_number
              }))}
            />
          </div>
        </div>
      </div>

      <ApiCallDisplay
        method="POST"
        url={`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`}
        headers={{
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
        }}
        body={messagePayload}
        title={sendingMode === 'with_fallback'
          ? "Send WhatsApp Message with SMS Fallback"
          : "Send WhatsApp Message (No Fallback)"
        }
      />

      {response && (
        <div className={`card ${response.error_code ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
          <div className="flex items-center gap-2 mb-4">
            {response.error_code ? (
              <>
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 className="font-semibold text-lg text-red-800">Message Failed</h3>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-lg text-green-800">Message Sent Successfully</h3>
              </>
            )}
          </div>

          <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>

          <div className="mt-4 space-y-2">
            {response.sid && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Message SID:</span>
                <span className="text-sm font-mono text-gray-900">{response.sid}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Status:</span>
              <span className={response.error_code ? 'badge-error' : 'badge-info'}>{response.status}</span>
            </div>
            {response.error_code && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Error Code:</span>
                  <span className="text-sm font-mono text-red-600">{response.error_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Error Message:</span>
                  <span className="text-sm text-red-600">{response.error_message}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Created:</span>
              <span className="text-sm text-gray-900">{new Date(response.date_created).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="card bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-airbnb-dark">Message Logs (Last 10)</h4>
          <button
            onClick={fetchMessageLogs}
            disabled={!isConnected || loadingLogs}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loadingLogs ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Fetch Logs
              </>
            )}
          </button>
        </div>

        {messageLogs && (
          <>
            <ApiCallDisplay
              method="GET"
              url={`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json?PageSize=10`}
              headers={{
                'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
              }}
              body={null}
              title="Fetch Message Logs"
            />

            <div className="mt-4 space-y-3">
              {messageLogs.messages && messageLogs.messages.length > 0 ? (
                messageLogs.messages.map((msg, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{msg.sid}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          msg.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          msg.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                          msg.status === 'undelivered' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.date_created).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">From:</span>
                        <span className="ml-2 font-mono text-gray-900">{msg.from}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">To:</span>
                        <span className="ml-2 font-mono text-gray-900">{msg.to}</span>
                      </div>
                      {msg.body && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Body:</span>
                          <p className="mt-1 text-gray-900 text-xs">{msg.body}</p>
                        </div>
                      )}
                      {msg.error_code && (
                        <div className="col-span-2">
                          <span className="text-red-600 font-semibold">Error {msg.error_code}:</span>
                          <span className="ml-2 text-red-800">{msg.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No messages found</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignOrchestrator;

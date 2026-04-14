import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Phone, Terminal, RefreshCw, Loader2, Zap, TrendingUp, ExternalLink } from 'lucide-react';
import ApiCallDisplay from './ApiCallDisplay';

const GlobalHealth = ({ credentials = {}, isConnected }) => {
  const [senders, setSenders] = useState([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [sendersApiResponse, setSendersApiResponse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [errorSearchQuery, setErrorSearchQuery] = useState('');
  const [errorFilter, setErrorFilter] = useState('all');
  const [collapsedPanels, setCollapsedPanels] = useState({});
  const [channelFallbackEnabled, setChannelFallbackEnabled] = useState(true);

  // Self-Healing Event Stream state
  const [healingLogs, setHealingLogs] = useState([]);
  const [healingMetrics, setHealingMetrics] = useState({
    attempted: 0,
    autoHealed: 0,
    requiresAttention: 0
  });

  const fetchSenders = async (currentMessages = []) => {
    if (!isConnected || !credentials?.accountSid || !credentials?.authToken) {
      console.log('Skipping fetchSenders - missing credentials or not connected');
      return;
    }

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

      if (!sendersResponse.ok) {
        console.error('Failed to fetch WhatsApp senders:', sendersResponse.status);
        setLoadingSenders(false);
        return;
      }

      const sendersData = await sendersResponse.json();
      setSendersApiResponse(sendersData);

      const allWhatsappSenders = Array.isArray(sendersData.senders) ? sendersData.senders : [];

      const whatsappSendersWithHealth = allWhatsappSenders.map((sender) => {
        const phoneNumber = sender.sender_id?.replace('whatsapp:', '') || '';

        return {
          senderId: sender.sender_id || 'unknown',
          phoneNumber: phoneNumber || 'unknown',
          status: sender.status || 'unknown',
          name: sender.profile?.name || phoneNumber || 'Unknown',
          qualityRating: sender.properties?.quality_rating || 'N/A',
          messagingLimit: sender.properties?.messaging_limit || 'N/A',
          wabaId: sender.configuration?.waba_id || null,
          offlineReasons: Array.isArray(sender.offline_reasons) ? sender.offline_reasons : [],
          sid: sender.sid || 'unknown',
          dateCreated: sender.date_created || null,
          rawSender: sender // Keep the raw sender for debugging
        };
      });

      setSenders(whatsappSendersWithHealth);
    } catch (error) {
      console.error('Error fetching senders:', error);
      setError(error.message);
      setSenders([]);
      setSendersApiResponse(null);
    } finally {
      setLoadingSenders(false);
    }
  };

  const fetchMessages = async () => {
    if (!isConnected || !credentials?.accountSid || !credentials?.authToken) {
      console.log('Skipping fetchMessages - missing credentials or not connected');
      return;
    }

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const dateString = oneDayAgo.toISOString().split('T')[0];

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json?DateSent>=${dateString}&PageSize=100`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const messagesList = Array.isArray(data.messages) ? data.messages : [];
        setMessages(messagesList);

        const newEvents = messagesList.slice(0, 15).map(msg => ({
          timestamp: msg?.date_updated || msg?.date_sent || new Date().toISOString(),
          status: msg?.status || 'unknown',
          messageSid: msg?.sid || 'unknown',
          to: msg?.to || 'unknown',
          from: msg?.from || 'unknown',
          errorCode: msg?.error_code || null,
          direction: msg?.direction || 'outbound-api'
        }));
        setEvents(newEvents);

        // Pass the messages to fetchSenders
        fetchSenders(messagesList);
      } else {
        setMessages([]);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error.message);
      setMessages([]);
      setEvents([]);
    }
  };

  // Reset initialization flag when connection changes
  useEffect(() => {
    if (!isConnected) {
      setHasInitialized(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && credentials?.accountSid && credentials?.authToken && !hasInitialized) {
      setHasInitialized(true);
      // Fetch senders immediately
      fetchSenders([]).catch(err => {
        console.error('Failed to fetch senders:', err);
        setError(err.message);
      });
      // Then fetch messages which will update senders with message stats
      fetchMessages().catch(err => {
        console.error('Failed to fetch messages:', err);
        setError(err.message);
      });
    }

    if (isConnected && credentials?.accountSid && credentials?.authToken && hasInitialized) {
      const interval = setInterval(() => {
        fetchMessages().catch(err => console.error('Fetch messages error:', err));
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, credentials?.accountSid, credentials?.authToken, hasInitialized]);

  useEffect(() => {
    // Only show simulated events if not connected OR no real messages yet
    if (!isConnected || messages.length === 0) {
      const interval = setInterval(() => {
        const eventTypes = ['delivered', 'read', 'sent', 'failed'];
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const newEvent = {
          timestamp: new Date().toISOString(),
          status: randomEvent,
          messageSid: 'SM' + Math.random().toString(36).substr(2, 9),
          to: '+521' + Math.floor(Math.random() * 1000000000),
          from: 'whatsapp:+18326201190',
          errorCode: randomEvent === 'failed' ? '131049' : null,
          direction: 'outbound-api'
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 15));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isConnected, messages.length]);

  const getErrorCodeData = (channelFallback) => {
    if (channelFallback) {
      return {
        session: [
          { code: '63016', metaCode: '470', class: 'observe', description: 'Freeform message outside 24h session window', action: '✓ Twilio Channel Fallback handles → SMS delivered. Log event frequency. For WhatsApp-only: pre-check session window, swap to Content Template before sending.' },
          { code: '63024', metaCode: '1026', class: 'observe', description: 'Recipient phone number not registered on WhatsApp', action: '✓ Twilio Channel Fallback handles → SMS delivered. Log to event store; alert if frequency spikes (data quality signal).' },
          { code: '63003', metaCode: '1006 / 1013 / 1021', class: 'observe', description: 'Destination number is invalid or not WhatsApp-capable', action: '✓ Twilio Channel Fallback handles → SMS delivered. Log event; do not trigger custom routing.' },
          { code: '63032', metaCode: '472', class: 'observe', description: 'Cannot send to this user due to a WhatsApp platform limitation (user block or policy)', action: '✓ Twilio delivers via SMS, BUT flag user in compliance suppression list; alert ops team; review sender health.' },
          { code: '63030', metaCode: '1010', class: 'structural', description: 'Message failed — recipient opted out or blocked business', action: 'Remove from send list; do not retry; update consent store' }
        ],
      };
    } else {
      return {
        session: [
          { code: '63016', metaCode: '470', class: 'structural', description: 'Freeform message outside 24h session window', action: 'Switch to approved Content Template; keep in WhatsApp channel' },
          { code: '63024', metaCode: '1026', class: 'structural', description: 'Recipient phone number not registered on WhatsApp', action: 'Immediately fall back to SMS; preserve MessageSid for dedup' },
          { code: '63003', metaCode: '1006 / 1013 / 1021', class: 'structural', description: 'Destination number is invalid or not WhatsApp-capable', action: 'Fail fast; do not retry; check number validity via Lookup API' },
          { code: '63032', metaCode: '472', class: 'compliance', description: 'Cannot send to this user due to a WhatsApp platform limitation (user block or policy)', action: 'Halt all retries; suppress sender; alert ops team' },
          { code: '63030', metaCode: '1010', class: 'structural', description: 'Message failed — recipient opted out or blocked business', action: 'Remove from send list; do not retry; update consent store' }
        ],
      };
    }
  };

  const errorCodeData = {
    ...getErrorCodeData(channelFallbackEnabled),
    account: [
      { code: '63001', metaCode: '1005', class: 'structural', description: 'Channel authentication failure — WABA credentials invalid or expired', action: 'Re-authenticate WABA; check Meta Business Manager token' },
      { code: '63020', metaCode: '402', class: 'structural', description: 'Business has not accepted Twilio invitation on Meta Business Manager', action: 'Accept the Twilio invitation in Meta BM; one-time fix' },
      { code: '63021', metaCode: '1001 / 408 / 410', class: 'compliance', description: 'Account-level violation — sender suspended or restricted by Meta', action: 'Halt sends on affected sender; open Meta Business appeal' },
      { code: '63025', metaCode: '1004', class: 'structural', description: 'Phone number not registered or not enabled on WhatsApp', action: 'Complete sender registration via Senders API or Console' },
      { code: '63033', metaCode: '1007', class: 'structural', description: '(Deprecated) Business account not verified', action: 'Complete Meta Business Verification; deprecated but may still appear' }
    ],
    template: [
      { code: '63010', metaCode: '1022', class: 'internal', description: 'Template name not found or does not exist in specified language/locale', action: 'Verify template name and locale against Content Template API; Twilio internal — not billed' },
      { code: '63013', metaCode: '1008 / 1009', class: 'compliance', description: 'Template content violates WhatsApp policy or was rejected by Meta', action: 'Review template against Meta guidelines; submit revised template' },
      { code: '63022', metaCode: '430 / 432 / 433', class: 'structural', description: 'Template variable mismatch — wrong number or type of parameters', action: 'Fix parameter mapping in Content Template API call; resubmit' },
      { code: '63005', metaCode: '1000', class: 'structural', description: 'Channel did not accept the content — media format, size, or type rejected', action: 'Validate media against WhatsApp limits (16MB, supported types); retry with corrected asset' },
      { code: '63019', metaCode: '400', class: 'structural', description: 'Bad request — malformed message payload', action: 'Inspect request structure; check required fields and formats' }
    ],
    ratelimit: [
      { code: '63018', metaCode: '1015 / 429 / 471', class: 'transient', description: 'Rate limit hit — message sending frequency exceeded for this sender or number', action: 'Backoff and requeue; do not channel-switch; monitor via Alerting Hub' },
      { code: '63027', metaCode: '2001 / 2003', class: 'transient', description: 'Message volume limit reached for this WABA tier', action: 'Queue with exponential backoff; consider requesting higher tier from Meta' },
      { code: '63028', metaCode: '2000', class: 'transient', description: 'Broadcast or campaign message limit exceeded', action: 'Spread sends over longer time window; requeue remaining batch' },
      { code: '63029', metaCode: '2002', class: 'transient', description: 'Per-user marketing message frequency cap hit (Meta enforcement)', action: 'Respect Meta per-user limits; do not retry to same user within cap window' }
    ],
    infrastructure: [
      { code: '63012', metaCode: '500 / 1011 / 1014 / 1023 / 1025', class: 'internal', description: 'WhatsApp internal service error — Meta-side failure', action: 'Retry with backoff; Twilio internal error — not billed' },
      { code: '63009', metaCode: '—', class: 'internal', description: 'Channel provider returned HTTP 5xx', action: 'Retry with exponential backoff; monitor Meta status page' },
      { code: '63015', metaCode: '—', class: 'internal', description: 'Sandbox only — destination number has not joined the sandbox', action: 'Have test recipient send join message to sandbox number' },
      { code: '63038', metaCode: '—', class: 'internal', description: 'Account suspended or fraud detection limit triggered', action: 'Contact Twilio support; do not retry — Twilio internal, not billed' }
    ]
  };

  const panelTitles = {
    session: 'Session & messaging rules',
    account: 'Account, auth & registration',
    template: 'Template & content errors',
    ratelimit: 'Rate limits & capacity',
    infrastructure: 'Infrastructure & internal'
  };

  const filterErrorCodes = (errors) => {
    return errors.filter(error => {
      const classMatch = errorFilter === 'all' || error.class === errorFilter;
      const searchMatch = !errorSearchQuery ||
        error.code.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
        error.metaCode.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
        error.description.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
        error.action.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
        error.class.toLowerCase().includes(errorSearchQuery.toLowerCase());
      return classMatch && searchMatch;
    });
  };

  const togglePanel = (panelName) => {
    setCollapsedPanels(prev => ({ ...prev, [panelName]: !prev[panelName] }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return 'text-green-400';
      case 'failed':
      case 'undelivered':
        return 'text-red-400';
      case 'queued':
      case 'accepted':
        return 'text-blue-400';
      case 'read':
        return 'text-purple-400';
      default:
        return 'text-yellow-400';
    }
  };

  // Self-Healing Event Stream helpers
  const generateMessageSid = () => {
    const chars = '0123456789abcdef';
    let sid = 'SM';
    for (let i = 0; i < 32; i++) {
      sid += chars[Math.floor(Math.random() * chars.length)];
    }
    return sid;
  };

  const addHealingLog = (entry) => {
    setHealingLogs(prev => {
      const newLogs = [entry, ...prev];
      return newLogs.slice(0, 60); // Cap at 60 entries
    });
  };

  const clearHealingLogs = () => {
    setHealingLogs([]);
    setHealingMetrics({
      attempted: 0,
      autoHealed: 0,
      requiresAttention: 0
    });
  };

  const injectFault = async (scenario) => {
    const messageSid = generateMessageSid();
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Increment attempted counter
    setHealingMetrics(prev => ({
      ...prev,
      attempted: prev.attempted + 1
    }));

    switch (scenario) {
      case '63016': // Outside 24h window
        if (channelFallbackEnabled) {
          addHealingLog({
            messageSid,
            errorCode: '63016',
            timestamp,
            action: 'Twilio Channel Fallback → SMS delivered',
            outcome: 'observe',
            bg: 'bg-blue-50 border-l-4 border-blue-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        } else {
          addHealingLog({
            messageSid,
            errorCode: '63016',
            timestamp,
            action: 'Detected: Outside 24h window',
            outcome: 'structural',
            bg: 'bg-yellow-50 border-l-4 border-yellow-400'
          });
          setTimeout(() => {
            addHealingLog({
              messageSid,
              errorCode: '63016',
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              action: '→ Switched to approved Content Template',
              outcome: 'healed',
              bg: 'bg-green-50 border-l-4 border-green-400'
            });
            setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
          }, 800);
        }
        break;

      case '63024': // No WhatsApp account
        if (channelFallbackEnabled) {
          addHealingLog({
            messageSid,
            errorCode: '63024',
            timestamp,
            action: 'Twilio Channel Fallback → SMS delivered. Logged for data quality.',
            outcome: 'observe',
            bg: 'bg-blue-50 border-l-4 border-blue-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        } else {
          addHealingLog({
            messageSid,
            errorCode: '63024',
            timestamp,
            action: 'Detected: No WhatsApp account',
            outcome: 'structural',
            bg: 'bg-yellow-50 border-l-4 border-yellow-400'
          });
          setTimeout(() => {
            addHealingLog({
              messageSid,
              errorCode: '63024',
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              action: '→ Immediately fell back to SMS',
              outcome: 'healed',
              bg: 'bg-green-50 border-l-4 border-green-400'
            });
            setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
          }, 600);
        }
        break;

      case '63003': // Invalid destination
        if (channelFallbackEnabled) {
          addHealingLog({
            messageSid,
            errorCode: '63003',
            timestamp,
            action: 'Twilio Channel Fallback → SMS delivered. No custom routing triggered.',
            outcome: 'observe',
            bg: 'bg-blue-50 border-l-4 border-blue-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        } else {
          addHealingLog({
            messageSid,
            errorCode: '63003',
            timestamp,
            action: 'Detected: Invalid destination',
            outcome: 'structural',
            bg: 'bg-yellow-50 border-l-4 border-yellow-400'
          });
          setTimeout(() => {
            addHealingLog({
              messageSid,
              errorCode: '63003',
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              action: '→ Validated via Lookup API, failed fast',
              outcome: 'healed',
              bg: 'bg-gray-50 border-l-4 border-gray-400'
            });
          }, 700);
        }
        break;

      case '63032': // Policy violation
        if (channelFallbackEnabled) {
          addHealingLog({
            messageSid,
            errorCode: '63032',
            timestamp,
            action: 'Twilio delivered via SMS. User flagged in compliance list. Ops team alerted.',
            outcome: 'observe',
            bg: 'bg-blue-50 border-l-4 border-blue-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        } else {
          addHealingLog({
            messageSid,
            errorCode: '63032',
            timestamp,
            action: 'Detected: Policy violation',
            outcome: 'compliance',
            bg: 'bg-red-50 border-l-4 border-red-400'
          });
          setTimeout(() => {
            addHealingLog({
              messageSid,
              errorCode: '63032',
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              action: '→ HALTED. Suppressed sender. Ops team alerted.',
              outcome: 'halted',
              bg: 'bg-red-50 border-l-4 border-red-400'
            });
            setHealingMetrics(prev => ({ ...prev, requiresAttention: prev.requiresAttention + 1 }));
          }, 500);
        }
        break;

      case '63018': // Rate limit
        addHealingLog({
          messageSid,
          errorCode: '63018',
          timestamp,
          action: 'Detected: Rate limit hit',
          outcome: 'retry',
          bg: 'bg-amber-50 border-l-4 border-amber-400'
        });
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '63018',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '→ Exponential backoff: 2s',
            outcome: 'retry',
            bg: 'bg-amber-50 border-l-4 border-amber-400'
          });
        }, 600);
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '63018',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '→ Retrying same channel...',
            outcome: 'retry',
            bg: 'bg-amber-50 border-l-4 border-amber-400'
          });
        }, 1200);
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '63018',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '✓ Delivered after backoff',
            outcome: 'healed',
            bg: 'bg-green-50 border-l-4 border-green-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        }, 2000);
        break;

      case '20429': // API rate limit
        addHealingLog({
          messageSid,
          errorCode: '20429',
          timestamp,
          action: 'Detected: API rate limit',
          outcome: 'retry',
          bg: 'bg-amber-50 border-l-4 border-amber-400'
        });
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '20429',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '→ Backoff and requeue',
            outcome: 'retry',
            bg: 'bg-amber-50 border-l-4 border-amber-400'
          });
        }, 700);
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '20429',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '✓ Delivered after requeue',
            outcome: 'healed',
            bg: 'bg-green-50 border-l-4 border-green-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        }, 1800);
        break;

      case '63022': // Template variable mismatch
        addHealingLog({
          messageSid,
          errorCode: '63022',
          timestamp,
          action: 'Detected: Template variable mismatch',
          outcome: 'structural',
          bg: 'bg-yellow-50 border-l-4 border-yellow-400'
        });
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '63022',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '→ Fixed parameter mapping via Content Template API',
            outcome: 'healed',
            bg: 'bg-green-50 border-l-4 border-green-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        }, 900);
        break;

      case '63013': // Template policy violation
        addHealingLog({
          messageSid,
          errorCode: '63013',
          timestamp,
          action: 'Detected: Template policy violation',
          outcome: 'compliance',
          bg: 'bg-red-50 border-l-4 border-red-400'
        });
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '63013',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '→ HALTED. Review template against Meta guidelines.',
            outcome: 'halted',
            bg: 'bg-red-50 border-l-4 border-red-400'
          });
          setHealingMetrics(prev => ({ ...prev, requiresAttention: prev.requiresAttention + 1 }));
        }, 500);
        break;

      case '11200': // Webhook failure
        addHealingLog({
          messageSid,
          errorCode: '11200',
          timestamp,
          action: 'Detected: Webhook HTTP failure',
          outcome: 'retry',
          bg: 'bg-amber-50 border-l-4 border-amber-400'
        });
        setTimeout(() => {
          addHealingLog({
            messageSid,
            errorCode: '11200',
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: '→ Retrying via fallback URL. Event Streams guarantees delivery.',
            outcome: 'healed',
            bg: 'bg-green-50 border-l-4 border-green-400'
          });
          setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        }, 800);
        break;

      case 'delivered': // Happy path
        addHealingLog({
          messageSid,
          errorCode: null,
          timestamp,
          action: '✓ WhatsApp delivered + read receipt confirmed',
          outcome: 'healed',
          bg: 'bg-green-50 border-l-4 border-green-400'
        });
        setHealingMetrics(prev => ({ ...prev, autoHealed: prev.autoHealed + 1 }));
        break;

      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-airbnb-red" />
          <div>
            <h2 className="text-2xl font-bold text-airbnb-dark">Global Health & Observability</h2>
            <p className="text-airbnb-gray">Monitor WhatsApp sender health and system status</p>
          </div>
        </div>
        {isConnected && (
          <button
            onClick={fetchMessages}
            disabled={loadingSenders}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSenders ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-sm font-semibold text-red-900">❌ Error</p>
          <p className="text-sm text-red-800 mt-1">{String(error)}</p>
          <button
            onClick={() => {
              setError(null);
              fetchMessages();
            }}
            className="btn-secondary text-xs mt-2"
          >
            Retry
          </button>
        </div>
      )}

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ Connect your credentials</p>
          <p className="text-sm text-yellow-800 mt-1">Real-time data will be loaded from your Twilio account</p>
        </div>
      )}

      {/* WhatsApp Sender Health */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-airbnb-red" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold text-airbnb-dark">WhatsApp Senders Health</h3>
                <a
                  href="https://www.twilio.com/docs/whatsapp/api/senders"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span>Full Documentation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-sm text-airbnb-gray">
                Observing WhatsApp sender health
                {isConnected && <span className="text-blue-600 ml-1">(Live from Senders API)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchSenders(messages)}
            disabled={!isConnected || loadingSenders}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${loadingSenders ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loadingSenders ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-airbnb-red animate-spin" />
          </div>
        ) : senders.length === 0 ? (
          <div className="text-center py-8 text-airbnb-gray">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No WhatsApp senders found. Connect credentials to load data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.isArray(senders) && senders.map((sender, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-lg p-4 bg-white ${
                  sender.qualityRating === 'HIGH'
                    ? 'border-green-500 shadow-lg shadow-green-100'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className={`w-4 h-4 ${
                        sender.qualityRating === 'HIGH' ? 'text-green-600' : 'text-airbnb-red'
                      }`} />
                      <span className="font-semibold text-airbnb-dark">{sender.name || 'Unknown'}</span>
                      {sender.qualityRating === 'HIGH' && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                          ✓ High Quality
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-airbnb-gray">{sender.phoneNumber || 'Unknown'}</p>
                    <p className="text-xs text-airbnb-gray mt-1">SID: {sender.sid || 'Unknown'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className={`rounded-lg p-3 border-2 ${
                    sender.qualityRating === 'HIGH'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`text-xs font-medium mb-1 ${
                      sender.qualityRating === 'HIGH' ? 'text-green-700' : 'text-airbnb-gray'
                    }`}>Quality Rating</div>
                    <div className={`text-xl font-bold ${
                      sender.qualityRating === 'HIGH' ? 'text-green-700' : 'text-airbnb-dark'
                    }`}>
                      {sender.qualityRating || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-airbnb-gray mb-1">Messaging Limit</div>
                    <div className="text-xl font-bold text-airbnb-dark">{sender.messagingLimit || 'N/A'}</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-airbnb-gray">Status</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      sender.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sender.status || 'unknown'}
                    </span>
                  </div>
                  {sender.wabaId && (
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-airbnb-gray">WABA ID</span>
                      <span className="text-xs font-mono font-semibold text-airbnb-dark">{sender.wabaId}</span>
                    </div>
                  )}
                  {sender.dateCreated && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-airbnb-gray">Active Since</span>
                      <span className="text-xs font-semibold text-airbnb-dark">
                        {(() => {
                          try {
                            return new Date(sender.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          } catch {
                            return 'Unknown';
                          }
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                {Array.isArray(sender.offlineReasons) && sender.offlineReasons.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-2">
                    <div className="text-xs font-semibold text-red-900 mb-1">Offline Reasons:</div>
                    <ul className="list-disc list-inside text-xs text-red-800 space-y-0.5">
                      {sender.offlineReasons.map((reason, idx) => (
                        <li key={idx}>
                          {typeof reason === 'string'
                            ? reason
                            : reason?.message || reason?.code || JSON.stringify(reason)
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Error Code Reference */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <div>
            <h3 className="text-2xl font-bold text-airbnb-dark">WhatsApp Messaging Platform Health</h3>
            <p className="text-sm text-airbnb-gray">
              Twilio WhatsApp Error Code Reference
              <a
                href="https://www.twilio.com/docs/whatsapp/api/error-code-mapping"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline ml-2 inline-flex items-center gap-1"
              >
                View Full Documentation
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </p>
          </div>
        </div>

        {/* Channel Fallback Toggle */}
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-airbnb-dark mb-1">Twilio Channel Fallback</div>
              <div className="text-xs text-gray-600">
                When enabled, Twilio natively handles WhatsApp→SMS switching for 63003, 63016, 63024, 63032
              </div>
            </div>
            <button
              onClick={() => setChannelFallbackEnabled(!channelFallbackEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                channelFallbackEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  channelFallbackEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="mt-2 text-xs font-semibold">
            {channelFallbackEnabled ? (
              <span className="text-green-700">✓ ON — Errors become OBSERVE class</span>
            ) : (
              <span className="text-gray-600">✗ OFF — Manual routing required</span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-3">
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-airbnb-red focus:border-transparent"
            placeholder="Search by code, description, or action..."
            value={errorSearchQuery}
            onChange={(e) => setErrorSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setErrorFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              errorFilter === 'all'
                ? 'bg-airbnb-dark text-white border-airbnb-dark'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setErrorFilter('transient')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              errorFilter === 'transient'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Transient — retry
          </button>
          <button
            onClick={() => setErrorFilter('structural')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              errorFilter === 'structural'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Structural — channel switch
          </button>
          <button
            onClick={() => setErrorFilter('compliance')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              errorFilter === 'compliance'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Compliance — halt
          </button>
          <button
            onClick={() => setErrorFilter('internal')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              errorFilter === 'internal'
                ? 'bg-gray-500 text-white border-gray-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Internal — Twilio
          </button>
          {channelFallbackEnabled && (
            <button
              onClick={() => setErrorFilter('observe')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                errorFilter === 'observe'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Observe — Twilio handles
            </button>
          )}
        </div>

        {/* Error Code Panels */}
        <div className="space-y-3">
          {Object.entries(errorCodeData).map(([panelKey, errors]) => {
            const filteredErrors = filterErrorCodes(errors);
            const visibleCount = filteredErrors.length;
            const totalCount = errors.length;
            const isCollapsed = collapsedPanels[panelKey];

            return (
              <div key={panelKey} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Panel Header */}
                <div
                  className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => togglePanel(panelKey)}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-airbnb-dark">
                    {panelTitles[panelKey]}
                  </h4>
                  <span className="text-xs text-gray-500 font-medium">
                    {visibleCount} of {totalCount}
                  </span>
                </div>

                {/* Panel Content */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Twilio Code
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Meta WA Code
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Description & Action
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            Class
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredErrors.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-6 text-center text-sm text-gray-500">
                              No matching error codes found
                            </td>
                          </tr>
                        ) : (
                          filteredErrors.map((error, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-2 px-3 font-mono text-sm font-semibold text-airbnb-dark align-top">
                                {error.code}
                              </td>
                              <td className="py-2 px-3 font-mono text-xs text-gray-500 align-top">
                                {error.metaCode}
                              </td>
                              <td className="py-2 px-3 align-top">
                                <div className="text-sm text-airbnb-dark mb-1">
                                  {error.description}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {error.action}
                                </div>
                              </td>
                              <td className="py-2 px-3 align-top">
                                <span
                                  className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    error.class === 'transient'
                                      ? 'bg-amber-100 text-amber-800'
                                      : error.class === 'structural'
                                      ? 'bg-blue-100 text-blue-800'
                                      : error.class === 'compliance'
                                      ? 'bg-red-100 text-red-800'
                                      : error.class === 'observe'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {error.class.charAt(0).toUpperCase() + error.class.slice(1)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Self-Healing Event Stream */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-8 h-8 text-airbnb-red" />
          <div>
            <h3 className="text-2xl font-bold text-airbnb-dark">Simulation</h3>
            <p className="text-sm text-airbnb-gray">Inject Errors and watch automated decision-making in realtime</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Fault Injector */}
          <div className="space-y-4">
            <div className="card bg-gray-50 border-2 border-gray-200">
              <h4 className="font-semibold text-airbnb-dark mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Inject Fault Signal
              </h4>

              {/* Channel Fallback Toggle */}
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-airbnb-dark mb-1">Channel Fallback</div>
                    <div className="text-xs text-gray-600">
                      When ON, Twilio natively handles WhatsApp→SMS switching
                    </div>
                  </div>
                  <button
                    onClick={() => setChannelFallbackEnabled(!channelFallbackEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      channelFallbackEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        channelFallbackEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-2 text-xs font-semibold">
                  {channelFallbackEnabled ? (
                    <span className="text-green-700">✓ ON</span>
                  ) : (
                    <span className="text-gray-600">✗ OFF</span>
                  )}
                </div>
              </div>

              {/* SESSION ERRORS */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Session Errors</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => injectFault('63016')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63016 · Outside 24h window</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        channelFallbackEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {channelFallbackEnabled ? 'OBSERVE' : 'STRUCTURAL'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {channelFallbackEnabled
                        ? 'Twilio handles → SMS delivered. Logs frequency.'
                        : 'Switch to approved Content Template; keep in WhatsApp channel'}
                    </p>
                  </button>

                  <button
                    onClick={() => injectFault('63024')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63024 · No WhatsApp account</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        channelFallbackEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {channelFallbackEnabled ? 'OBSERVE' : 'STRUCTURAL'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {channelFallbackEnabled
                        ? 'Twilio handles → SMS delivered. Spikes = data quality alert.'
                        : 'Immediately fall back to SMS; preserve MessageSid for dedup'}
                    </p>
                  </button>

                  <button
                    onClick={() => injectFault('63003')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63003 · Invalid destination</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        channelFallbackEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {channelFallbackEnabled ? 'OBSERVE' : 'STRUCTURAL'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {channelFallbackEnabled
                        ? 'Twilio handles → SMS delivered. Do not trigger custom routing.'
                        : 'Fail fast; do not retry; check number validity via Lookup API'}
                    </p>
                  </button>

                  <button
                    onClick={() => injectFault('63032')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63032 · Policy violation</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        channelFallbackEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {channelFallbackEnabled ? 'OBSERVE' : 'COMPLIANCE'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {channelFallbackEnabled
                        ? 'Twilio delivers via SMS BUT flags user; alerts ops team.'
                        : 'Halt all retries; suppress sender; alert ops team'}
                    </p>
                  </button>
                </div>
              </div>

              {/* RATE LIMITS */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Rate Limits</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => injectFault('63018')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63018 · Rate limit hit</span>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
                        TRANSIENT
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Exponential backoff, requeue same channel.
                    </p>
                  </button>

                  <button
                    onClick={() => injectFault('20429')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">20429 · API rate limit</span>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
                        TRANSIENT
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Backoff and requeue. No channel switch.
                    </p>
                  </button>
                </div>
              </div>

              {/* TEMPLATE ERRORS */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Template Errors</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => injectFault('63022')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63022 · Template variable mismatch</span>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-100 text-blue-800">
                        STRUCTURAL
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Fix parameter mapping, resubmit via Content Template API.
                    </p>
                  </button>

                  <button
                    onClick={() => injectFault('63013')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">63013 · Template policy violation</span>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-red-100 text-red-800">
                        COMPLIANCE
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Halt. Review template against Meta guidelines.
                    </p>
                  </button>
                </div>
              </div>

              {/* INFRASTRUCTURE */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Infrastructure</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => injectFault('11200')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-airbnb-red hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">11200 · Webhook HTTP failure</span>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
                        TRANSIENT
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Retry via fallback URL. Event Streams guarantees delivery.
                    </p>
                  </button>
                </div>
              </div>

              {/* HAPPY PATH */}
              <div>
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Happy Path</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => injectFault('delivered')}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-airbnb-dark">Delivered + read</span>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-800">
                        SUCCESS
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      WhatsApp confirmed delivery and read receipt.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Live Event Log */}
          <div className="space-y-4">
            <div className="card bg-gray-50 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-airbnb-dark flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-green-600" />
                  Event Stream
                  <span className="flex items-center gap-1 ml-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-green-600 font-medium">live</span>
                  </span>
                </h4>
                <button
                  onClick={clearHealingLogs}
                  className="text-xs text-gray-600 hover:text-airbnb-red font-semibold"
                >
                  Clear
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium mb-1">Attempted</div>
                  <div className="text-2xl font-bold text-airbnb-dark">{healingMetrics.attempted}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-xs text-green-700 font-medium mb-1">
                    {channelFallbackEnabled ? 'Twilio-handled' : 'Auto-healed'}
                  </div>
                  <div className="text-2xl font-bold text-green-700">{healingMetrics.autoHealed}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="text-xs text-red-700 font-medium mb-1">Requires Attention</div>
                  <div className="text-2xl font-bold text-red-700">{healingMetrics.requiresAttention}</div>
                </div>
              </div>

              {/* Event Log */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 h-[500px] overflow-y-auto space-y-2">
                {healingLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Terminal className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No events yet. Click a fault button to inject.</p>
                  </div>
                ) : (
                  healingLogs.map((log, idx) => (
                    <div key={idx} className={`p-3 rounded ${log.bg}`}>
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-mono text-xs text-blue-600 font-semibold">{log.messageSid}</span>
                        <span className="text-xs text-gray-500">{log.timestamp}</span>
                      </div>
                      {log.errorCode && (
                        <div className="text-xs font-semibold text-gray-700 mb-1">
                          Error {log.errorCode}
                        </div>
                      )}
                      <div className="text-xs text-gray-700">{log.action}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Stream */}
      <div className="card bg-gray-900 text-gray-100">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-green-400" />
          Event Stream - Live Webhook Payloads
          {isConnected && <span className="text-xs text-green-400 ml-2">(From your account)</span>}
        </h3>
        <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs space-y-3">
          {Array.isArray(events) && events.map((event, idx) => (
            <div key={idx} className="border-b border-gray-800 pb-2">
              <div className="text-gray-500">[{(() => {
                try {
                  return event?.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'N/A';
                } catch {
                  return 'N/A';
                }
              })()}]</div>
              <div className="text-green-400">
                MessageSid: <span className="text-blue-400">{event?.messageSid || 'unknown'}</span>
              </div>
              <div className="text-green-400">
                Status: <span className={getStatusColor(event?.status)}>
                  {event?.status || 'unknown'}
                </span>
              </div>
              <div className="text-green-400">
                Direction: <span className="text-yellow-400">{event?.direction || 'outbound-api'}</span>
              </div>
              <div className="text-green-400">
                From: <span className="text-cyan-400">{event?.from || 'unknown'}</span>
              </div>
              <div className="text-green-400">
                To: <span className="text-purple-400">{event?.to || 'unknown'}</span>
              </div>
              {event?.errorCode && (
                <div className="text-red-400">
                  ErrorCode: {event.errorCode} ({(() => {
                    const allErrors = Object.values(errorCodeData).flat();
                    const errorInfo = allErrors.find(e => e.code === String(event.errorCode));
                    return errorInfo?.description || 'Unknown error';
                  })()})
                </div>
              )}
            </div>
          ))}
          {(!Array.isArray(events) || events.length === 0) && (
            <div className="text-gray-500 text-center py-8">
              {isConnected ? 'Loading events from your account...' : 'Waiting for incoming events...'}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {isConnected
            ? 'Real-time webhook events from your Twilio account. Shows last 15 messages.'
            : 'Connect credentials to see real webhook events from your account.'}
        </p>
      </div>
    </div>
  );
};

export default GlobalHealth;

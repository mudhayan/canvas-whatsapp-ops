import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

const CredentialsSetup = ({ credentials, setCredentials, isConnected, setIsConnected }) => {
  const [localCreds, setLocalCreds] = useState(credentials);
  const [error, setError] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [settingApiKey, setSettingApiKey] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

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
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
    setError('');

    if (!localCreds.accountSid || !localCreds.authToken) {
      setError('Both Account SID and Auth Token are required');
      return;
    }

    if (!localCreds.accountSid.startsWith('AC')) {
      setError('Invalid Account SID format. It should start with "AC" (e.g., ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)');
      return;
    }

    if (localCreds.accountSid.length !== 34) {
      setError('Invalid Account SID length. It should be 34 characters long (AC + 32 characters)');
      return;
    }

    if (localCreds.authToken.length !== 32) {
      setError('Invalid Auth Token length. It should be 32 characters long');
      return;
    }

    setCredentials(localCreds);
    setIsConnected(true);
  };

  const handleSetOpenAIKey = async () => {
    if (!openaiApiKey) {
      setError('OpenAI API key is required');
      return;
    }

    setSettingApiKey(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/set-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: openaiApiKey
        })
      });

      if (response.ok) {
        setApiKeySet(true);
        setOpenaiApiKey(''); // Clear the input for security
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to set API key');
      }
    } catch (error) {
      setError('Failed to connect to backend server');
    } finally {
      setSettingApiKey(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Key className="w-8 h-8 text-airbnb-red" />
        <div>
          <h2 className="text-2xl font-bold text-airbnb-dark">Credentials Setup</h2>
          <p className="text-airbnb-gray">Configure your Twilio API credentials</p>
        </div>
      </div>

      <div className="card">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-semibold">Notice</p>
              <p className="text-sm text-blue-800 mt-1">
                Credentials used for live Content API and Messaging API calls. All requests are authenticated via Basic Auth.
              </p>
            </div>
          </div>
        </div>

        {isConnected && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Connected</p>
                <p className="text-sm text-green-700">Account SID: {credentials.accountSid}</p>
              </div>
            </div>
            <span className="badge-success">Active</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-airbnb-dark mb-2">
              Account SID
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={localCreds.accountSid}
              onChange={(e) => {
                setError('');
                setLocalCreds({ ...localCreds, accountSid: e.target.value });
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-airbnb-dark mb-2">
              Auth Token
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Enter your Auth Token (32 characters)"
              value={localCreds.authToken}
              onChange={(e) => {
                setError('');
                setLocalCreds({ ...localCreds, authToken: e.target.value });
              }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Connection Error</p>
                  <p className="text-sm text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={!localCreds.accountSid || !localCreds.authToken}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnected ? 'Update Credentials' : 'Connect to Twilio'}
          </button>
        </div>
      </div>

      {/* OpenAI API Key Section */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-airbnb-dark">AI Review Credentials</h3>
        </div>

        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-6 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-purple-900 font-semibold">OpenAI API Key for AI Reviews</p>
              <p className="text-sm text-purple-800 mt-1">
                Used for AI-powered template and campaign compliance checking. Get your key at{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>
          </div>
        </div>

        {!backendConnected && (
          <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Backend Not Connected</p>
                <p className="text-sm text-yellow-700">
                  Start the backend server: <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono">npm run server</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {backendConnected && apiKeySet && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">OpenAI API Key Configured</p>
                <p className="text-sm text-green-700">AI reviews are enabled</p>
              </div>
            </div>
            <button
              onClick={() => {
                setApiKeySet(false);
              }}
              className="text-sm text-purple-600 hover:text-purple-800 underline"
            >
              Change Key
            </button>
          </div>
        )}

        {backendConnected && !apiKeySet && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => {
                  setError('');
                  setOpenaiApiKey(e.target.value);
                }}
              />
              <p className="text-xs text-airbnb-gray mt-1">
                🔒 Stored securely on the backend server (not in browser)
              </p>
            </div>

            <button
              onClick={handleSetOpenAIKey}
              disabled={!openaiApiKey || settingApiKey}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              {settingApiKey ? (
                <>Setting API Key...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Set OpenAI API Key
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CredentialsSetup;

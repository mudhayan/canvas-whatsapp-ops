import React, { useState } from 'react';
import { Copy, Check, Code2, Terminal } from 'lucide-react';

const ApiCallDisplay = ({ method, url, headers, body, title = "Backend API Call to Twilio" }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('curl'); // 'curl' or 'json'

  const generateCurlCommand = () => {
    let curl = `curl -X ${method} '${url}'`;

    // Add headers
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        curl += ` \\\n  -H '${key}: ${value}'`;
      });
    }

    // Add body
    if (body && method !== 'GET') {
      if (headers?.['Content-Type']?.includes('application/json')) {
        curl += ` \\\n  -d '${JSON.stringify(body)}'`;
      } else if (headers?.['Content-Type']?.includes('application/x-www-form-urlencoded')) {
        const formParams = Object.entries(body)
          .map(([key, value]) => `${key}=${encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}`)
          .join('&');
        curl += ` \\\n  -d '${formParams}'`;
      }
    }

    return curl;
  };

  const handleCopy = () => {
    const content = viewMode === 'curl'
      ? generateCurlCommand()
      : `${method} ${url}\n\nHeaders:\n${JSON.stringify(headers, null, 2)}\n\nBody:\n${JSON.stringify(body, null, 2)}`;

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden">
      <div className="bg-airbnb-dark text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          <span className="font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle View Mode */}
          <div className="flex bg-gray-700 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('curl')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'curl' ? 'bg-airbnb-red text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Terminal className="w-3 h-3 inline mr-1" />
              cURL
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'json' ? 'bg-airbnb-red text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Code2 className="w-3 h-3 inline mr-1" />
              JSON
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-[#1e1e1e] text-gray-100 p-4 font-mono text-sm overflow-x-auto">
        {viewMode === 'json' ? (
          // JSON View
          <>
            <div className="mb-4">
              <span className="text-purple-400 font-bold">{method}</span>
              <span className="text-blue-300 ml-2">{url}</span>
            </div>

            {headers && Object.keys(headers).length > 0 && (
              <div className="mb-4">
                <div className="text-yellow-300 font-semibold mb-2">Headers:</div>
                <div className="pl-4 border-l-2 border-gray-700">
                  {Object.entries(headers).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="text-green-400">{key}</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-orange-300">"{value}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {body && (
              <div>
                <div className="text-yellow-300 font-semibold mb-2">Body:</div>
                <div className="pl-4 border-l-2 border-gray-700">
                  <pre className="text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(body, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </>
        ) : (
          // cURL View
          <div className="whitespace-pre-wrap text-green-400">
            {generateCurlCommand()}
          </div>
        )}
      </div>

      {viewMode === 'curl' && (
        <div className="bg-blue-50 border-t-2 border-blue-200 px-4 py-2 text-xs text-blue-800">
          <strong>💡 Tip:</strong> Copy this cURL command and run it in your terminal to test the API call directly.
        </div>
      )}
    </div>
  );
};

export default ApiCallDisplay;

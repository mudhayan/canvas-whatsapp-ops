import React, { useState } from 'react';
import { Key, Palette, FileText, Send, Activity, Database, Phone } from 'lucide-react';
import CredentialsSetup from './components/CredentialsSetup';
import TemplateDesigner from './components/TemplateDesigner';
import TemplateLibrary from './components/TemplateLibrary';
import CampaignOrchestrator from './components/CampaignOrchestrator';
import GlobalHealth from './components/GlobalHealth';
import WhatsAppSendersAPI from './components/WhatsAppSendersAPI';
import ContentTemplateAPI from './components/ContentTemplateAPI';
import CampaignRegistration from './components/CampaignRegistration';

function App() {
  const [activeTab, setActiveTab] = useState('credentials');
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: ''
  });
  const [isConnected, setIsConnected] = useState(false);

  const tabs = [
    { id: 'credentials', name: 'Credentials Setup', icon: Key },
    { id: 'designer', name: 'Template Designer', icon: Palette },
    { id: 'library', name: 'Template Library', icon: FileText },
    { id: 'campaign', name: '10DLC Campaign Registration', icon: Phone },
    { id: 'demo', name: 'Demo - Send Message', icon: Send },
    { id: 'health', name: 'Global Health & Observability', icon: Activity },
    { id: 'senders', name: 'Senders API CRUD', icon: Database },
    { id: 'content', name: 'Content Template API CRUD', icon: FileText }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'credentials':
        return (
          <CredentialsSetup
            credentials={credentials}
            setCredentials={setCredentials}
            isConnected={isConnected}
            setIsConnected={setIsConnected}
          />
        );
      case 'designer':
        return <TemplateDesigner credentials={credentials} isConnected={isConnected} />;
      case 'library':
        return <TemplateLibrary credentials={credentials} isConnected={isConnected} />;
      case 'campaign':
        return <CampaignRegistration credentials={credentials} isConnected={isConnected} />;
      case 'demo':
        return <CampaignOrchestrator credentials={credentials} isConnected={isConnected} />;
      case 'health':
        return <GlobalHealth credentials={credentials} isConnected={isConnected} />;
      case 'senders':
        return <WhatsAppSendersAPI credentials={credentials} isConnected={isConnected} />;
      case 'content':
        return <ContentTemplateAPI credentials={credentials} isConnected={isConnected} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-airbnb-red rounded-xl flex items-center justify-center">
              <Send className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-airbnb-dark">Content API Demo Tool</h1>
            </div>
          </div>
          <div className="mt-4 px-3 py-2 bg-gray-100 rounded-lg">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Demo Tool - not for production use</p>
            <p className="text-xs text-gray-500 mt-1">Powered by Twilio</p>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-airbnb-red text-white shadow-md'
                        : 'text-airbnb-gray hover:bg-gray-100 hover:text-airbnb-dark'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={tab.id === 'senders' || tab.id === 'content' ? 'italic' : ''}>
                      {tab.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          {isConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-green-800">API Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span className="text-sm font-semibold text-gray-600">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {!isConnected && activeTab !== 'credentials' && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm font-semibold text-yellow-900">⚠️ Credentials Required</p>
              <p className="text-sm text-yellow-800 mt-1">
                Please configure your Twilio credentials in the{' '}
                <button
                  onClick={() => setActiveTab('credentials')}
                  className="underline font-semibold hover:text-yellow-900"
                >
                  Credentials Setup
                </button>{' '}
                tab to use this feature.
              </p>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;

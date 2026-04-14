import React from 'react';
import { Wifi, Signal, Battery } from 'lucide-react';

const IPhoneMockup = ({ message, buttons = [], mediaType = null, mediaUrl = null }) => {
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="relative mx-auto" style={{ width: '320px' }}>
      {/* iPhone Frame */}
      <div className="bg-black rounded-[3rem] p-3 shadow-2xl">
        {/* iPhone Screen */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden">
          {/* Status Bar */}
          <div className="bg-gradient-to-b from-[#075E54] to-[#128C7E] px-6 py-3 flex items-center justify-between">
            <span className="text-white text-xs font-semibold">{currentTime}</span>
            <div className="flex items-center gap-1">
              <Signal className="w-3 h-3 text-white" />
              <Wifi className="w-3 h-3 text-white" />
              <Battery className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* WhatsApp Header */}
          <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
            <button className="text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg">
              🏠
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Airbnb</div>
              <div className="text-white text-xs opacity-80">Tap for info</div>
            </div>
            <button className="text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          {/* Chat Area */}
          <div className="h-96 bg-[#ECE5DD] p-4 overflow-y-auto" style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h100v100H0z\" fill=\"%23ece5dd\"/%3E%3Cpath d=\"M20 20h60v60H20z\" fill=\"%23ffffff\" opacity=\".02\"/%3E%3C/svg%3E')"
          }}>
            <div className="flex justify-start mb-4">
              {/* Incoming Message Bubble */}
              <div className="max-w-[85%]">
                <div className="bg-white rounded-lg rounded-tl-none shadow-sm p-3">
                  {/* Media Preview */}
                  {mediaType && mediaUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      {mediaType === 'image' && (
                        <img src={mediaUrl} alt="Media" className="w-full h-32 object-cover" />
                      )}
                      {mediaType === 'video' && (
                        <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                          </svg>
                        </div>
                      )}
                      {mediaType === 'document' && (
                        <div className="w-full bg-gray-100 p-3 flex items-center gap-3">
                          <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 truncate">Document.pdf</div>
                            <div className="text-xs text-gray-500">PDF • 2.4 MB</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Text */}
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{message}</p>

                  {/* Timestamp */}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-gray-500">{currentTime}</span>
                  </div>
                </div>

                {/* Buttons */}
                {buttons.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {buttons.map((button, idx) => (
                      <button
                        key={idx}
                        className={`w-full text-sm font-medium rounded-lg py-2.5 px-4 transition-all ${
                          button.type === 'cta' || button.type === 'url'
                            ? 'bg-[#25D366] text-white hover:bg-[#20BD5A] shadow-sm'
                            : 'bg-white text-[#128C7E] border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {button.type === 'cta' || button.type === 'url' ? '🔗 ' : ''}
                        {button.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input Bar */}
          <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
            <button className="text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400">
              Message
            </div>
            <button className="text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>

        {/* iPhone Notch */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl"></div>
      </div>

      {/* Device Label */}
      <div className="text-center mt-3">
        <span className="text-xs text-gray-500 font-medium">iPhone 14 Pro Preview</span>
      </div>
    </div>
  );
};

export default IPhoneMockup;

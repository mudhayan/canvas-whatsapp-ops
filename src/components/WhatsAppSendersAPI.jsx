import React, { useState, useEffect } from 'react';
import { Phone, Search, Edit, Trash2, RefreshCw, Loader2, CheckCircle, XCircle, Database } from 'lucide-react';
import ApiCallDisplay from './ApiCallDisplay';

const WhatsAppSendersAPI = ({ credentials, isConnected }) => {
  const [senders, setSenders] = useState([]);
  const [selectedSender, setSelectedSender] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // API Responses
  const [listResponse, setListResponse] = useState(null);
  const [retrieveResponse, setRetrieveResponse] = useState(null);
  const [updateResponse, setUpdateResponse] = useState(null);
  const [deleteResponse, setDeleteResponse] = useState(null);

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    profileName: '',
    profileAbout: '',
    profileAddress: '',
    profileDescription: '',
    profileEmail: '',
    profileVertical: '',
    profileWebsites: ''
  });

  // List all WhatsApp senders
  const listSenders = async () => {
    if (!isConnected || !credentials.accountSid || !credentials.authToken) return;

    setLoading(true);
    setListResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch(
        `https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=20`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      const data = await response.json();
      setListResponse(data);

      if (response.ok) {
        setSenders(data.senders || []);
      }
    } catch (error) {
      console.error('Error listing senders:', error);
      setListResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Retrieve a specific sender
  const retrieveSender = async (senderSid) => {
    if (!isConnected || !credentials.accountSid || !credentials.authToken) return;

    setRetrieving(true);
    setRetrieveResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch(
        `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      const data = await response.json();
      setRetrieveResponse(data);

      if (response.ok) {
        setSelectedSender(data);
        // Populate update form with current values
        setUpdateForm({
          profileName: data.profile?.name || '',
          profileAbout: data.profile?.about || '',
          profileAddress: data.profile?.address || '',
          profileDescription: data.profile?.description || '',
          profileEmail: data.profile?.email || '',
          profileVertical: data.profile?.vertical || '',
          profileWebsites: data.profile?.websites?.join(', ') || ''
        });
      }
    } catch (error) {
      console.error('Error retrieving sender:', error);
      setRetrieveResponse({ error: error.message });
    } finally {
      setRetrieving(false);
    }
  };

  // Update a sender
  const updateSender = async () => {
    if (!selectedSender || !isConnected) return;

    setUpdating(true);
    setUpdateResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      // Build update payload
      const payload = {
        profile: {}
      };

      if (updateForm.profileName) payload.profile.name = updateForm.profileName;
      if (updateForm.profileAbout) payload.profile.about = updateForm.profileAbout;
      if (updateForm.profileAddress) payload.profile.address = updateForm.profileAddress;
      if (updateForm.profileDescription) payload.profile.description = updateForm.profileDescription;
      if (updateForm.profileEmail) payload.profile.email = updateForm.profileEmail;
      if (updateForm.profileVertical) payload.profile.vertical = updateForm.profileVertical;
      if (updateForm.profileWebsites) {
        payload.profile.websites = updateForm.profileWebsites.split(',').map(w => w.trim()).filter(w => w);
      }

      const response = await fetch(
        `https://messaging.twilio.com/v2/Channels/Senders/${selectedSender.sid}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      setUpdateResponse(data);

      if (response.ok) {
        // Refresh the sender details
        await retrieveSender(selectedSender.sid);
        // Refresh the list
        await listSenders();
      }
    } catch (error) {
      console.error('Error updating sender:', error);
      setUpdateResponse({ error: error.message });
    } finally {
      setUpdating(false);
    }
  };

  // Delete a sender
  const deleteSender = async () => {
    if (!selectedSender || !isConnected) return;

    if (!window.confirm(`Are you sure you want to delete sender ${selectedSender.sender_id}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setDeleteResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch(
        `https://messaging.twilio.com/v2/Channels/Senders/${selectedSender.sid}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (response.status === 204) {
        // Successful deletion (no content returned)
        setDeleteResponse({ success: true, message: 'Sender deleted successfully' });
        setSelectedSender(null);
        setRetrieveResponse(null);
        // Refresh the list
        await listSenders();
      } else {
        const data = await response.json();
        setDeleteResponse(data);
      }
    } catch (error) {
      console.error('Error deleting sender:', error);
      setDeleteResponse({ error: error.message });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      listSenders();
    }
  }, [isConnected, credentials]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-airbnb-red" />
        <div>
          <h2 className="text-2xl font-bold text-airbnb-dark">WhatsApp Senders API</h2>
          <p className="text-airbnb-gray">Complete CRUD operations for WhatsApp Senders v2</p>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ Connect your credentials first</p>
          <p className="text-sm text-yellow-800 mt-1">API calls require valid Twilio credentials</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - List Senders */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-airbnb-dark flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                List All WhatsApp Senders
              </h3>
              <button
                onClick={listSenders}
                disabled={!isConnected || loading}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-airbnb-red animate-spin" />
              </div>
            ) : senders.length === 0 ? (
              <div className="text-center py-8 text-airbnb-gray">
                No WhatsApp senders found. Connect credentials to load data.
              </div>
            ) : (
              <div className="space-y-2">
                {senders.map((sender, idx) => (
                  <div
                    key={idx}
                    onClick={() => retrieveSender(sender.sid)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedSender?.sid === sender.sid
                        ? 'border-airbnb-red bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-airbnb-dark flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {sender.profile?.name || sender.sender_id}
                        </div>
                        <p className="text-sm font-mono text-airbnb-gray mt-1">{sender.sender_id}</p>
                        <p className="text-xs text-airbnb-gray mt-1">SID: {sender.sid}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            sender.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {sender.status}
                          </span>
                          {sender.waba_id && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                              WABA: {sender.waba_id}
                            </span>
                          )}
                        </div>
                      </div>
                      <Search className="w-4 h-4 text-airbnb-gray" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {listResponse && (
            <div className="card bg-gray-50">
              <h4 className="font-semibold text-airbnb-dark mb-3">List Senders API Response</h4>
              <ApiCallDisplay
                method="GET"
                url="https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=20"
                headers={{
                  'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                }}
                body={null}
                title="GET - List All Senders"
              />
              <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto mt-4">
                <div className="text-yellow-300 mb-2">Response:</div>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(listResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Retrieve/Update/Delete Sender */}
        <div className="space-y-6">
          {!selectedSender ? (
            <div className="card bg-gray-50">
              <div className="text-center py-12 text-airbnb-gray">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a sender from the list to retrieve, update, or delete</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-airbnb-dark flex items-center gap-2">
                    <Search className="w-5 h-5 text-green-600" />
                    Retrieve Sender Details
                  </h3>
                  {retrieving && <Loader2 className="w-4 h-4 animate-spin text-airbnb-red" />}
                </div>

                {selectedSender && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-airbnb-gray mb-1">Sender ID</div>
                      <div className="font-mono text-sm font-semibold text-airbnb-dark">{selectedSender.sender_id}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-airbnb-gray mb-1">Sender SID</div>
                      <div className="font-mono text-sm font-semibold text-airbnb-dark">{selectedSender.sid}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-airbnb-gray mb-1">Status</div>
                      <span className={`text-sm px-2 py-1 rounded ${
                        selectedSender.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedSender.status}
                      </span>
                    </div>
                    {selectedSender.waba_id && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-airbnb-gray mb-1">WhatsApp Business Account ID</div>
                        <div className="font-mono text-sm font-semibold text-airbnb-dark">{selectedSender.waba_id}</div>
                      </div>
                    )}
                    {selectedSender.profile && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3">
                        <div className="text-sm font-semibold text-blue-900 mb-2">Profile Information</div>
                        <div className="space-y-2 text-sm">
                          {selectedSender.profile.name && (
                            <div>
                              <span className="text-blue-700 font-semibold">Name:</span>
                              <span className="text-blue-800 ml-2">{selectedSender.profile.name}</span>
                            </div>
                          )}
                          {selectedSender.profile.about && (
                            <div>
                              <span className="text-blue-700 font-semibold">About:</span>
                              <span className="text-blue-800 ml-2">{selectedSender.profile.about}</span>
                            </div>
                          )}
                          {selectedSender.profile.email && (
                            <div>
                              <span className="text-blue-700 font-semibold">Email:</span>
                              <span className="text-blue-800 ml-2">{selectedSender.profile.email}</span>
                            </div>
                          )}
                          {selectedSender.profile.vertical && (
                            <div>
                              <span className="text-blue-700 font-semibold">Vertical:</span>
                              <span className="text-blue-800 ml-2">{selectedSender.profile.vertical}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedSender.offline_reasons && selectedSender.offline_reasons.length > 0 && (
                      <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-3">
                        <div className="text-sm font-semibold text-red-900 mb-2">Offline Reasons</div>
                        <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                          {selectedSender.offline_reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {retrieveResponse && (
                <div className="card bg-gray-50">
                  <h4 className="font-semibold text-airbnb-dark mb-3">Retrieve Sender API Response</h4>
                  <ApiCallDisplay
                    method="GET"
                    url={`https://messaging.twilio.com/v2/Channels/Senders/${selectedSender.sid}`}
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                    }}
                    body={null}
                    title="GET - Retrieve Single Sender"
                  />
                  <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto mt-4">
                    <div className="text-yellow-300 mb-2">Response:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(retrieveResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="font-semibold text-airbnb-dark mb-4 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-orange-600" />
                  Update Sender Profile
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Profile Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Business Name"
                      value={updateForm.profileName}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">About</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      placeholder="About your business"
                      value={updateForm.profileAbout}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileAbout: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Address</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Business Address"
                      value={updateForm.profileAddress}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Description</label>
                    <textarea
                      className="input-field"
                      rows="2"
                      placeholder="Business Description"
                      value={updateForm.profileDescription}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileDescription: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="contact@business.com"
                      value={updateForm.profileEmail}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Vertical</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g., Hospitality, E-commerce"
                      value={updateForm.profileVertical}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileVertical: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-airbnb-dark mb-2">Websites (comma-separated)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="https://example.com, https://example2.com"
                      value={updateForm.profileWebsites}
                      onChange={(e) => setUpdateForm({ ...updateForm, profileWebsites: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={updateSender}
                    disabled={!isConnected || updating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="w-5 h-5" />
                        Update Sender Profile
                      </>
                    )}
                  </button>
                </div>
              </div>

              {updateResponse && (
                <div className={`card ${updateResponse.error ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {updateResponse.error ? (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-800">Update Failed</h4>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-800">Sender Updated Successfully</h4>
                      </>
                    )}
                  </div>
                  <ApiCallDisplay
                    method="POST"
                    url={`https://messaging.twilio.com/v2/Channels/Senders/${selectedSender.sid}`}
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
                      'Content-Type': 'application/json'
                    }}
                    body={{
                      profile: {
                        name: updateForm.profileName,
                        about: updateForm.profileAbout,
                        address: updateForm.profileAddress,
                        description: updateForm.profileDescription,
                        email: updateForm.profileEmail,
                        vertical: updateForm.profileVertical,
                        websites: updateForm.profileWebsites.split(',').map(w => w.trim()).filter(w => w)
                      }
                    }}
                    title="POST - Update Sender"
                  />
                  <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto mt-4">
                    <div className="text-yellow-300 mb-2">Response:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(updateResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="card bg-red-50 border-2 border-red-300">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete Sender (Danger Zone)
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete this WhatsApp sender. This action cannot be undone.
                </p>
                <button
                  onClick={deleteSender}
                  disabled={!isConnected || deleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Delete Sender
                    </>
                  )}
                </button>
              </div>

              {deleteResponse && (
                <div className={`card ${deleteResponse.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {deleteResponse.success ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-800">{deleteResponse.message}</h4>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-800">Delete Failed</h4>
                      </>
                    )}
                  </div>
                  <ApiCallDisplay
                    method="DELETE"
                    url={`https://messaging.twilio.com/v2/Channels/Senders/${selectedSender.sid}`}
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                    }}
                    body={null}
                    title="DELETE - Delete Sender"
                  />
                  <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto mt-4">
                    <div className="text-yellow-300 mb-2">Response:</div>
                    <pre className="whitespace-pre-wrap">
                      {deleteResponse.success
                        ? 'HTTP 204 No Content - Successfully deleted'
                        : JSON.stringify(deleteResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSendersAPI;

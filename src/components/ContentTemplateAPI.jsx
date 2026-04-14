import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Loader2, Plus, Trash2, Edit, AlertTriangle, ChevronDown } from 'lucide-react';
import ApiCallDisplay from './ApiCallDisplay';

const ContentTemplateAPI = ({ credentials, isConnected }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [listApiResponse, setListApiResponse] = useState(null);
  const [detailsApiResponse, setDetailsApiResponse] = useState(null);
  const [approvalApiResponse, setApprovalApiResponse] = useState(null);
  const [createApiResponse, setCreateApiResponse] = useState(null);
  const [deleteApiResponse, setDeleteApiResponse] = useState(null);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    friendly_name: '',
    language: 'en',
    body: '',
    variables: {}
  });
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  // Collapsible API response state
  const [expandedSections, setExpandedSections] = useState({
    list: false,
    create: false,
    details: false,
    approval: false,
    delete: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    if (isConnected && credentials.accountSid && credentials.authToken) {
      fetchTemplates();
    }
  }, [isConnected, credentials]);

  const fetchTemplates = async () => {
    setLoadingList(true);
    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch('https://content.twilio.com/v1/Content', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setListApiResponse(data);
        setTemplates(data.contents || []);
      } else {
        const errorData = await response.json();
        console.error('Error fetching templates:', errorData);
        setListApiResponse(errorData);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchTemplateDetails = async (contentSid) => {
    setLoadingDetails(true);
    setDetailsApiResponse(null);
    setApprovalApiResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      // Fetch template details
      const detailsResponse = await fetch(`https://content.twilio.com/v1/Content/${contentSid}`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setDetailsApiResponse(detailsData);
        setSelectedTemplate(detailsData);
      } else {
        const errorData = await detailsResponse.json();
        setDetailsApiResponse(errorData);
      }

      // Fetch approval status
      const approvalResponse = await fetch(
        `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (approvalResponse.ok) {
        const approvalData = await approvalResponse.json();
        setApprovalApiResponse(approvalData);
      } else {
        const errorData = await approvalResponse.json();
        setApprovalApiResponse(errorData);
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setCreatingTemplate(true);
    setCreateApiResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      const payload = {
        friendly_name: createFormData.friendly_name,
        language: createFormData.language,
        types: {
          'twilio/text': {
            body: createFormData.body
          }
        }
      };

      // Add variables if provided
      if (createFormData.variables && Object.keys(createFormData.variables).length > 0) {
        payload.variables = createFormData.variables;
      }

      const response = await fetch('https://content.twilio.com/v1/Content', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setCreateApiResponse(data);

      if (response.ok) {
        // Reset form and refresh list
        setCreateFormData({
          friendly_name: '',
          language: 'en',
          body: '',
          variables: {}
        });
        setShowCreateForm(false);
        fetchTemplates();
        // Auto-select the newly created template
        fetchTemplateDetails(data.sid);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setCreateApiResponse({ error: error.message });
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    setDeletingTemplate(true);
    setDeleteApiResponse(null);

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch(
        `https://content.twilio.com/v1/Content/${selectedTemplate.sid}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (response.ok) {
        setDeleteApiResponse({ success: true, message: 'Template deleted successfully' });
        setShowDeleteConfirm(false);
        setSelectedTemplate(null);
        setDetailsApiResponse(null);
        setApprovalApiResponse(null);
        fetchTemplates();
      } else {
        const errorData = await response.json();
        setDeleteApiResponse(errorData);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setDeleteApiResponse({ error: error.message });
    } finally {
      setDeletingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-airbnb-red" />
          <div>
            <h2 className="text-2xl font-bold text-airbnb-dark">Content Template API</h2>
            <p className="text-airbnb-gray">Full CRUD operations for Twilio Content Templates</p>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ Connect your credentials first</p>
          <p className="text-sm text-yellow-800 mt-1">Configure your Twilio credentials to use the Content API</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - List */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-airbnb-dark">All Content Templates</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  disabled={!isConnected}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
                <button
                  onClick={fetchTemplates}
                  disabled={!isConnected || loadingList}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-airbnb-red animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-airbnb-gray">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates found. Create your first template.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.sid}
                    onClick={() => fetchTemplateDetails(tmpl.sid)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.sid === tmpl.sid
                        ? 'border-airbnb-red bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold text-airbnb-dark text-sm">
                      {tmpl.friendly_name}
                    </div>
                    <div className="text-xs text-airbnb-gray mt-1">
                      SID: {tmpl.sid}
                    </div>
                    <div className="text-xs text-airbnb-gray">
                      Language: {tmpl.language || 'en'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List API Response */}
          {listApiResponse && (
            <div className="card bg-gray-50">
              <button
                onClick={() => toggleSection('list')}
                className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
              >
                <h4 className="font-semibold text-airbnb-dark">List Templates API Call</h4>
                <ChevronDown
                  className={`w-5 h-5 text-airbnb-dark transition-transform ${
                    expandedSections.list ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.list && (
                <>
                  <ApiCallDisplay
                    method="GET"
                    url="https://content.twilio.com/v1/Content"
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                    }}
                    body={null}
                    title="GET All Content Templates"
                  />
                  <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
                    <div className="text-yellow-300 mb-2">Response:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(listApiResponse, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Details & Actions */}
        <div className="space-y-4">
          {/* Create Form */}
          {showCreateForm && (
            <div className="card">
              <h3 className="font-semibold text-airbnb-dark mb-4">Create New Template</h3>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                    Friendly Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="my_template_name"
                    value={createFormData.friendly_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, friendly_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                    Language *
                  </label>
                  <select
                    className="input-field"
                    value={createFormData.language}
                    onChange={(e) => setCreateFormData({ ...createFormData, language: e.target.value })}
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="pt">Portuguese (pt)</option>
                    <option value="de">German (de)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-airbnb-dark mb-2">
                    Message Body *
                  </label>
                  <textarea
                    className="input-field"
                    rows="4"
                    placeholder="Hello {{1}}, your appointment is on {{2}}."
                    value={createFormData.body}
                    onChange={(e) => setCreateFormData({ ...createFormData, body: e.target.value })}
                    required
                  />
                  <p className="text-xs text-airbnb-gray mt-1">
                    Use {'{{1}}'} {'{{2}}'} syntax for variables
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creatingTemplate}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {creatingTemplate ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Template'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {createApiResponse && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => toggleSection('create')}
                    className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
                  >
                    <h4 className="font-semibold text-airbnb-dark">Create API Response</h4>
                    <ChevronDown
                      className={`w-5 h-5 text-airbnb-dark transition-transform ${
                        expandedSections.create ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSections.create && (
                    <>
                      <ApiCallDisplay
                        method="POST"
                        url="https://content.twilio.com/v1/Content"
                        headers={{
                          'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
                          'Content-Type': 'application/json'
                        }}
                        body={{
                          friendly_name: createFormData.friendly_name,
                          language: createFormData.language,
                          types: {
                            'twilio/text': {
                              body: createFormData.body
                            }
                          }
                        }}
                        title="POST Create Content Template"
                      />
                      <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
                        <div className="text-yellow-300 mb-2">Response:</div>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(createApiResponse, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Template Details */}
          {selectedTemplate && (
            <div className="card">
              <h3 className="font-semibold text-airbnb-dark mb-4">Template Details</h3>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-airbnb-red animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-airbnb-dark">Friendly Name:</span>
                    <p className="text-sm text-airbnb-gray mt-1">{selectedTemplate.friendly_name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-airbnb-dark">Content SID:</span>
                    <p className="text-sm text-airbnb-gray font-mono mt-1">{selectedTemplate.sid}</p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-airbnb-dark">Language:</span>
                    <p className="text-sm text-airbnb-gray mt-1">{selectedTemplate.language || 'en'}</p>
                  </div>
                  {selectedTemplate.types?.['twilio/text']?.body && (
                    <div>
                      <span className="text-sm font-semibold text-airbnb-dark">Message Body:</span>
                      <p className="text-sm text-airbnb-gray mt-1 bg-gray-50 p-2 rounded">
                        {selectedTemplate.types['twilio/text'].body}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold text-airbnb-dark">Created:</span>
                    <p className="text-sm text-airbnb-gray mt-1">
                      {new Date(selectedTemplate.date_created).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-airbnb-dark">Last Updated:</span>
                    <p className="text-sm text-airbnb-gray mt-1">
                      {new Date(selectedTemplate.date_updated).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Approval Status */}
          {selectedTemplate && approvalApiResponse && (
            <div className="card">
              <h3 className="font-semibold text-airbnb-dark mb-4">Approval Status</h3>
              {approvalApiResponse.whatsapp ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-semibold text-airbnb-dark">WhatsApp Status:</span>
                    <p className="text-sm text-airbnb-gray mt-1">
                      {approvalApiResponse.whatsapp.status || 'N/A'}
                    </p>
                  </div>
                  {approvalApiResponse.whatsapp.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <span className="text-sm font-semibold text-red-900">Rejection Reason:</span>
                      <p className="text-sm text-red-800 mt-1">
                        {approvalApiResponse.whatsapp.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-airbnb-gray">Not submitted for WhatsApp approval</p>
              )}
            </div>
          )}

          {/* Delete Section */}
          {selectedTemplate && (
            <div className="card border-2 border-red-200 bg-red-50">
              <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h3>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-secondary w-full text-red-600 border-red-300 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Delete Template
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-900">
                    Are you sure you want to delete this template? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteTemplate}
                      disabled={deletingTemplate}
                      className="btn-primary bg-red-600 hover:bg-red-700 flex-1 disabled:opacity-50"
                    >
                      {deletingTemplate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                          Deleting...
                        </>
                      ) : (
                        'Confirm Delete'
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {deleteApiResponse && (
                <div className="mt-4 pt-4 border-t border-red-300">
                  <button
                    onClick={() => toggleSection('delete')}
                    className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
                  >
                    <h4 className="font-semibold text-airbnb-dark">Delete API Response</h4>
                    <ChevronDown
                      className={`w-5 h-5 text-airbnb-dark transition-transform ${
                        expandedSections.delete ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSections.delete && (
                    <>
                      <ApiCallDisplay
                        method="DELETE"
                        url={`https://content.twilio.com/v1/Content/${selectedTemplate.sid}`}
                        headers={{
                          'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                        }}
                        body={null}
                        title="DELETE Content Template"
                      />
                      <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                        <div className="text-yellow-300 mb-2">Response:</div>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(deleteApiResponse, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Details API Response */}
          {detailsApiResponse && (
            <div className="card bg-gray-50">
              <button
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
              >
                <h4 className="font-semibold text-airbnb-dark">Retrieve Template API Call</h4>
                <ChevronDown
                  className={`w-5 h-5 text-airbnb-dark transition-transform ${
                    expandedSections.details ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.details && (
                <>
                  <ApiCallDisplay
                    method="GET"
                    url={`https://content.twilio.com/v1/Content/${selectedTemplate.sid}`}
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                    }}
                    body={null}
                    title="GET Single Content Template"
                  />
                  <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
                    <div className="text-yellow-300 mb-2">Response:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(detailsApiResponse, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Approval API Response */}
          {approvalApiResponse && (
            <div className="card bg-gray-50">
              <button
                onClick={() => toggleSection('approval')}
                className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
              >
                <h4 className="font-semibold text-airbnb-dark">Approval Status API Call</h4>
                <ChevronDown
                  className={`w-5 h-5 text-airbnb-dark transition-transform ${
                    expandedSections.approval ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSections.approval && (
                <>
                  <ApiCallDisplay
                    method="GET"
                    url={`https://content.twilio.com/v1/Content/${selectedTemplate.sid}/ApprovalRequests`}
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                    }}
                    body={null}
                    title="GET Template Approval Status"
                  />
                  <div className="mt-4 bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
                    <div className="text-yellow-300 mb-2">Response:</div>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(approvalApiResponse, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentTemplateAPI;

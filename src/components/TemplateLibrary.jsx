import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Pause, Ban } from 'lucide-react';
import ApiCallDisplay from './ApiCallDisplay';

const TemplateLibrary = ({ credentials, isConnected }) => {
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesApiResponse, setTemplatesApiResponse] = useState(null);
  const [approvalStatuses, setApprovalStatuses] = useState({});
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (isConnected && credentials.accountSid && credentials.authToken) {
      fetchTemplates();
    }
  }, [isConnected, credentials]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const response = await fetch('https://content.twilio.com/v1/Content', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplatesApiResponse(data);
        setTemplates(data.contents || []);

        // Fetch approval statuses for all templates
        if (data.contents && data.contents.length > 0) {
          fetchApprovalStatuses(data.contents, auth);
        }
      } else {
        const errorData = await response.json();
        console.error('Error fetching templates:', errorData);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchApprovalStatuses = async (contentList, auth) => {
    setLoadingStatuses(true);

    // Fetch all approval statuses in parallel
    const statusPromises = contentList.map(async (content) => {
      try {
        const response = await fetch(
          `https://content.twilio.com/v1/Content/${content.sid}/ApprovalRequests`,
          {
            headers: {
              'Authorization': `Basic ${auth}`
            }
          }
        );

        if (response.ok) {
          const approvalData = await response.json();
          return { sid: content.sid, data: approvalData };
        }
        return { sid: content.sid, data: null };
      } catch (error) {
        console.error(`Error fetching approval status for ${content.sid}:`, error);
        return { sid: content.sid, data: null };
      }
    });

    // Wait for all requests to complete
    const results = await Promise.all(statusPromises);

    // Build statuses object
    const statuses = {};
    results.forEach(result => {
      if (result.data) {
        statuses[result.sid] = result.data;
      }
    });

    setApprovalStatuses(statuses);
    setLoadingStatuses(false);
  };

  const submitForApproval = async (template) => {
    setSubmittingApproval({ ...submittingApproval, [template.sid]: true });

    try {
      const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);

      // Extract variables from template body
      const bodyText = template.types?.['twilio/text']?.body || '';
      const variableMatches = bodyText.match(/\{\{(\d+)\}\}/g);
      const variables = variableMatches ? variableMatches.map(v => v.match(/\d+/)[0]) : [];

      const approvalPayload = {
        name: template.friendly_name,
        category: 'MARKETING',
        content_body: bodyText
      };

      // Add example values with Airbnb fallbacks
      if (variables.length > 0) {
        approvalPayload.content_variables = {};
        const fallbackValues = {
          '1': 'Kate',
          '2': 'London Flat',
          '3': '576222958539672105?check_in=2026-08-21&check_out=2026-08-23&photo_id=2168272738&source_impression_id=p3_1775722309_P3sQRsR1z1Ufs8CD&previous_page_section_name=1000'
        };
        variables.forEach((varNum) => {
          approvalPayload.content_variables[varNum] = fallbackValues[varNum] || `Example${varNum}`;
        });
      }

      const response = await fetch(
        `https://content.twilio.com/v1/Content/${template.sid}/ApprovalRequests/whatsapp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(approvalPayload)
        }
      );

      if (response.ok) {
        // Refresh approval statuses to show updated status
        fetchApprovalStatuses(templates, auth);
        alert('Template submitted for WhatsApp approval successfully!');
      } else {
        const errorData = await response.json();
        console.error('Approval submission error:', errorData);
        alert(`Failed to submit for approval: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting for approval:', error);
      alert('Error submitting for approval. Please try again.');
    } finally {
      setSubmittingApproval({ ...submittingApproval, [template.sid]: false });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: 'badge-success', icon: CheckCircle, text: 'Approved' },
      pending: { color: 'badge-warning', icon: Clock, text: 'Pending' },
      received: { color: 'badge-warning', icon: Clock, text: 'Received (Pending)' },
      rejected: { color: 'badge-error', icon: XCircle, text: 'Rejected' },
      paused: { color: 'badge-info', icon: Pause, text: 'Paused' },
      disabled: { color: 'bg-gray-100 text-gray-700', icon: Ban, text: 'Disabled' },
      not_submitted: { color: 'bg-orange-100 text-orange-700', icon: Clock, text: 'Not Submitted' },
      unsubmitted: { color: 'bg-orange-100 text-orange-700', icon: Clock, text: 'Not Submitted' },
      unknown: { color: 'bg-gray-100 text-gray-600', icon: Clock, text: 'Unknown' }
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.unknown;
    const Icon = config.icon;

    return (
      <span className={`${config.color} inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-airbnb-red" />
          <div>
            <h2 className="text-2xl font-bold text-airbnb-dark">Template Library</h2>
            <p className="text-airbnb-gray">View all WhatsApp message templates and their approval status using Twilio's Content API</p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          disabled={!isConnected || loadingTemplates}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loadingTemplates ? 'animate-spin' : ''}`} />
          {loadingTemplates ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm font-semibold text-yellow-900">⚠️ Connect your credentials first</p>
          <p className="text-sm text-yellow-800 mt-1">Templates will be loaded from your Twilio account</p>
        </div>
      )}

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <p className="text-sm font-semibold text-blue-900">💡 Template Status Guide</p>
        <div className="text-sm text-blue-800 mt-2 space-y-1">
          <div><strong>Not Submitted:</strong> Template created but not submitted to WhatsApp for approval. Use Template Designer to submit.</div>
          <div><strong>Received/Pending:</strong> Submitted to WhatsApp, awaiting approval from Meta.</div>
          <div><strong>Approved:</strong> Ready to use for sending messages.</div>
          <div><strong>Rejected:</strong> Meta rejected the template. Check rejection reason and resubmit.</div>
          <div><strong>Paused/Disabled:</strong> Template temporarily unavailable.</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-airbnb-dark mb-3">All Templates</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-airbnb-gray font-semibold">Filter:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-xs px-3 py-1 rounded ${
                  statusFilter === 'all'
                    ? 'bg-airbnb-red text-white font-semibold'
                    : 'bg-gray-100 text-airbnb-gray hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`text-xs px-3 py-1 rounded ${
                  statusFilter === 'approved'
                    ? 'bg-green-600 text-white font-semibold'
                    : 'bg-gray-100 text-airbnb-gray hover:bg-gray-200'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`text-xs px-3 py-1 rounded ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-600 text-white font-semibold'
                    : 'bg-gray-100 text-airbnb-gray hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('not_submitted')}
                className={`text-xs px-3 py-1 rounded ${
                  statusFilter === 'not_submitted'
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'bg-gray-100 text-airbnb-gray hover:bg-gray-200'
                }`}
              >
                Not Submitted
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`text-xs px-3 py-1 rounded ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white font-semibold'
                    : 'bg-gray-100 text-airbnb-gray hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loadingStatuses && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading statuses...
              </span>
            )}
            <button
              onClick={() => {
                const auth = btoa(`${credentials.accountSid}:${credentials.authToken}`);
                fetchApprovalStatuses(templates, auth);
              }}
              disabled={!isConnected || loadingStatuses || templates.length === 0}
              className="btn-secondary text-xs flex items-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loadingStatuses ? 'animate-spin' : ''}`} />
              Refresh Approval Status
            </button>
          </div>
        </div>

        {loadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-airbnb-red animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-airbnb-gray">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No templates found. Create your first template in the Template Designer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-airbnb-dark w-[18%]">Template Name</th>
                  <th className="text-left py-2 px-3 font-semibold text-airbnb-dark w-[22%]">Content SID</th>
                  <th className="text-left py-2 px-3 font-semibold text-airbnb-dark w-[10%]">Language</th>
                  <th className="text-left py-2 px-3 font-semibold text-airbnb-dark w-[18%]">Internal Review</th>
                  <th className="text-left py-2 px-3 font-semibold text-airbnb-dark w-[32%]">WhatsApp Status</th>
                </tr>
              </thead>
              <tbody>
                {templates.filter((tmpl) => {
                  if (statusFilter === 'all') return true;

                  // Calculate status for filtering
                  const templateApproval = tmpl.approval_requests;
                  const approvalData = approvalStatuses[tmpl.sid];
                  const whatsappApproval = approvalData?.whatsapp || templateApproval?.whatsapp;

                  let status = 'not_submitted';

                  if (whatsappApproval && whatsappApproval.status) {
                    status = whatsappApproval.status;
                  } else if (approvalData !== undefined && Object.keys(approvalData).length === 0) {
                    status = 'not_submitted';
                  } else if (templateApproval !== undefined && Object.keys(templateApproval).length === 0) {
                    status = 'not_submitted';
                  } else if (approvalData && !approvalData.whatsapp) {
                    status = 'not_submitted';
                  }

                  // Filter logic
                  if (statusFilter === 'approved') return status === 'approved';
                  if (statusFilter === 'pending') return status === 'pending' || status === 'received';
                  if (statusFilter === 'not_submitted') return status === 'not_submitted' || status === 'unsubmitted';
                  if (statusFilter === 'rejected') return status === 'rejected';

                  return true;
                }).map((tmpl, idx) => {
                  // First check if approval_requests is in the template object itself
                  const templateApproval = tmpl.approval_requests;

                  // Then check the separately fetched approval data
                  const approvalData = approvalStatuses[tmpl.sid];
                  const whatsappApproval = approvalData?.whatsapp || templateApproval?.whatsapp;


                  let status = 'not_submitted'; // Default to not submitted

                  // Check if there's a whatsapp approval
                  if (whatsappApproval && whatsappApproval.status) {
                    status = whatsappApproval.status;
                  }
                  // Check if approval data exists but is empty (meaning not submitted)
                  else if (approvalData !== undefined && Object.keys(approvalData).length === 0) {
                    status = 'not_submitted';
                  }
                  // Check template's own approval_requests
                  else if (templateApproval !== undefined && Object.keys(templateApproval).length === 0) {
                    status = 'not_submitted';
                  }
                  // If we have approval data but no whatsapp key, still not submitted
                  else if (approvalData && !approvalData.whatsapp) {
                    status = 'not_submitted';
                  }

                  return (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-airbnb-dark text-sm truncate">{tmpl.friendly_name}</div>
                        {tmpl.types && (
                          <div className="text-xs text-airbnb-gray mt-1">
                            Types: {Object.keys(tmpl.types).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-xs text-airbnb-gray break-all">{tmpl.sid}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                          {(tmpl.language || 'en').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Approved by Airbnb Reviewers
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-2">
                          {getStatusBadge(status)}

                          {(status === 'not_submitted' || status === 'unsubmitted') && (
                            <button
                              className="btn-primary text-xs py-1 px-3 w-fit"
                              onClick={() => submitForApproval(tmpl)}
                              disabled={submittingApproval[tmpl.sid]}
                            >
                              {submittingApproval[tmpl.sid] ? (
                                <>
                                  <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                                  Submitting...
                                </>
                              ) : (
                                'Submit for Approval'
                              )}
                            </button>
                          )}

                          {whatsappApproval?.rejection_reason && (
                            <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                              <strong>Rejection:</strong> {whatsappApproval.rejection_reason}
                            </div>
                          )}

                          {status === 'rejected' && (
                            <button
                              className="btn-primary text-xs py-1 px-3 w-fit"
                              onClick={() => submitForApproval(tmpl)}
                              disabled={submittingApproval[tmpl.sid]}
                            >
                              {submittingApproval[tmpl.sid] ? (
                                <>
                                  <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                                  Submitting...
                                </>
                              ) : (
                                'Resubmit for Approval'
                              )}
                            </button>
                          )}

                          {whatsappApproval?.date_updated && (
                            <div className="text-xs text-airbnb-gray">
                              Updated: {new Date(whatsappApproval.date_updated).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {templatesApiResponse && isConnected && (
        <div className="card bg-gray-50">
          <h4 className="font-semibold text-airbnb-dark mb-3">API Response Details</h4>

          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-airbnb-gray">Total</div>
              <div className="text-2xl font-bold text-airbnb-dark">
                {templatesApiResponse.contents?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-airbnb-gray">Approved</div>
              <div className="text-2xl font-bold text-green-600">
                {Object.values(approvalStatuses).filter(a => a.whatsapp?.status === 'approved').length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-airbnb-gray">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(approvalStatuses).filter(a =>
                  a.whatsapp?.status === 'pending' || a.whatsapp?.status === 'received'
                ).length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-airbnb-gray">Rejected</div>
              <div className="text-2xl font-bold text-red-600">
                {Object.values(approvalStatuses).filter(a => a.whatsapp?.status === 'rejected').length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-airbnb-gray">Paused/Disabled</div>
              <div className="text-2xl font-bold text-gray-600">
                {Object.values(approvalStatuses).filter(a =>
                  a.whatsapp?.status === 'paused' || a.whatsapp?.status === 'disabled'
                ).length}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <ApiCallDisplay
              method="GET"
              url="https://content.twilio.com/v1/Content"
              headers={{
                'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
              }}
              body={null}
              title="Fetch All Templates"
            />
          </div>

          <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
            <div className="text-yellow-300 mb-2">Templates API Response:</div>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(templatesApiResponse, null, 2)}
            </pre>
          </div>

          {Object.keys(approvalStatuses).length > 0 && (
            <div className="mt-4">
              <h5 className="font-semibold text-airbnb-dark mb-3">Approval Status API Call Example</h5>
              <p className="text-sm text-airbnb-gray mb-3">
                For each template, we call: GET /v1/Content/{'{ContentSid}'}/ApprovalRequests
              </p>

              {templates.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-airbnb-gray mb-2">Example for first template: {templates[0].friendly_name}</p>
                  <ApiCallDisplay
                    method="GET"
                    url={`https://content.twilio.com/v1/Content/${templates[0].sid}/ApprovalRequests`}
                    headers={{
                      'Authorization': `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`
                    }}
                    body={null}
                    title="Fetch Approval Status for Single Template"
                  />
                </div>
              )}

              <h5 className="font-semibold text-airbnb-dark mb-3 mt-6">All Approval Status Responses</h5>
              <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
                <div className="text-yellow-300 mb-2">Approval Statuses by Template:</div>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(approvalStatuses, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateLibrary;

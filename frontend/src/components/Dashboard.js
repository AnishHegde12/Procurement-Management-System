import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, X, TrendingUp, FileText, CheckCircle, Loader2 } from "lucide-react";
import "../css/dashboard.css";

function Dashboard() {
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRfp, setSelectedRfp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [activeTab, setActiveTab] = useState("details"); // details, proposals, compare
  const [showSubmitProposalModal, setShowSubmitProposalModal] = useState(false);
  const [proposalText, setProposalText] = useState("");
  const [selectedVendorForProposal, setSelectedVendorForProposal] = useState(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [showEmailSuccessModal, setShowEmailSuccessModal] = useState(false);
  const [emailSentCount, setEmailSentCount] = useState(0);
  const [sendingEmails, setSendingEmails] = useState(false);

  useEffect(() => {
    fetchRFPs();
    fetchVendors();
  }, []);

  async function fetchRFPs() {
    try {
      const response = await axios.get("http://localhost:5000/rfps");
      setRfps(response.data);
    } catch (error) {
      console.error("Error fetching RFPs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVendors() {
    try {
      const response = await axios.get("http://localhost:5000/vendors");
      setVendors(response.data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  }

  async function handleViewDetail(rfp) {
    setSelectedRfp(rfp);
    setSelectedVendors(rfp.vendors ? rfp.vendors.map((v) => v._id || v.id) : []);
    setShowDetailModal(true);
    setActiveTab("details");
    setProposals([]);
    setComparison(null);
    
    // Fetch proposals if RFP has been sent
    if (rfp.status === "received") {
      await fetchProposals(rfp._id);
    }
  }

  async function fetchProposals(rfpId) {
    setLoadingProposals(true);
    try {
      const response = await axios.get(`http://localhost:5000/rfps/${rfpId}/proposals`);
      setProposals(response.data);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoadingProposals(false);
    }
  }

  async function handleCompareProposals() {
    if (!selectedRfp || proposals.length === 0) return;
    
    setLoadingComparison(true);
    try {
      const response = await axios.get(`http://localhost:5000/rfps/${selectedRfp._id}/compare`);
      setComparison(response.data);
      setActiveTab("compare");
    } catch (error) {
      console.error("Error generating comparison:", error);
      alert("Failed to generate comparison. Please try again.");
    } finally {
      setLoadingComparison(false);
    }
  }

  function handleSubmitProposal() {
    if (!selectedRfp || !selectedVendorForProposal || !proposalText.trim()) {
      alert("Please select a vendor and enter proposal text");
      return;
    }
    setSubmittingProposal(true);
  }

  async function submitProposal() {
    try {
      await axios.post("http://localhost:5000/proposals/inbound", {
        from: selectedVendorForProposal.email,
        subject: `Re: RFP Request: ${selectedRfp.rfpId}`,
        text: proposalText,
        html: proposalText.replace(/\n/g, "<br>"),
        rfpId: selectedRfp.rfpId,
        vendorEmail: selectedVendorForProposal.email,
        vendorName: selectedVendorForProposal.name,
      });
      
      setShowSubmitProposalModal(false);
      setProposalText("");
      setSelectedVendorForProposal(null);
      // Refresh proposals
      await fetchProposals(selectedRfp._id);
      setActiveTab("proposals");
      alert("Proposal submitted and processed successfully!");
    } catch (error) {
      console.error("Error submitting proposal:", error);
      alert("Failed to submit proposal: " + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingProposal(false);
    }
  }

  // Auto-refresh proposals every 30 seconds when on proposals tab
  useEffect(() => {
    if (activeTab === "proposals" && selectedRfp && selectedRfp.status === "received") {
      const interval = setInterval(() => {
        fetchProposals(selectedRfp._id);
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedRfp]);

  function toggleVendorSelection(vendorId) {
    if (selectedRfp.status === "draft") {
      setSelectedVendors((prev) => {
        if (prev.includes(vendorId)) {
          return prev.filter((id) => id !== vendorId);
        } else {
          return [...prev, vendorId];
        }
      });
    }
  }

  async function handleSendRFP() {
    try {
      setSendingEmails(true);
      const selectedVendorObjects = selectedVendors
        .map((id) => vendors.find((v) => v._id === id))
        .filter((v) => v !== undefined);
      await axios.put(`http://localhost:5000/rfps/${selectedRfp._id}`, {
        vendors: selectedVendorObjects,
        status: "received",
      });
      
      setSendingEmails(false);
      
      // Show success modal
      setEmailSentCount(selectedVendorObjects.length);
      setShowEmailSuccessModal(true);
      setShowDetailModal(false);
      fetchRFPs();
      
      // Close success modal after 2 seconds
      setTimeout(() => {
        setShowEmailSuccessModal(false);
      }, 2000);
    } catch (error) {
      setSendingEmails(false);
      console.error("Error updating RFP:", error);
      alert("Failed to send RFP. Please try again.");
    }
  }

  const totalRFPs = rfps.length;
  const draftCount = rfps.filter((r) => r.status === "draft").length;
  const sentCount = rfps.filter((r) => r.status === "received").length;
  const totalVendors = new Set(rfps.flatMap((r) => (r.vendors || []).map((v) => v._id || v.id))).size;

  return (
    <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>RFP Dashboard</h2>
          <p>Manage and track your requests for proposals</p>
        </div>
        <div className="kpi">
        <div className="kpi-card">
          <p>Total RFPs</p>
          <h3>{totalRFPs}</h3>
        </div>
        <div className="kpi-card">
          <p>Draft</p>
          <h3>{draftCount}</h3>
        </div>
        <div className="kpi-card">
          <p>Sent</p>
          <h3>{sentCount}</h3>
        </div>
        <div className="kpi-card">
          <p>Vendors</p>
          <h3>{totalVendors}</h3>
        </div>
      </div>

      <div className="rfp-list-section">
        <h3 className="rfp-list-title">All RFPs</h3>
        {loading ? (
          <p>Loading RFPs...</p>
        ) : rfps.length === 0 ? (
          <p className="no-rfps">No RFPs found. Create your first RFP!</p>
        ) : (
          <div className="rfp-cards-grid">
            {rfps.map((rfp) => (
              <div key={rfp._id} className="rfp-card">
                <div className="rfp-card-header">
                  <span className="rfp-id">{rfp.rfpId}</span>
                  <span className={`rfp-status ${rfp.status}`}>{rfp.status}</span>
                </div>
                <div className="rfp-card-body">
                  <p className="rfp-date">
                    Created: {new Date(rfp.createdAt).toLocaleDateString()}
                  </p>
                  {rfp.vendors && rfp.vendors.length > 0 && (
                    <p className="rfp-vendors">
                      {rfp.vendors.length} vendor(s) selected
                    </p>
                  )}
                </div>
                <div className="rfp-card-footer">
                  <button
                    className="view-detail-btn"
                    onClick={() => handleViewDetail(rfp)}
                  >
                    <Eye size={16} />
                    View Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {showDetailModal && selectedRfp && (
        <div
          className="detail-modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <h3>RFP Details</h3>
                <p className="rfp-id-display">{selectedRfp.rfpId}</p>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setShowDetailModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            {/* Tabs */}
            {selectedRfp.status === "received" && (
              <div className="detail-modal-tabs">
                <button
                  className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
                  onClick={() => setActiveTab("details")}
                >
                  <FileText size={16} />
                  Details
                </button>
                <button
                  className={`tab-btn ${activeTab === "proposals" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("proposals");
                    if (proposals.length === 0) fetchProposals(selectedRfp._id);
                  }}
                >
                  <FileText size={16} />
                  Proposals ({proposals.length})
                </button>
                {proposals.length > 0 && (
                  <button
                    className={`tab-btn ${activeTab === "compare" ? "active" : ""}`}
                    onClick={handleCompareProposals}
                    disabled={loadingComparison}
                  >
                    <TrendingUp size={16} />
                    Compare & Recommend
                  </button>
                )}
              </div>
            )}

            <div className="detail-modal-body">
              {activeTab === "details" && (
                <>
                  <div className="detail-section">
                    <h4>Status</h4>
                    <span className={`rfp-status-badge ${selectedRfp.status}`}>
                      {selectedRfp.status}
                    </span>
                  </div>
                  <div className="detail-section">
                    <h4>Chatbot Response</h4>
                    <div className="chatbot-response">
                      {selectedRfp.chatbotResponse}
                    </div>
                  </div>
                  {selectedRfp.status === "draft" && (
                    <div className="detail-section">
                      <h4>Select Vendors</h4>
                      <div className="vendor-list-container">
                        {vendors.length === 0 ? (
                          <p>No vendors available</p>
                        ) : (
                          vendors.map((vendor) => (
                            <div
                              key={vendor._id}
                              className={`vendor-item ${
                                selectedVendors.includes(vendor._id) ? "selected" : ""
                              }`}
                              onClick={() => toggleVendorSelection(vendor._id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedVendors.includes(vendor._id)}
                                onChange={() => toggleVendorSelection(vendor._id)}
                              />
                              <div className="vendor-info">
                                <h4>{vendor.name}</h4>
                                <p>
                                  {vendor.contactPerson} • {vendor.category}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {selectedRfp.status === "received" && selectedRfp.vendors && selectedRfp.vendors.length > 0 && (
                    <div className="detail-section">
                      <h4>Selected Vendors</h4>
                      <div className="selected-vendors-list">
                        {selectedRfp.vendors.map((vendor, idx) => (
                          <div key={idx} className="selected-vendor-item">
                            <strong>{vendor.name}</strong>
                            <span>{vendor.contactPerson} • {vendor.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "proposals" && (
                <div className="proposals-section">
                  <div className="proposals-header">
                    <h4>Vendor Proposals</h4>
                    <button
                      className="submit-proposal-btn"
                      onClick={() => {
                        if (selectedRfp.vendors && selectedRfp.vendors.length > 0) {
                          setShowSubmitProposalModal(true);
                        } else {
                          alert("No vendors selected for this RFP");
                        }
                      }}
                    >
                      + Submit Test Proposal
                    </button>
                  </div>
                  {loadingProposals ? (
                    <p>Loading proposals...</p>
                  ) : proposals.length === 0 ? (
                    <div className="no-proposals">
                      <p>No proposals received yet.</p>
                      <p className="proposal-hint">
                        Vendors can reply to the RFP email to submit their proposals.
                        Proposals will be automatically extracted and displayed here.
                      </p>
                      <p className="proposal-hint">
                        <strong>For testing:</strong> Use the "Submit Test Proposal" button above to manually submit a proposal.
                      </p>
                    </div>
                  ) : (
                    <div className="proposals-list">
                      {proposals.map((proposal) => (
                        <div key={proposal._id} className="proposal-card">
                          <div className="proposal-header">
                            <div>
                              <h4>{proposal.vendorName}</h4>
                              <p className="proposal-date">
                                Received: {new Date(proposal.receivedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`proposal-status ${proposal.status}`}>
                              {proposal.status}
                            </span>
                          </div>
                          {proposal.extractedData && (
                            <div className="proposal-data">
                              {proposal.extractedData.totalPrice && (
                                <div className="proposal-field">
                                  <strong>Total Price:</strong> {String(proposal.extractedData.totalPrice)}
                                </div>
                              )}
                              {proposal.extractedData.deliveryTimeline && (
                                <div className="proposal-field">
                                  <strong>Delivery Timeline:</strong> {String(proposal.extractedData.deliveryTimeline)}
                                </div>
                              )}
                              {proposal.extractedData.paymentTerms && (
                                <div className="proposal-field">
                                  <strong>Payment Terms:</strong> {String(proposal.extractedData.paymentTerms)}
                                </div>
                              )}
                              {proposal.extractedData.warranty && (
                                <div className="proposal-field">
                                  <strong>Warranty:</strong> {String(proposal.extractedData.warranty)}
                                </div>
                              )}
                              {proposal.extractedData.completeness !== null && proposal.extractedData.completeness !== undefined && (
                                <div className="proposal-field">
                                  <strong>Completeness Score:</strong> {Number(proposal.extractedData.completeness)}/100
                                </div>
                              )}
                              {proposal.extractedData.notes && (
                                <div className="proposal-field">
                                  <strong>Notes:</strong> {String(proposal.extractedData.notes)}
                                </div>
                              )}
                              {proposal.extractedData.hasAttachments && (
                                <div className="proposal-field">
                                  <strong>Attachments:</strong> <span style={{color: '#10b981'}}>✓ Mentioned in proposal</span>
                                </div>
                              )}
                              {proposal.extractedData.pricing && proposal.extractedData.pricing.length > 0 && (
                                <div className="proposal-field">
                                  <strong>Itemized Pricing:</strong>
                                  <ul>
                                    {proposal.extractedData.pricing.map((item, idx) => {
                                      // Handle both string and object formats
                                      if (typeof item === 'string') {
                                        return <li key={idx}>{item}</li>;
                                      } else if (typeof item === 'object' && item !== null) {
                                        // Handle object format like {item: "Laptop", price: "$1000"}
                                        const itemName = item.item || item.name || item.description || 'Item';
                                        const itemPrice = item.price || item.cost || item.amount || '';
                                        return (
                                          <li key={idx}>
                                            {itemName}{itemPrice ? `: ${itemPrice}` : ''}
                                          </li>
                                        );
                                      }
                                      return <li key={idx}>{JSON.stringify(item)}</li>;
                                    })}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "compare" && (
                <div className="comparison-section">
                  {loadingComparison ? (
                    <div className="loading-comparison">
                      <p>🤖 AI is analyzing proposals and generating comparison...</p>
                      <p className="loading-hint">This may take a few moments</p>
                    </div>
                  ) : comparison && comparison.comparison ? (
                    <div className="comparison-content">
                      {comparison.comparison.recommendation && (
                        <div className="recommendation-box">
                          <h4>🏆 AI Recommendation</h4>
                          <div className="recommendation-content">
                            {comparison.comparison.recommendation}
                          </div>
                        </div>
                      )}
                      {comparison.comparison.scores && (
                        <div className="scores-section">
                          <h4>Vendor Scores</h4>
                          <div className="scores-grid">
                            {Object.entries(comparison.comparison.scores)
                              .map(([vendor, score]) => {
                                // Handle both number and object score formats
                                let scoreValue, scoreBreakdown;
                                if (typeof score === 'number') {
                                  scoreValue = score;
                                } else if (typeof score === 'object' && score !== null) {
                                  // Extract overall score from object or calculate average
                                  scoreValue = score.overall || score.total || score.score || 
                                    (score.price && score.timeline && score.terms && score.completeness
                                      ? Math.round((score.price + score.timeline + score.terms + score.completeness) / 4)
                                      : 0);
                                  scoreBreakdown = score;
                                } else {
                                  scoreValue = 0;
                                }
                                return { vendor, scoreValue, scoreBreakdown };
                              })
                              .sort((a, b) => b.scoreValue - a.scoreValue)
                              .map(({ vendor, scoreValue, scoreBreakdown }) => {
                                const allScores = Object.values(comparison.comparison.scores).map(s => 
                                  typeof s === 'number' ? s : 
                                  (s?.overall || s?.total || s?.score || 
                                   (s?.price && s?.timeline && s?.terms && s?.completeness
                                     ? Math.round((s.price + s.timeline + s.terms + s.completeness) / 4)
                                     : 0))
                                );
                                const maxScore = Math.max(...allScores);
                                
                                return (
                                  <div key={vendor} className="score-card">
                                    <h5>{vendor}</h5>
                                    <div className="score-value">{scoreValue}/100</div>
                                    {scoreBreakdown && (
                                      <div className="score-breakdown">
                                        {scoreBreakdown.price && <div>Price: {scoreBreakdown.price}/100</div>}
                                        {scoreBreakdown.timeline && <div>Timeline: {scoreBreakdown.timeline}/100</div>}
                                        {scoreBreakdown.terms && <div>Terms: {scoreBreakdown.terms}/100</div>}
                                        {scoreBreakdown.completeness && <div>Completeness: {scoreBreakdown.completeness}/100</div>}
                                      </div>
                                    )}
                                    {scoreValue === maxScore && (
                                      <div className="best-badge">Best</div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      {comparison.comparison.summary && (
                        <div className="comparison-summary">
                          <h4>Executive Summary</h4>
                          <p>{comparison.comparison.summary}</p>
                        </div>
                      )}
                      {comparison.comparison.comparison && (
                        <div className="detailed-comparison">
                          <h4>Detailed Comparison</h4>
                          <div className="comparison-text">
                            {typeof comparison.comparison.comparison === 'string' 
                              ? comparison.comparison.comparison 
                              : JSON.stringify(comparison.comparison.comparison, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-comparison">
                      <p>No comparison available yet.</p>
                      <button 
                        className="generate-comparison-btn"
                        onClick={handleCompareProposals}
                        disabled={proposals.length === 0}
                      >
                        <TrendingUp size={16} />
                        Generate Comparison & Recommendation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedRfp.status === "draft" && (
              <div className="detail-modal-footer">
                {selectedVendors.length > 0 && (
                  <button 
                    className="send-rfp-btn" 
                    onClick={handleSendRFP}
                    disabled={sendingEmails}
                  >
                    {sendingEmails ? (
                      <>
                        <Loader2 size={18} className="spinning" />
                        Sending Emails...
                      </>
                    ) : (
                      `Send RFP to ${selectedVendors.length} vendor(s)`
                    )}
                  </button>
                )}
              </div>
            )}
            {selectedRfp.status === "received" && proposals.length > 0 && activeTab !== "compare" && (
              <div className="detail-modal-footer">
                <button 
                  className="compare-btn-primary" 
                  onClick={handleCompareProposals}
                  disabled={loadingComparison}
                >
                  <TrendingUp size={18} />
                  {loadingComparison ? "Generating..." : "Compare Proposals & Get Recommendation"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Proposal Modal */}
      {showSubmitProposalModal && selectedRfp && (
        <div
          className="detail-modal-overlay"
          onClick={() => setShowSubmitProposalModal(false)}
        >
          <div className="submit-proposal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <h3>Submit Test Proposal</h3>
                <p className="rfp-id-display">RFP: {selectedRfp.rfpId}</p>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setShowSubmitProposalModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="detail-modal-body">
              <div className="detail-section">
                <h4>Select Vendor</h4>
                <div className="vendor-list-container">
                  {selectedRfp.vendors.map((vendor) => (
                    <div
                      key={vendor._id || vendor.id}
                      className={`vendor-item ${
                        selectedVendorForProposal?.email === vendor.email ? "selected" : ""
                      }`}
                      onClick={() => setSelectedVendorForProposal(vendor)}
                    >
                      <input
                        type="radio"
                        name="vendor"
                        checked={selectedVendorForProposal?.email === vendor.email}
                        onChange={() => setSelectedVendorForProposal(vendor)}
                      />
                      <div className="vendor-info">
                        <h4>{vendor.name}</h4>
                        <p>{vendor.contactPerson} • {vendor.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="detail-section">
                <h4>Proposal Content</h4>
                <p className="proposal-hint">
                  Enter the vendor's proposal text. The AI will automatically extract pricing, terms, timeline, etc.
                  You can paste messy text, tables, or free-form content.
                </p>
                <textarea
                  className="proposal-textarea"
                  value={proposalText}
                  onChange={(e) => setProposalText(e.target.value)}
                  placeholder="Paste or type the vendor proposal here. For example:

Dear Team,

We are pleased to submit our proposal:

PRICING:
- Item 1: $10,000
- Item 2: $15,000
- Item 3: $5,000
Total: $30,000

DELIVERY: 30 days from order
PAYMENT TERMS: Net 30
WARRANTY: 1 year standard warranty

Thank you for considering our proposal."
                  rows={15}
                />
              </div>
            </div>
            <div className="detail-modal-footer">
              <button
                className="save-draft-btn"
                onClick={() => setShowSubmitProposalModal(false)}
              >
                Cancel
              </button>
              <button
                className="send-rfp-btn"
                onClick={submitProposal}
                disabled={!selectedVendorForProposal || !proposalText.trim() || submittingProposal}
              >
                {submittingProposal ? "Processing..." : "Submit & Extract Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Success Modal */}
      {showEmailSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <CheckCircle size={64} color="#10b981" />
            <h2>Emails Sent Successfully!</h2>
            <p>RFP has been sent to {emailSentCount} vendor(s)</p>
            <p className="success-hint">You can view the RFP in the dashboard</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
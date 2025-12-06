import { useState, useEffect } from "react";
import axios from "axios";
import { ArrowUp, X, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Message from "./MessageBox";
import "../css/create-rfp.css";

function CreateRFP() {
  const [messageList, setMessageList] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [disable, setDisable] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showCreateRfp, setShowCreateRfp] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [chatbotResponse, setChatbotResponse] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [emailSentCount, setEmailSentCount] = useState(0);
  const [sendingEmails, setSendingEmails] = useState(false);
  const navigate = useNavigate();
  function makeHistory() {
    let history = [];
    messageList.forEach((element) => {
      var jsonObj = {
        role: element.props.type,
        parts: [{ text: element.props.body }],
      };
      history.push(jsonObj);
    });
    return history;
  }

  useEffect(() => {
    if (showVendorModal) {
      fetchVendors();
    }
  }, [showVendorModal]);

  async function fetchVendors() {
    try {
      const response = await axios.get("http://localhost:5000/vendors");
      setVendors(response.data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  }

  async function sendQuery(query) {
    const userMessage = <Message body={query} type="user" />;
    setMessageList((prevMessageList) => [...prevMessageList, userMessage]);
    setDisable(true);
    setInputVal("");
    setThinking(true);
    try {
      const response = await axios.post("http://localhost:5000/chatbot/", {
        text: query,
      });
      setThinking(false);
      const modelMessage = <Message body={response.data} type="model" />;
      setMessageList((prevMessageList) => [...prevMessageList, modelMessage]);
      setChatbotResponse(response.data);
      setShowCreateRfp(true);
    } catch (error) {
      console.log(error);
    } finally {
      setDisable(false);
    }
    console.log(messageList);
  }

  function handleCreateRFP() {
    setShowVendorModal(true);
    setSelectedVendors([]);
  }

  function toggleVendorSelection(vendorId) {
    setSelectedVendors((prev) => {
      if (prev.includes(vendorId)) {
        return prev.filter((id) => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  }

  async function handleSendRFP() {
    try {
      setSendingEmails(true);
      const status = selectedVendors.length > 0 ? "received" : "draft";
      const selectedVendorObjects = selectedVendors
        .map((id) => vendors.find((v) => v._id === id))
        .filter((v) => v !== undefined);
      
      const response = await axios.post("http://localhost:5000/rfps", {
        chatbotResponse,
        vendors: selectedVendorObjects,
        status,
      });
      
      setSendingEmails(false);
      
      // Show success modal if emails were sent
      if (status === "received" && selectedVendorObjects.length > 0) {
        setEmailSentCount(selectedVendorObjects.length);
        setShowVendorModal(false);
        setShowSuccessModal(true);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          setShowCreateRfp(false);
          setMessageList([]);
          setChatbotResponse("");
          setShowSuccessModal(false);
          navigate("/");
        }, 2000);
      } else {
        // If saved as draft, just redirect
        setShowVendorModal(false);
        setShowCreateRfp(false);
        setMessageList([]);
        setChatbotResponse("");
        navigate("/");
      }
    } catch (error) {
      setSendingEmails(false);
      console.error("Error creating RFP:", error);
      alert("Failed to create RFP. Please try again.");
    }
  }

  async function handleSaveAsDraft() {
    try {
      await axios.post("http://localhost:5000/rfps", {
        chatbotResponse,
        vendors: [],
        status: "draft",
      });
      
      setShowVendorModal(false);
      setShowCreateRfp(false);
      setMessageList([]);
      setChatbotResponse("");
      navigate("/");
    } catch (error) {
      console.error("Error saving RFP:", error);
      alert("Failed to save RFP. Please try again.");
    }
  }
  return (
    <div className="create-rfp-wrapper">
      <div className="create-rfp-container">
        <div className="message-list">
          {messageList.map((message, index) => (
            <Message {...message.props} key={index} />
          ))}
          {thinking ? (
          <h1 className="thinking-text">
            Structuring the RFP...
          </h1>
        ) : null}
        </div>
        <div className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={inputVal}
              disabled={disable}
              autoFocus={true}
              onChange={(e) => {
                setInputVal(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !disable) {
                  sendQuery(inputVal);
                }
              }}
              placeholder="Type your procurement requirements here"
              className="chat-input"
            />
            <button
              className="send-button"
              disabled={inputVal.trim().length > 0 ? false : true}
              onClick={() => {
                sendQuery(inputVal);
              }}
            >
              <ArrowUp color="white" />
            </button>
            {showCreateRfp && (
              <button className="create-rfp-btn" onClick={handleCreateRFP}>
                Create RFP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Selection Modal */}
      {showVendorModal && (
        <div className="vendor-modal-overlay" onClick={() => setShowVendorModal(false)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>Select Vendors</h3>
              <button className="close-modal-btn" onClick={() => setShowVendorModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="vendor-list-container">
              {vendors.length === 0 ? (
                <p>No vendors available</p>
              ) : (
                vendors.map((vendor) => (
                  <div
                    key={vendor._id}
                    className={`vendor-item ${selectedVendors.includes(vendor._id) ? "selected" : ""}`}
                    onClick={() => toggleVendorSelection(vendor._id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor._id)}
                      onChange={() => toggleVendorSelection(vendor._id)}
                    />
                    <div className="vendor-info">
                      <h4>{vendor.name}</h4>
                      <p>{vendor.contactPerson} • {vendor.category}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="vendor-modal-footer">
              <button 
                className="save-draft-btn" 
                onClick={handleSaveAsDraft}
                disabled={sendingEmails}
              >
                Save as Draft
              </button>
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
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <CheckCircle size={64} color="#10b981" />
            <h2>Emails Sent Successfully!</h2>
            <p>RFP has been sent to {emailSentCount} vendor(s)</p>
            <p className="success-hint">Redirecting to dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateRFP;
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient, ObjectId } from "mongodb";
import { seedVendors } from "./seed.js";
import { sendRFPEmail } from "./emailService.js";
import { extractProposalData, compareProposals } from "./proposalExtractor.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("rfpdb"); // your DB name
    console.log("✅ MongoDB Connected");

    // Seed vendors **only if collection is empty**
    await seedVendors(db);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

connectDB();

const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.get("/", (req, res) => res.send("APP is Running"));

app.post("/chatbot", async (req, res) => {
  try {
    const prompt = req.body.text;
            const model = ai.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction:
                    "take normal english input and give a structured rfp output in given format with sub points inside item for different items listed along with the given specs and nothing extra" +
                    "\nItems: " +
                    "\nBudget: " +
                    "\nDeadline: " +
                    "\nPayment Terms: " +
                    "\nWarranty: "
            });
            const result = await model.generateContent(prompt);
            let text = result.response.text();
            text = formatRFPResponse(text)
            console.log(text)
            res.send(text);
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).send("Error in creating RFP");
  }
});

app.get("/vendors", async (req, res) => {
  try {
    const vendors = await db.collection("rfpdb").find().toArray();
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

function generateRFPId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `RFP-${timestamp}-${random}`;
}

// Create RFP
app.post("/rfps", async (req, res) => {
  try {
    const { chatbotResponse, vendors, status } = req.body;
    const rfpId = generateRFPId();
    const rfp = {
      rfpId,
      chatbotResponse,
      vendors: vendors || [],
      status: status || "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("rfps").insertOne(rfp);
    const createdRfp = { ...rfp, _id: result.insertedId };
    
    // Send emails if status is "received" and vendors are provided
    if (status === "received" && vendors && vendors.length > 0) {
      const emailResults = [];
      for (const vendor of vendors) {
        try {
          const emailResult = await sendRFPEmail(createdRfp, vendor);
          emailResults.push({ vendor: vendor.name, email: vendor.email, ...emailResult });
        } catch (emailError) {
          console.error(`Error sending email to ${vendor.email}:`, emailError);
          emailResults.push({ 
            vendor: vendor.name, 
            email: vendor.email, 
            success: false, 
            error: emailError.message 
          });
        }
      }
      
      // Update RFP with email results
      await db.collection("rfps").updateOne(
        { _id: result.insertedId },
        { 
          $set: { 
            emailSent: true,
            emailResults: emailResults,
            sentAt: new Date()
          }
        }
      );
      
      createdRfp.emailSent = true;
      createdRfp.emailResults = emailResults;
      createdRfp.sentAt = new Date();
    }
    
    res.status(201).json(createdRfp);
  } catch (err) {
    console.error("Error creating RFP:", err);
    res.status(500).json({ error: "Failed to create RFP" });
  }
});

// Get all RFPs
app.get("/rfps", async (req, res) => {
  try {
    const rfps = await db.collection("rfps").find().sort({ createdAt: -1 }).toArray();
    res.json(rfps);
  } catch (err) {
    console.error("Error fetching RFPs:", err);
    res.status(500).json({ error: "Failed to fetch RFPs" });
  }
});

// Get RFP by ID
app.get("/rfps/:id", async (req, res) => {
  try {
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: "Invalid RFP ID format" });
    }
    const rfp = await db.collection("rfps").findOne({ _id: objectId });
    if (!rfp) {
      return res.status(404).json({ error: "RFP not found" });
    }
    res.json(rfp);
  } catch (err) {
    console.error("Error fetching RFP:", err);
    res.status(500).json({ error: "Failed to fetch RFP" });
  }
});

// Update RFP (for adding vendors)
app.put("/rfps/:id", async (req, res) => {
  try {
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: "Invalid RFP ID format" });
    }
    const { vendors, status } = req.body;
    const update = {
      updatedAt: new Date(),
    };
    
    // Get the current RFP to check if we need to send emails
    const currentRfp = await db.collection("rfps").findOne({ _id: objectId });
    if (!currentRfp) {
      return res.status(404).json({ error: "RFP not found" });
    }
    
    if (vendors !== undefined) {
      update.vendors = vendors;
      
      // Send emails if status is being changed to "received" and vendors are being added
      if (status === "received" && vendors.length > 0 && currentRfp.status === "draft") {
        const emailResults = [];
        for (const vendor of vendors) {
          try {
            const emailResult = await sendRFPEmail(currentRfp, vendor);
            emailResults.push({ vendor: vendor.name, email: vendor.email, ...emailResult });
          } catch (emailError) {
            console.error(`Error sending email to ${vendor.email}:`, emailError);
            emailResults.push({ 
              vendor: vendor.name, 
              email: vendor.email, 
              success: false, 
              error: emailError.message 
            });
          }
        }
        update.emailSent = true;
        update.emailResults = emailResults;
        update.sentAt = new Date();
      }
    }
    if (status !== undefined) {
      update.status = status;
    }
    
    const result = await db.collection("rfps").updateOne(
      { _id: objectId },
      { $set: update }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "RFP not found" });
    }
    const updatedRfp = await db.collection("rfps").findOne({ _id: objectId });
    res.json(updatedRfp);
  } catch (err) {
    console.error("Error updating RFP:", err);
    res.status(500).json({ error: "Failed to update RFP" });
  }
});

// --------------------- PROPOSAL API ---------------------
// Receive inbound email (webhook endpoint)
app.post("/proposals/inbound", async (req, res) => {
  try {
    const { from, subject, text, html, rfpId, vendorEmail, vendorName } = req.body;
    
    // Extract RFP ID from subject or body if not provided
    let extractedRfpId = rfpId;
    if (!extractedRfpId) {
      const rfpIdMatch = (subject + " " + (text || "") + " " + (html || "")).match(/RFP-[\d-]+/);
      if (rfpIdMatch) {
        extractedRfpId = rfpIdMatch[0];
      }
    }
    
    if (!extractedRfpId) {
      return res.status(400).json({ error: "RFP ID not found in email. Please include RFP ID in subject or body." });
    }
    
    // Find RFP
    const rfp = await db.collection("rfps").findOne({ rfpId: extractedRfpId });
    if (!rfp) {
      return res.status(404).json({ error: "RFP not found" });
    }
    
    // Find vendor by email (use provided vendorEmail or from field)
    const searchEmail = vendorEmail || from;
    const vendor = rfp.vendors?.find(v => 
      v.email === searchEmail || 
      v.email?.toLowerCase() === searchEmail?.toLowerCase()
    );
    
    if (!vendor) {
      // If vendor not found but vendorName provided, create a temporary vendor entry
      if (vendorName && searchEmail) {
        const tempVendor = {
          _id: new ObjectId(),
          name: vendorName,
          email: searchEmail,
          contactPerson: vendorName,
        };
        // Use temp vendor but note it's not in the original vendor list
        const proposal = await processProposal(rfp, tempVendor, from, subject, text, html, extractedRfpId, true);
        return res.status(201).json(proposal);
      }
      return res.status(404).json({ 
        error: "Vendor not found for this RFP",
        hint: "Make sure the email matches one of the vendors selected for this RFP"
      });
    }
    
    const proposal = await processProposal(rfp, vendor, from, subject, text, html, extractedRfpId, false);
    res.status(201).json(proposal);
  } catch (err) {
    console.error("Error processing inbound proposal:", err);
    res.status(500).json({ error: "Failed to process proposal", details: err.message });
  }
});

// Helper function to process proposal
async function processProposal(rfp, vendor, from, subject, text, html, extractedRfpId, isTempVendor = false) {
  // Extract proposal data using AI
  const emailContent = html || text || "";
  const extractionResult = await extractProposalData(emailContent, extractedRfpId);
  
  if (!extractionResult.success) {
    throw new Error(`Failed to extract proposal data: ${extractionResult.error}`);
  }
  
  // Store proposal
  const proposal = {
    rfpId: extractedRfpId,
    rfpObjectId: rfp._id,
    vendorId: vendor._id || vendor.id,
    vendorName: vendor.name,
    vendorEmail: vendor.email || from,
    originalEmail: {
      from,
      subject,
      text,
      html,
    },
    extractedData: extractionResult.data,
    receivedAt: new Date(),
    status: "pending", // pending, reviewed, accepted, rejected
    isTempVendor: isTempVendor, // Flag if vendor wasn't in original list
  };
  
  const result = await db.collection("proposals").insertOne(proposal);
  
  // Update RFP to mark that proposals are being received
  await db.collection("rfps").updateOne(
    { _id: rfp._id },
    { 
      $set: { 
        hasProposals: true,
        updatedAt: new Date()
      }
    }
  );
  
  return { ...proposal, _id: result.insertedId };
}

// Get proposals for an RFP
app.get("/rfps/:id/proposals", async (req, res) => {
  try {
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: "Invalid RFP ID format" });
    }
    
    const proposals = await db.collection("proposals")
      .find({ rfpObjectId: objectId })
      .sort({ receivedAt: -1 })
      .toArray();
    
    res.json(proposals);
  } catch (err) {
    console.error("Error fetching proposals:", err);
    res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

// Get proposal comparison and recommendation
app.get("/rfps/:id/compare", async (req, res) => {
  try {
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: "Invalid RFP ID format" });
    }
    
    // Get RFP
    const rfp = await db.collection("rfps").findOne({ _id: objectId });
    if (!rfp) {
      return res.status(404).json({ error: "RFP not found" });
    }
    
    // Get all proposals for this RFP
    const proposals = await db.collection("proposals")
      .find({ rfpObjectId: objectId })
      .toArray();
    
    if (proposals.length === 0) {
      return res.status(404).json({ error: "No proposals found for this RFP" });
    }
    
    // Prepare proposals for comparison
    const proposalsForComparison = proposals.map(p => ({
      vendorName: p.vendorName,
      vendorEmail: p.vendorEmail,
      extractedData: p.extractedData,
      receivedAt: p.receivedAt,
    }));
    
    // Get AI comparison
    const comparisonResult = await compareProposals(proposalsForComparison, rfp);
    
    if (!comparisonResult.success) {
      return res.status(500).json({ error: "Failed to generate comparison", details: comparisonResult.error });
    }
    
    // Store comparison in database
    const comparison = {
      rfpId: rfp._id,
      rfpObjectId: objectId,
      proposals: proposals.map(p => p._id),
      comparison: comparisonResult.comparison,
      generatedAt: new Date(),
    };
    
    await db.collection("comparisons").updateOne(
      { rfpObjectId: objectId },
      { $set: comparison },
      { upsert: true }
    );
    
    res.json(comparison);
  } catch (err) {
    console.error("Error generating comparison:", err);
    res.status(500).json({ error: "Failed to generate comparison" });
  }
});

// Update proposal status
app.put("/proposals/:id", async (req, res) => {
  try {
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: "Invalid proposal ID format" });
    }
    
    const { status, notes } = req.body;
    const update = {
      updatedAt: new Date(),
    };
    
    if (status !== undefined) {
      update.status = status;
    }
    if (notes !== undefined) {
      update.notes = notes;
    }
    
    const result = await db.collection("proposals").updateOne(
      { _id: objectId },
      { $set: update }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    
    const updatedProposal = await db.collection("proposals").findOne({ _id: objectId });
    res.json(updatedProposal);
  } catch (err) {
    console.error("Error updating proposal:", err);
    res.status(500).json({ error: "Failed to update proposal" });
  }
});

// --------------------------------------------------------------
function formatRFPResponse(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/Items:/i, "\n• Items:")
    .replace(/Budget:/i, "\n• Budget:")
    .replace(/Deadline:/i, "\n• Deadline:")
    .replace(/Payment Terms:/i, "\n• Payment Terms:")
    .replace(/Warranty:/i, "\n• Warranty:")
    .replace(/\*/g, "")
    .trim();
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

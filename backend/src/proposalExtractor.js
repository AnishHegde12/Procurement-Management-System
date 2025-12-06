import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function extractProposalData(emailContent, rfpId) {
  try {
    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are an expert at extracting structured data from vendor proposal emails, even when they are messy, unstructured, or contain tables.

Extract the following information from the email content and return it as a JSON object:
- pricing: array of items with prices (extract all prices mentioned, even from tables or lists)
- totalPrice: total price if mentioned (extract the final/total amount)
- deliveryTimeline: delivery or completion timeline (extract dates, weeks, months mentioned)
- paymentTerms: payment terms mentioned (e.g., Net 30, 50% upfront, etc.)
- warranty: warranty information (duration, coverage, etc.)
- additionalTerms: any additional terms or conditions
- completeness: score from 0-100 based on how complete the proposal is (consider: pricing, timeline, terms, warranty)
- notes: any important notes or conditions
- hasAttachments: boolean indicating if attachments are mentioned (even if not actually attached)

IMPORTANT:
- Handle messy text, tables, bullet points, and free-form content
- Extract prices even if written in different formats ($50,000, 50000, fifty thousand, etc.)
- Extract dates and timelines even if written in natural language
- If information is in a table, extract it from the table structure
- If attachments are mentioned, note them but don't try to extract their content

Return ONLY valid JSON, no additional text. If information is not found, use null for that field.`
    });

    const prompt = `Extract structured proposal data from this vendor email response for RFP ${rfpId}.

The email content may be messy, contain tables, or be in free-form text. Extract all relevant information:

${emailContent}`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean the response to extract JSON
    text = text.trim();
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to find JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    const proposalData = JSON.parse(text);
    
    return {
      success: true,
      data: {
        ...proposalData,
        extractedAt: new Date(),
      }
    };
  } catch (error) {
    console.error("Error extracting proposal data:", error);
    // Try to extract basic info even if JSON parsing fails
    try {
      const fallbackData = {
        pricing: [],
        totalPrice: null,
        deliveryTimeline: null,
        paymentTerms: null,
        warranty: null,
        additionalTerms: null,
        completeness: 50,
        notes: "Failed to fully extract data. Manual review required.",
        hasAttachments: emailContent.toLowerCase().includes("attachment") || emailContent.toLowerCase().includes("attached"),
        extractedAt: new Date(),
      };
      return {
        success: true,
        data: fallbackData,
        warning: "Partial extraction due to parsing error"
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export async function compareProposals(proposals, rfpDetails) {
  try {
    const model = ai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are an expert at comparing vendor proposals and making recommendations.
Analyze the proposals and provide a JSON object with:
- comparison: detailed comparison of each vendor (string)
- scores: object where each key is vendor name and value is a single number (0-100) representing overall score
  Example: {"Vendor A": 85, "Vendor B": 72}
  The score should be based on: price competitiveness, timeline, terms, completeness
- recommendation: which vendor to choose and why (string)
- summary: brief summary of the analysis (string)

IMPORTANT: 
- scores must be a simple object with vendor names as keys and numbers (0-100) as values
- Do NOT nest scores or use objects as values in the scores field
- Return ONLY valid JSON, no additional text.`
    });

    const prompt = `Compare these vendor proposals for RFP ${rfpDetails.rfpId}:

RFP Requirements:
${rfpDetails.chatbotResponse}

Proposals:
${JSON.stringify(proposals, null, 2)}

Provide a detailed comparison and recommendation.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Clean the response
    text = text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const comparison = JSON.parse(text);
    
    return {
      success: true,
      comparison: {
        ...comparison,
        generatedAt: new Date(),
      }
    };
  } catch (error) {
    console.error("Error comparing proposals:", error);
    return {
      success: false,
      error: error.message,
      comparison: null
    };
  }
}


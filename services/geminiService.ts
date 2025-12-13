import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (genAI) return genAI;

  // The API key must be obtained exclusively from the environment variable process.env.API_KEY
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
      console.warn("Gemini API Key missing in environment variables");
      return null;
  }

  try {
    genAI = new GoogleGenAI({ apiKey });
    return genAI;
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
    return null;
  }
};

export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
  const ai = getGenAI();
  
  if (!ai) {
    return "AI service is not available. Please configure the Gemini API Key in your environment variables.";
  }

  if (transactions.length === 0) {
    return "Please add some transactions to receive AI-powered financial advice.";
  }

  // Limit the context size for efficiency, taking the last 50 transactions
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  const prompt = `
    You are a financial advisor. Analyze the following list of recent financial transactions (JSON format).
    
    Transactions:
    ${JSON.stringify(recentTransactions)}

    Please provide a concise analysis in Markdown format:
    1. Identify the top spending category.
    2. Point out any unusual spending patterns or frequent small expenses.
    3. Give one specific, actionable tip to improve savings based on this data.
    4. Keep the tone encouraging but professional.
    5. Keep it under 200 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Could not generate advice at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble analyzing your data right now. Please check your configuration.";
  }
};

export const categorizeDescription = async (description: string): Promise<string | null> => {
  const ai = getGenAI();
  if (!ai) return null;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Categorize this expense description into a single short category name (e.g. 'Food', 'Transport', 'Utilities'). Description: "${description}". Return ONLY the category word.`,
    });
    return response.text?.trim() || null;
  } catch (e) {
    return null;
  }
}
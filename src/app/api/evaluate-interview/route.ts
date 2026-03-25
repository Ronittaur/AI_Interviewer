import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { questions, answers, position, experience } = await req.json();

    if (!questions || !answers || questions.length !== answers.length) {
      return NextResponse.json(
        { error: "Invalid payload: questions and answers must be corresponding arrays of the same length." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured on server" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let transcript = "";
    for (let i = 0; i < questions.length; i++) {
        transcript += `Q${i+1} (${questions[i]}):\\nA: ${answers[i] || "No answer provided"}\\n\\n`;
    }

    const prompt = `You are an expert technical interviewer evaluating a candidate for the position of "${position}" (${experience} years of experience).

Review the following interview transcript:
${transcript}

Provide a comprehensive, constructive evaluation of the candidate. Output strictly as a JSON object matching this structure:

{
  "score": 85, // out of 100
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "feedback": "string (Overall professional feedback paragraph)",
  "improvements": ["string (Actionable advice 1)", "string (Actionable advice 2)"]
}

Do not include any markdown backticks \`\`\` or any text outside the JSON object. Just valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "{}";
    
    // Clean formatting if needed
    let cleanJson = text;
    if (text.includes("```json")) {
      cleanJson = text.split("```json\\n")[1].split("```")[0];
    } else if (text.includes("```")) {
      cleanJson = text.split("```\\n")[1].split("```")[0];
    }

    try {
      const evaluation = JSON.parse(cleanJson.trim());
      return NextResponse.json(evaluation);
    } catch (parseError) {
      console.error("Failed to parse JSON:", cleanJson);
      return NextResponse.json(
        { error: "Failed to parse evaluation response from AI" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error evaluating interview:", error);
    return NextResponse.json(
      { error: "Failed to evaluate interview. " + (error.message || "") },
      { status: 500 }
    );
  }
}

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { skills, position, experience } = await req.json();

    if (!skills || !position || !experience) {
      return NextResponse.json(
        { error: "Missing required fields: skills, position, or experience" },
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
    
    const prompt = `You are an expert technical interviewer hiring for the position of "${position}".
The candidate has ${experience} years of experience and lists the following skills: "${skills}".

Generate exactly 5 to 6 relevant interview questions for this candidate. 
The questions should test their specific skills, be appropriate for their experience level, and include:
- A mix of conceptual and practical questions.
- A scenario-based question.

Output the questions strictly as a JSON array of strings. Do not include any markdown formatting, backticks, or other text outside of the JSON array.

Example format:
[
  "Question 1?",
  "Question 2?"
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "[]";
    
    // Clean up potential markdown formatting in response if the model didn't follow instructions perfectly
    let cleanJson = text;
    if (text.includes("```json")) {
      cleanJson = text.split("```json\\n")[1].split("```")[0];
    } else if (text.includes("```")) {
      cleanJson = text.split("```\\n")[1].split("```")[0];
    }

    try {
      const questionsArray = JSON.parse(cleanJson.trim());
      if (Array.isArray(questionsArray)) {
        return NextResponse.json({ questions: questionsArray });
      }
      throw new Error("Response was not an array");
    } catch (parseError) {
      // Fallback if the AI didn't format as JSON
      console.error("Failed to parse JSON:", cleanJson);
      const lines = cleanJson.split("\\n").filter((line: string) => line.trim().length > 5 && line.includes("?"));
      if (lines.length > 0) {
        return NextResponse.json({ questions: lines });
      }
      throw parseError;
    }
  } catch (error: any) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions. " + (error.message || "") },
      { status: 500 }
    );
  }
}

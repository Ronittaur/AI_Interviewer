import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment")
else:
    genai.configure(api_key=api_key)

app = FastAPI(title="AI Interviewer API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate-questions")
async def generate_questions(request: Request):
    try:
        data = await request.json()
        skills = data.get("skills")
        position = data.get("position")
        experience = data.get("experience")

        if not all([skills, position, experience]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""You are an expert technical interviewer hiring for the position of "{position}".
The candidate has {experience} years of experience and lists the following skills: "{skills}".

Generate exactly 5 to 6 relevant interview questions for this candidate. 
The questions should test their specific skills, be appropriate for their experience level, and include:
- A mix of conceptual and practical questions.
- A scenario-based question.

Output strictly as a JSON array of strings. Do not include markdown formatting or backticks. 

Example:
["Question 1", "Question 2"]"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Simple cleanup if model includes markdown
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
            if text.startswith("json"):
                text = text[4:].strip()

        try:
            questions = json.loads(text)
            return {"questions": questions}
        except Exception as e:
            # Fallback if parsing fails
            lines = [l.strip() for l in text.split("\n") if "?" in l]
            if len(lines) >= 3:
                return {"questions": lines[:6]}
            raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON")

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate-interview")
async def evaluate_interview(request: Request):
    try:
        data = await request.json()
        questions = data.get("questions")
        answers = data.get("answers")
        position = data.get("position")
        experience = data.get("experience")

        if not all([questions, answers, position, experience]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        transcript = ""
        for i, (q, a) in enumerate(zip(questions, answers)):
            transcript += f"Q{i+1}: {q}\nA: {a}\n\n"

        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""You are an expert technical interviewer evaluating a candidate for the position of "{position}" with {experience} years of experience.

Review the following interview transcript:
{transcript}

Provide a comprehensive, constructive evaluation in JSON format:
{{
  "score": 85,
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "feedback": "overall professional feedback paragraph",
  "improvements": ["actionable advice list"]
}}

Output strictly valid JSON. Do not include markdown backticks."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
            if text.startswith("json"):
                text = text[4:].strip()

        return JSONResponse(content=json.loads(text))

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount the frontend
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

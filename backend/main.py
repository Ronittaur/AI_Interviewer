import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment")
    client = None
else:
    client = genai.Client(api_key=api_key)

app = FastAPI(title="AI Interviewer API")
print("AI INTERVIEWER BACKEND: GEMINI-2.0-FLASH VERSION ACTIVE")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate-questions")
async def generate_questions(request: Request):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    try:
        data = await request.json()
        skills = data.get("skills")
        position = data.get("position")
        experience = data.get("experience")

        if not all([skills, position, experience]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        prompt = f"""You are an expert technical interviewer hiring for the position of "{position}".
The candidate has {experience} years of experience and lists the following skills: "{skills}".

Generate exactly 5 to 6 relevant interview questions for this candidate. 
The questions should test their specific skills, be appropriate for their experience level.

Output strictly as a JSON array of strings. Do not include markdown formatting or backticks. 

Example:
["Question 1", "Question 2"]"""

        try:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
        except Exception as e:
            print(f"Primary model failed: {e}")
            print("Listing available models for debugging:")
            try:
                available = [m.name for m in client.models.list()]
                print(f"Available models: {available}")
            except:
                print("Could not list models.")
            raise e
        
        text = response.text.strip()
        
        # Clean up potential markdown
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:].strip()
            text = text.strip()

        try:
            questions = json.loads(text)
            return {"questions": questions}
        except Exception:
            # Fallback if AI output is messy
            return {"questions": [q.strip() for q in text.split("\n") if "?" in q]}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate-interview")
async def evaluate_interview(request: Request):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")

    try:
        data = await request.json()
        questions = data.get("questions")
        answers = data.get("answers")
        position = data.get("position")
        experience = data.get("experience")

        transcript = ""
        for i, (q, a) in enumerate(zip(questions, answers)):
            transcript += f"Q{i+1}: {q}\nA: {a}\n\n"

        prompt = f"""You are an expert technical interviewer evaluating a candidate for the position of "{position}" with {experience} years of experience.

Review the following interview transcript:
{transcript}

Provide a comprehensive evaluation in JSON format:
{{
  "score": 85,
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "feedback": "overall professional feedback paragraph",
  "improvements": ["actionable advice list"]
}}

Output strictly valid JSON. No markdown."""

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        
        text = response.text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:].strip()
            text = text.strip()

        return JSONResponse(content=json.loads(text))

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount frontend
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

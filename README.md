# AI Interviewer 🐍🎙️

An end-to-end AI-powered application designed to conduct mock technical interviews using a **Python (FastAPI)** backend, Google Gemini AI, and a premium **Vanilla JavaScript/CSS** frontend.

## 🚀 Features

- **Dynamic Question Generation**: Tailored interviews based on specific skills, position, and experience.
- **AI Recruiter Voice**: Experience a realistic interview with a synthesizer-powered AI recruiter.
- **Real-time Transcription**: Powered by the Web Speech API for seamless voice-to-text answers.
- **Premium Glassmorphic UI**: A stunning, modern interface built with Vanilla CSS.
- **FastAPI Backend**: High-performance Python server using `google-generativeai`.

## 🛠️ Project Structure

- `/backend`: FastAPI server and AI logic.
- `/frontend`: Static HTML, CSS, and JS.

## 🏁 Getting Started

### Prerequisites

- [Python 3.9+](https://www.python.org/)
- A Google Gemini API Key.

### Installation & Run

1. **Clone & Navigate**:
   ```bash
   cd backend
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Settings**:
   Add your `GEMINI_API_KEY` to a `.env` file inside the `backend` folder.

4. **Launch**:
   ```bash
   python main.py
   ```

5. Visit [http://localhost:8000](http://localhost:8000).

## 📝 License
MIT License.

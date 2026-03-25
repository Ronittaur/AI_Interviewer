# AI Interviewer 🤖🎙️

An end-to-end AI-powered application designed to conduct mock technical interviews using Google Gemini AI, real-time webcam feedback, and automated speech-to-text transcription.

## 🚀 Features

- **Dynamic Question Generation**: Tailored interviews based on specific skills, position, and years of experience.
- **AI Recruiter Voice**: Experience a realistic interview with a synthesizer-powered AI recruiter.
- **Real-time Transcription**: Powered by the Web Speech API for seamless voice-to-text answers.
- **Webcam Integration**: Practice in a real interview setting with video feedback.
- **Detailed AI Evaluation**: Receive a professional score, feedback on strengths and weaknesses, and actionable improvement steps.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Premium Glassmorphic Design)
- **AI Platform**: Google Gemini 2.5 Flash
- **Icons**: Lucide React
- **Browser APIs**: WebRTC (Camera/Mic), Web Speech (Speech-to-Text & Text-to-Speech)

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A Google Gemini API Key. You can get one at [AI Studio](https://aistudio.google.com/).

### Installation

1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   cd ai-interviewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root and add:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 License

This project is open-source and available under the MIT License.

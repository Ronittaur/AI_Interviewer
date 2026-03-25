"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Camera, Mic, Loader2, Play, Square, CheckCircle, AlertCircle, ChevronRight, Check } from "lucide-react";

// The SpeechRecognition interface isn't standard in TS DOM yet
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function InterviewRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const skills = searchParams.get("skills");
  const position = searchParams.get("position");
  const experience = searchParams.get("experience");

  const [step, setStep] = useState<"setup" | "loading" | "interview" | "evaluating" | "feedback">("setup");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  // Recruiter Voice Logic
  const speak = (text: string) => {
    if (typeof window !== "undefined" && !isMuted) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for professional feel
      utterance.pitch = 1;
      
      // Try to find a professional sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Female"));
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak question when it changes
  useEffect(() => {
    if (step === "interview" && questions[currentQuestionIdx]) {
      // Small delay to ensure UI transition is smooth
      const timer = setTimeout(() => {
        speak(questions[currentQuestionIdx]);
      }, 500);
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [currentQuestionIdx, step, questions, isMuted]);

  useEffect(() => {
    if (!skills || !position || !experience) {
      router.push("/");
    }
  }, [skills, position, experience, router]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, step]);

  // Setup Browser Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          setCurrentAnswer(prev => prev + " " + finalTranscript + " " + interimTranscript);
        };
      } else {
        setError("Speech recognition is not supported in this browser. Please use Chrome.");
      }
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      fetchQuestions();
    } catch (err: any) {
      setError("Failed to access camera and microphone: " + err.message);
    }
  };

  const fetchQuestions = async () => {
    setStep("loading");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, position, experience })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setQuestions(data.questions);
      setStep("interview");
    } catch (err: any) {
      setError(err.message || "Failed to generate questions. Check API Key.");
      setStep("setup");
    }
  };

  const startRecording = () => {
    setCurrentAnswer("");
    setIsRecording(true);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch(e) { console.error(e) }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch(e) { console.error(e) }
    }
  };

  const handleNextQuestion = async () => {
    stopRecording();
    
    // Save current answer
    const newAnswers = [...answers, currentAnswer || "No answer provided"];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Finished all questions
      submitForEvaluation(newAnswers);
    }
  };

  const submitForEvaluation = async (finalAnswers: string[]) => {
    setStep("evaluating");
    
    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const res = await fetch("/api/evaluate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          answers: finalAnswers,
          position,
          experience
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setFeedback(data);
      setStep("feedback");
    } catch (err: any) {
      setError(err.message || "Evaluation failed. Check API Key.");
      setStep("interview"); // fallback
    }
  };

  if (step === "setup" || step === "loading") {
    return (
      <div className="interview-container setup-mode">
        <div className="glass-panel text-center max-w-lg mx-auto mt-20">
          <h2 className="mb-4">Interview Setup</h2>
          
          {error && <div className="error-box"><AlertCircle size={18}/> {error}</div>}
          
          <p className="mb-6 text-muted">
            We need access to your camera and microphone to conduct the interview and transcribe your answers.
          </p>
          
          {step === "loading" ? (
            <div className="loading-state">
              <Loader2 className="spinner" size={40} />
              <p>AI is analyzing your profile and preparing custom questions...</p>
            </div>
          ) : (
            <button onClick={requestPermissions} className="primary-btn mx-auto pulse-animation">
              <Camera size={20} /> <Mic size={20} /> Enable Camera & Mic
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === "evaluating") {
    return (
      <div className="interview-container text-center max-w-lg mx-auto mt-32">
        <Loader2 className="spinner mx-auto mb-6" size={64} style={{color: "var(--primary)"}} />
        <h2 className="gradient-text text-3xl mb-4">Analyzing Your Performance</h2>
        <p className="text-muted text-lg">Our AI is reviewing your answers to generate actionable feedback and a final score...</p>
      </div>
    );
  }

  if (step === "feedback" && feedback) {
    return (
      <div className="container mt-12 pb-20">
        <div className="glass-panel text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Interview Results</h1>
          <div className="score-circle mx-auto">
            <span>{feedback.score}</span>
            <small>/100</small>
          </div>
          <p className="mt-6 text-lg">{feedback.feedback}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel fade-in-up" style={{animationDelay: "0.1s"}}>
            <h3 className="text-success flex items-center gap-2 mb-4"><CheckCircle /> Strengths</h3>
            <ul className="custom-list space-y-3">
              {feedback.strengths?.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          
          <div className="glass-panel fade-in-up" style={{animationDelay: "0.2s"}}>
            <h3 className="text-danger flex items-center gap-2 mb-4"><AlertCircle /> Areas for Improvement</h3>
            <ul className="custom-list space-y-3">
              {feedback.weaknesses?.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
          
          <div className="glass-panel md:col-span-2 fade-in-up" style={{animationDelay: "0.3s"}}>
            <h3 className="text-primary flex items-center gap-2 mb-4"><Check /> Actionable Advice</h3>
            <ul className="custom-list space-y-3">
              {feedback.improvements?.map((imp: string, i: number) => (
                <li key={i}>{imp}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-12">
          <button onClick={() => router.push("/")} className="primary-btn mx-auto">
            Take Another Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-room container mt-8">
      <div className="room-header flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold m-0">{position} Interview</h2>
          <span className="text-muted text-sm">Question {currentQuestionIdx + 1} of {questions.length}</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{width: `${((currentQuestionIdx) / questions.length) * 100}%`}}></div>
        </div>
        <button 
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted) window.speechSynthesis.cancel();
          }} 
          className="p-2 rounded-full hover:bg-white/10 transition-colors ml-4"
          title={isMuted ? "Unmute Recruiter" : "Mute Recruiter"}
        >
          {isMuted ? <Mic size={20} className="text-red-500" /> : <Mic size={20} className="text-primary" />}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8 relative">
        <div className="video-container glass-panel p-0 overflow-hidden relative">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover aspect-video"
          ></video>
          {isRecording && <div className="recording-indicator flex items-center gap-2"><div className="red-dot"></div>Recording</div>}
        </div>

        <div className="interaction-panel glass-panel flex flex-col h-full">
          <div className="question-box mb-auto">
            <h3 className="text-2xl font-medium leading-relaxed">
              {questions[currentQuestionIdx]}
            </h3>
          </div>

          <div className="answer-box mt-6 p-4 rounded-lg bg-black/30 border border-gray-800 min-h-[120px]">
            <span className="text-muted text-sm uppercase tracking-wider font-semibold block mb-2">Live Transcript</span>
            <p className="text-gray-300">
              {currentAnswer || (isRecording ? "Listening..." : "Click Start to begin answering.")}
            </p>
          </div>

          <div className="controls mt-6 pt-6 border-t border-gray-800 flex justify-between items-center">
            {isRecording ? (
              <button onClick={stopRecording} className="stop-btn flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors">
                <Square size={18} fill="currentColor" /> Stop Answering
              </button>
            ) : (
              <button onClick={startRecording} className="start-btn flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors">
                <Play size={18} fill="currentColor" /> Start Answering
              </button>
            )}

            <button 
              onClick={handleNextQuestion} 
              className="primary-btn m-0"
              disabled={isRecording}
              style={{opacity: isRecording ? 0.5 : 1}}
            >
              {currentQuestionIdx === questions.length - 1 ? "Finish & Evaluate" : "Next Question"} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewRoom() {
  return (
    <Suspense fallback={<div className="container mt-20 text-center">Loading...</div>}>
      <InterviewRoomContent />
    </Suspense>
  );
}

// State Management
let state = {
    view: 'landing',
    interviewData: {
        position: '',
        skills: '',
        experience: ''
    },
    questions: [],
    currentIdx: 0,
    answers: [],
    isRecording: false,
    isMuted: false,
    transcript: '',
    stream: null
};

// UI Elements
const views = {
    landing: document.getElementById('landing-view'),
    loading: document.getElementById('loading-view'),
    interview: document.getElementById('interview-view'),
    feedback: document.getElementById('feedback-view')
};

// Recognition Setup
let recognition = null;
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        state.transcript += finalTranscript;
        document.getElementById('transcript-text').innerText = state.transcript + interimTranscript;
    };
}

// Helper: Switch View
function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.toggle('active', key === viewName);
    });
    state.view = viewName;
}

// Recruiter Speaker
function speak(text) {
    if (state.isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Female'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
}

// Landing Form Submit
document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    state.interviewData.position = document.getElementById('pos-input').value;
    state.interviewData.skills = document.getElementById('skills-input').value;
    state.interviewData.experience = document.getElementById('exp-input').value;

    showView('loading');
    
    try {
        const res = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.interviewData)
        });
        const data = await res.json();
        
        if (!res.ok || !data.questions) {
            throw new Error(data.detail || data.error || "Failed to generate questions. Please wait a moment and try again.");
        }
        
        state.questions = data.questions;
        state.currentIdx = 0;
        state.answers = [];
        
        // Setup Media
        state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('webcam').srcObject = state.stream;
        document.getElementById('room-position-title').innerText = state.interviewData.position + " Interview";
        
        startInterview();
    } catch (err) {
        alert("Error starting interview: " + err.message);
        showView('landing');
    }
});

function startInterview() {
    showView('interview');
    updateQuestion();
}

function updateQuestion() {
    const q = state.questions[state.currentIdx];
    document.getElementById('current-question-text').innerText = q;
    document.getElementById('question-counter').innerText = `Question ${state.currentIdx + 1} of ${state.questions.length}`;
    document.getElementById('transcript-text').innerText = "Click 'Start Answering' to begin.";
    state.transcript = "";
    speak(q);
}

// Recording Logic
const recordBtn = document.getElementById('toggle-record-btn');
recordBtn.addEventListener('click', () => {
    if (!state.isRecording) {
        state.isRecording = true;
        recordBtn.innerHTML = '<i data-lucide="square"></i> Stop Answering';
        recordBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        recordBtn.style.color = 'var(--danger)';
        document.getElementById('recording-overlay').style.display = 'flex';
        if (recognition) recognition.start();
        lucide.createIcons();
    } else {
        stopRecording();
    }
});

function stopRecording() {
    state.isRecording = false;
    recordBtn.innerHTML = '<i data-lucide="play"></i> Start Answering';
    recordBtn.style.background = 'rgba(16, 185, 129, 0.2)';
    recordBtn.style.color = 'var(--success)';
    document.getElementById('recording-overlay').style.display = 'none';
    if (recognition) recognition.stop();
    lucide.createIcons();
}

// Next Logic
document.getElementById('next-btn').addEventListener('click', async () => {
    if (state.isRecording) stopRecording();
    
    state.answers.push(state.transcript || "No answer provided.");
    
    if (state.currentIdx < state.questions.length - 1) {
        state.currentIdx++;
        updateQuestion();
    } else {
        evaluateInterview();
    }
});

async function evaluateInterview() {
    showView('loading');
    document.getElementById('loading-text').innerText = "Analyzing your performance...";
    
    if (state.stream) {
        state.stream.getTracks().forEach(t => t.stop());
    }

    try {
        const res = await fetch('/api/evaluate-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...state.interviewData,
                questions: state.questions,
                answers: state.answers
            })
        });
        const data = await res.json();
        renderFeedback(data);
    } catch (err) {
        alert("Evaluation failed: " + err.message);
        location.reload();
    }
}

function renderFeedback(data) {
    showView('feedback');
    document.getElementById('score-val').innerText = data.score;
    document.getElementById('overall-feedback').innerText = data.feedback;
    
    const fillList = (id, items) => {
        const el = document.getElementById(id);
        el.innerHTML = "";
        (items || []).forEach(item => {
            const li = document.createElement('li');
            li.innerText = item;
            li.style.marginBottom = "0.5rem";
            el.appendChild(li);
        });
    };

    fillList('strengths-list', data.strengths);
    fillList('weaknesses-list', data.weaknesses);
    fillList('improvements-list', data.improvements);
}

// Mute Logic
document.getElementById('mute-btn').addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    if (state.isMuted) window.speechSynthesis.cancel();
    document.getElementById('mute-text').innerText = state.isMuted ? "Unmute" : "Mute";
    document.getElementById('mute-icon').setAttribute('data-lucide', state.isMuted ? 'volume-x' : 'volume-2');
    lucide.createIcons();
});

// Init Voices for SpeechSynthesis
window.speechSynthesis.onvoiceschanged = () => { /* cache voices if needed */ };

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Code, Clock, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [skills, setSkills] = useState("");
  const [position, setPosition] = useState("");
  const [experience, setExperience] = useState("");

  const handleStartInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skills || !position || !experience) return;
    
    const params = new URLSearchParams({
      skills,
      position,
      experience
    });
    
    router.push(`/interview?${params.toString()}`);
  };

  return (
    <main className="container landing-page">
      <div className="hero-section">
        <div className="glass-panel main-panel">
          <div className="panel-header">
            <h1 className="gradient-text">AI Interviewer</h1>
            <p className="subtitle">Master your next tech interview with our advanced AI. Provide your details below to start a tailored, interactive mock interview.</p>
          </div>
          
          <form onSubmit={handleStartInterview} className="setup-form">
            <div className="form-group">
              <label htmlFor="position"><Briefcase size={16} /> Target Position</label>
              <input 
                id="position"
                type="text" 
                placeholder="e.g. Senior Frontend Engineer" 
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="skills"><Code size={16} /> Key Skills</label>
              <input 
                id="skills"
                type="text" 
                placeholder="e.g. React, TypeScript, Node.js" 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="experience"><Clock size={16} /> Years of Experience</label>
              <select 
                id="experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
              >
                <option value="" disabled>Select experience level</option>
                <option value="0-1">0-1 Years (Entry Level)</option>
                <option value="1-3">1-3 Years (Junior)</option>
                <option value="3-5">3-5 Years (Mid-level)</option>
                <option value="5-8">5-8 Years (Senior)</option>
                <option value="8+">8+ Years (Lead/Principal)</option>
              </select>
            </div>

            <button type="submit" className="primary-btn glow-effect">
              Start Interview <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

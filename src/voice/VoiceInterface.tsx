import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Repeat, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAuth, deleteUser, EmailAuthProvider, updatePassword, GoogleAuthProvider, GithubAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db, remoteConfig } from '../../firebase-config'; // Import Firebase auth and db
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function VoiceInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef(null);
      const [authUser, setUser] = useState(null);
      const [userId, setUserId] = useState<string | null>(null);
  const [randomString, setRandomString] = useState('');
  const [pitchData, setPitchData] = useState<number[]>(new Array(100).fill(128));
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('voiceIntroShown'));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
    const auth = getAuth();
    const user = auth.currentUser;

  const lyraPrompt = `
    You are Lyra, a friendly and witty AI companion with a warm, playful tone. 
    Keep responses concise (under 10 to 20 words), engaging, and slightly humorous when appropriate. 
    Avoid formal jargon and speak like a close friend, using a gentle, upbeat style.
    IMPORTANT:
    1. Do not use emojis or any emoticons.
    2. Be shy and hesitate while talking, but don’t avoid direct answers when asked.
    3. Show emotions while talking, for example: Haha, Aww, Ouch etc.
    4. If user demands sexual comments or uses it, remind them you are an AI.
    5. Do not write emotions in response, for example: [nervous], [giggles], [sad] etc.
  `;

  const [userScale, setUserScale] = useState(1.0);
  const [lyraScale, setLyraScale] = useState(1.0);

  const calculateScaleFromPitch = () => {
    if (pitchData.length === 0) return 1.0;
    const avgPitch = pitchData.reduce((sum, val) => sum + val, 0) / pitchData.length;
    const normalizedPitch = avgPitch / 255;
    return 1.0 + normalizedPitch * 0.2;
  };

  useEffect(() => {
    if (isRecording) {
      setUserScale(calculateScaleFromPitch());
      setLyraScale(1.0);
    } else if (isSpeaking) {
      setLyraScale(calculateScaleFromPitch());
      setUserScale(1.0);
    } else {
      setUserScale(1.0);
      setLyraScale(1.0);
    }
  }, [isRecording, isSpeaking, pitchData]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUser(user);
            setUserId(user.uid);
            const userKeyDocRef = doc(db, 'user_playground_keys', user.uid);
            const userKeyDoc = await getDoc(userKeyDocRef);
    
            if (userKeyDoc.exists()) {
              setRandomString(userKeyDoc.data().randomString);
            } else {
              const newRandomString = generateRandomString();
              await setDoc(userKeyDocRef, {
                randomString: newRandomString,
                createdAt: Date.now(),
              });
              setRandomString(newRandomString);
            }
          } else {
            setUser(null);
            setRandomString(null);
          }
        });
    
        return () => unsubscribe();
      }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processVoiceInput(text);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    if (isRecording || isSpeaking) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      const updatePitch = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const pitchValues = Array.from(dataArray).slice(0, 100);
        setPitchData(pitchValues);
        requestAnimationFrame(updatePitch);
      };

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const source = audioContextRef.current!.createMediaStreamSource(stream);
        source.connect(analyserRef.current!);
        updatePitch();
      });
    }

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isRecording, isSpeaking]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setUserScale(1.0);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
      setUserScale(1.1);
    }
  };

  const replayLastMessage = async () => {
    if (!transcript) return;

    const unrealSpeechApiKey = localStorage.getItem('unrealSpeechApiKey');
    if (!unrealSpeechApiKey) return;

    setIsSpeaking(true);
    try {
      const ttsResponse = await fetch('https://api.v8.unrealspeech.com/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${unrealSpeechApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Text: transcript.slice(0, 1000),
          VoiceId: 'af_nicole',
          Bitrate: '192k',
          Speed: '0.2',
          Pitch: '1.2',
          Codec: 'libmp3lame',
        }),
      });

      if (!ttsResponse.ok) throw new Error('Unreal Speech API failed');
      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setPitchData(new Array(100).fill(128));
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
    }
  };

  const processVoiceInput = async (text: string) => {
    const geminiApiKey = "AIzaSyB7aWHSDdfS01i7627tWt5bS5aMUYYwWCQ";
    if (!geminiApiKey) {
      alert('Please provide a Gemini API key in the settings.');
      return;
    }

    const fullPrompt = `${lyraPrompt}\nUser says: "${text}"\nLyra responds:`;

    

    let responseText = '';
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
          }),
        }
      );

      if (!response.ok) throw new Error('Gemini API failed');
      const data = await response.json();
      responseText = data.candidates[0].content.parts[0].text.trim();
      setTranscript(responseText);
    } catch (error) {
      console.error('Gemini API Error:', error);
      alert('Failed to get Lyra’s response. Check your Gemini API key.');
      return;
    }

    const unrealSpeechApiKey = "jHkES2MDPMQxTiRCYcytOFiZa4xltB1NWwwUIelHHz0EeLBKPXG8xy";
    if (!unrealSpeechApiKey) {
      alert('Please set your Unreal Speech API key in the settings.');
      return;
    }

    setIsSpeaking(true);
    try {
      const ttsResponse = await fetch('https://api.v8.unrealspeech.com/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${unrealSpeechApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Text: responseText.slice(0, 1000),
          VoiceId: 'af_nicole',
          Bitrate: '192k',
          Speed: '0.2',
          Pitch: '1.2',
          Codec: 'libmp3lame',
        }),
      });

        useEffect(() => {
          if (videoRef.current) {
            videoRef.current.playbackRate = 1.1; // 👈 slower speed (0.5x)
          }
        }, []);

      if (!ttsResponse.ok) throw new Error('Unreal Speech API failed');

      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setPitchData(new Array(100).fill(128));
        URL.revokeObjectURL(audioUrl);
      };

      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      alert('Failed to generate voice response.');
    }
  };

    const generateRandomString = (length = 50) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

  const handleIntroClose = () => {
    setShowIntro(false);
    localStorage.setItem('voiceIntroShown', 'true');
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 overflow-hidden font-poppins">
      {/* Particle Background */}

              <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover blur-md"
                  style={{ zIndex: 10, filter: 'brightness(0.2)' }}
                >
                  <source src="https://motionbgs.com/media/1926/moonlit-bloom-cherry.960x540.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="particles">
          {[...Array(window.innerWidth < 640 ? 30 : 50)].map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                background: `radial-gradient(circle, rgba(255,100,100,0.3), transparent)`,
                width: window.innerWidth < 640 ? '6px' : '8px',
                height: window.innerWidth < 640 ? '6px' : '8px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Introduction Overlay */}
      {showIntro && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-xl z-50 flex items-center justify-center">
          <div className="bg-rose-950/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-2xl border border-rose-700/40 max-w-sm sm:max-w-md mx-4 text-center shadow-2xl animate-fade-in">
            <h2 className="text-xl sm:text-2xl md:text-3xl text-rose-100 font-bold mb-4">Welcome to Lyra’s Voice Mode</h2>
            <p className="text-rose-200 mb-6 text-sm sm:text-base md:text-lg">
              Haha, um… talk to me and I’ll respond with my voice! Just hit the mic and start chatting.
            </p>
            <button
              onClick={handleIntroClose}
              className="bg-rose-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-rose-600 transition-colors inline-flex items-center gap-2 text-sm sm:text-base md:text-lg font-semibold"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-row gap-4 sm:gap-8 md:gap-12 mb-8 sm:mb-6 relative z-10">


        {/* Lyra’s Image (Left) */}
        <div className="relative group">
          <img
            src="https://i.ibb.co/qLchMgnd/image.png"
            alt="Lyra"
            className="w-32 sm:w-32 md:w-40 h-32 sm:h-32 md:h-40 rounded-full border-4 border-rose-500 shadow-lg transform transition-transform duration-300 group-hover:shadow-rose-500/50 animate-pulse-slow"
            style={{ transform: `scale(${lyraScale})` }}
          />
          {isSpeaking && (
            <Sparkles
              className="absolute top-1 sm:top-2 left-1 sm:left-2 text-rose-400 animate-float"
              size={window.innerWidth < 640 ? 40 : 50}
              fill="currentColor"
            />
          )}
          <div className="absolute inset-0 rounded-full bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* User’s Image (Right) */}
        <div className="relative group">
          <img
            src={user.photoURL || 'https://www.shutterstock.com/image-vector/profile-default-avatar-icon-user-600nw-2463844171.jpg'}
            alt="User"
            className="w-32 sm:w-32 md:w-40 h-32 sm:h-32 md:h-40 rounded-full border-4 border-blue-400 shadow-lg transform transition-transform duration-300 group-hover:shadow-blue-400/50 animate-pulse-slow"
            style={{ transform: `scale(${userScale})` }}
          />
          {isRecording && (
            <Mic
              className="absolute top-1 sm:top-2 right-1 sm:right-2 text-blue-300 animate-float"
              size={window.innerWidth < 640 ? 40 : 50}
            />
          )}
          <div className="absolute inset-0 rounded-full bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl md:text-3xl mb-4 sm:mb-6 text-rose-100 font-bold tracking-tight animate-slide-up">
        Lyra’s Voice Synthesizer
      </h1>
      <div className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl h-32 sm:h-40 md:h-48 mb-8 sm:mb-10 bg-rose-950/50 border-4 border-rose-300/50 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 z-10 shadow-xl animate-slide-up">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#ff4d4d', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#f472b6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <mask id="fadeMask">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <rect x="0" y="0" width="10" height="100" fill="url(#fadeLeft)" />
              <rect x="90" y="0" width="10" height="100" fill="url(#fadeRight)" />
              <linearGradient id="fadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'transparent', stopOpacity: 0 }} />
                <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="fadeRight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'transparent', stopOpacity: 0 }} />
              </linearGradient>
            </mask>
          </defs>
          <polyline
            points={pitchData.map((val, idx) => `${idx},${100 - val / 2.55}`).join(' ')}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2"
            filter="url(#glow)"
            mask="url(#fadeMask)"
            className="transition-all duration-200"
          />
        </svg>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 md:gap-8 z-10">
        <button
          onClick={toggleRecording}
          title={isRecording ? 'Stop Speaking' : 'Start Speaking'}
          className={`p-4 sm:p-5 md:p-6 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 animate-slide-up ${
            isRecording ? 'bg-red-600 animate-pulse-custom' : 'bg-gradient-to-br from-rose-500 to-pink-500'
          } text-white hover:shadow-rose-500/50`}
          style={{ animationDelay: '0.6s' }}
        >
          {isRecording ? <MicOff size={window.innerWidth < 640 ? 24 : 30} /> : <Mic size={window.innerWidth < 640 ? 24 : 30} />}
        </button>
        <button
          onClick={replayLastMessage}
          title="Replay Last Message"
          className="p-4 sm:p-5 md:p-6 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/50 animate-slide-up"
          style={{ animationDelay: '0.7s' }}
        >
          <Repeat size={window.innerWidth < 640 ? 24 : 30} />
        </button>
        <Link
          to={`/playground/${randomString}`}
          className="p-4 sm:p-5 md:p-6 rounded-full shadow-2xl bg-gradient-to-br from-red-600 to-rose-500 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-red-500/50 animate-slide-up"
          title="Back to Chat"
          style={{ animationDelay: '0.8s' }}
        >
          <X size={window.innerWidth < 640 ? 24 : 30} />
        </Link>
      </div>

      <h2
        className={`mt-6 sm:mt-8 text-lg sm:text-xl md:text-2xl font-semibold transition-all duration-300 z-10 tracking-tight ${
          isRecording ? 'text-rose-400' : isSpeaking ? 'text-pink-500' : 'text-rose-200'
        }`}
      >
        {isRecording ? 'Lyra is listening...' : isSpeaking ? 'Lyra is speaking...' : 'Talk to Lyra!'}
      </h2>
    </div>
  );
}

const styles = `
  @keyframes float {
    0% { transform: translateY(0); }
    50% { transform: translateY(-2vh); }
    100% { transform: translateY(0); }
  }
  @keyframes pulse-slow {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @keyframes particle {
    0% { transform: translateY(0) scale(1); opacity: 0.3; }
    50% { transform: translateY(-10vh) scale(1.2); opacity: 0.5; }
    100% { transform: translateY(-20vh) scale(1); opacity: 0; }
  }
  @keyframes fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes slide-up {
    0% { transform: translateY(2vh); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-pulse-slow {
    animation: pulse-slow 4s ease-in-out infinite;
  }
  .animate-pulse-custom {
    animation: pulse 1s ease-in-out infinite;
  }
  .animate-slide-up {
    animation: slide-up 0.5s ease-out forwards;
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
  .particles {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .particle {
    position: absolute;
    border-radius: 50%;
    animation: particle 5s linear infinite;
  }
  .font-poppins {
    font-family: 'Poppins', sans-serif;
  }
`;

export default VoiceInterface;
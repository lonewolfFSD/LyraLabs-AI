import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Repeat, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function VoiceInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pitchData, setPitchData] = useState<number[]>(new Array(100).fill(128));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const geminiApiKey = "AIzaSyAKdITIR3GpQxLkUtf28rpoB9JVbiVzFBs";
    if (!geminiApiKey) {
      alert('Please provide a Gemini API key in the settings.');
      return;
    }

    const fullPrompt = `${lyraPrompt}\nUser says: "${text}"\nLyra responds:`;

    console.log('Full Prompt Sent to Gemini:', fullPrompt);

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

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-rose-950 p-8 overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ opacity: '1', filter: 'brightness(0.5) blur(10px)' }}
      >
        <source 
          src="https://motionbgs.com/media/1926/moonlit-bloom-cherry.960x540.mp4" 
          type="video/mp4" 
        />
        Your browser doesn’t support video—imagine some cool scenery here!
      </video>

      <div className="flex gap-8 mb-14 relative z-10">
        {/* Lyra’s Image (Left) */}
        <div className="relative">
          <img
            src="https://i.ibb.co/qLchMgnd/image.png"
            alt="Lyra"
            style={{
              width: '13rem',
              height: '13rem',
              borderRadius: '9999px',
              borderWidth: '4px',
              borderColor: '#f87171',
              transition: 'transform 0.5s',
              transform: `scale(${lyraScale})`,
            }}
            className="animate-slide-up"
          />
          {isSpeaking && (
            <Sparkles
              className="absolute top-2 left-2 text-rose-500 animate-float"
              size={60}
              fill="currentColor"
            />
          )}
        </div>

        {/* User’s Image (Right) */}
        <div className="relative">
          <img
            src="https://www.shutterstock.com/image-vector/profile-default-avatar-icon-user-600nw-2463844171.jpg"
            alt="User"
            style={{
              width: '13rem',
              height: '13rem',
              borderRadius: '9999px',
              borderWidth: '4px',
              borderColor: '#60a5fa',
              transition: 'transform 0.5s',
              transform: `scale(${userScale})`,
            }}
            className="animate-slide-up"
          />
          {isRecording && (
            <Mic
              className="absolute top-2 right-2 text-blue-200 animate-float"
              size={60}
            />
          )}
        </div>
      </div>

      <h1 className="text-2xl mb-4 mt-[-20px] text-pink-500">Real-Time Voice Synthesizer</h1>
      <div className="w-11/12 max-w-3xl h-48 mb-12 bg-white/30 border border-4 border-pink-300 backdrop-blur-md rounded-xl p-6 z-10 duration-300 animate-slide-up">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#f472b6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
            </linearGradient>
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
            mask="url(#fadeMask)"
            className="transition-all duration-300"
          />
        </svg>
      </div>

      <div className="flex items-center gap-6 z-10">
        <button
          onClick={toggleRecording}
          title={isRecording ? 'Stop Speaking' : 'Start Speaking'}
          style={{ animationDelay: '0.6s' }}
          className={`p-6 rounded-full shadow-xl transition-all duration-300 animate-slide-up ${
            isRecording ? 'bg-red-500 animate-pulse' : 'hover:bg-gradient-to-br from-rose-500 to-pink-400 bg-rose-500/80'
          } text-white`}
        >
          {isRecording ? <MicOff size={30} /> : <Mic size={30} />}
        </button>
        <button
          onClick={replayLastMessage}
          title="Replay Last Message"
          className="p-6 rounded-full shadow-xl bg-blue-600/80 hover:transform hover:bg-gradient-to-br from-blue-600/80 to-indigo-400 text-white transition-all duration-300 animate-slide-up"
        >
          <Repeat size={30} />
        </button>
        <Link
          to="/"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = "/";
          }}
          style={{ animationDelay: "0.8s" }}
          className="p-6 rounded-full shadow-xl bg-red-600/90 hover:bg-gradient-to-br from-red-600/80 to-rose-500 text-white transition-all duration-300 animate-slide-up"
          title="Back to Chat"
        >
          <X size={30} />
        </Link>
      </div>

      <h2
        className={`mt-7 text-2xl font-semibold transition-all duration-300 z-10 ${
          isRecording ? 'text-pink-500' : isSpeaking ? 'text-pink-600' : 'text-gray-800'
        }`}
      >
        {isRecording ? 'Lyra Listening...' : isSpeaking ? 'Lyra Speaking...' : ''}
      </h2>
    </div>
  );
}

const styles = `
  @keyframes float {
    0% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0); }
  }
  @keyframes float-delayed {
    0% { transform: translateY(0); }
    50% { transform: translateY(20px); }
    100% { transform: translateY(0); }
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-float-delayed {
    animation: float-delayed 8s ease-in-out infinite;
  }
  .animate-pulse-custom {
    animation: pulse 1s ease-in-out infinite;
  }
  .gradient-sparkles {
    fill: url(#sparkleGradient);
  }
`;

export default VoiceInterface;
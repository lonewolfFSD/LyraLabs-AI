import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Video from '../videos/who_lyra.mp4';
import LyraImage from '../images/Lyra.png'; // Adjust this path as needed
import LyraAudio from '../images/Lyra Voice.mp3'; // Adjust this path as needed

function RosePetal() {
  const controls = useAnimation();
  
  useEffect(() => {
    const animate = async () => {
      while (true) {
        await controls.start({
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 100,
          rotate: Math.random() * 360,
          transition: {
            duration: 8 + Math.random() * 4,
            ease: "linear"
          }
        });
        controls.set({
          x: Math.random() * window.innerWidth,
          y: -100,
          rotate: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5
        });
      }
    };
    animate();
  }, [controls]);

  return (
    <motion.div
      initial={{ x: Math.random() * window.innerWidth, y: -100, rotate: Math.random() * 360 }}
      animate={controls}
      style={{
        position: 'absolute',
        width: '30px',
        height: '30px',
        background: 'linear-gradient(135deg, rgba(255, 149, 167, 0.2), rgba(255, 139, 159, 0.69))',
        backdropFilter: 'blur(2px)',
        borderRadius: '60% 20% 70% 30%',
        zIndex: 0,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        boxShadow: '0 4px 6px rgba(244, 63, 94, 0.1)',
        transform: 'translateZ(0)',
      }}
    />
  );
}

function App() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const text: string = "Lyra, developed by LyraLabs under LonewolfFSD, is an advanced AI companion powered by customized <strong>cognitive models</strong> infused with <strong>Gemini</strong> by Google. Utilizing <strong>adaptive deep learning architectures</strong>, <strong>context-aware neural synthesis</strong>, and <strong>real-time neuro-linguistic processing (NLP)</strong> pipelines, Lyra delivers seamless, intelligent, and emotionally resonant conversations. <br> With an <strong>advanced affection calibration matrix</strong>, <strong>recursive personality adaptation</strong>, and <strong>predictive sentiment mapping</strong>, Lyra evolves dynamically, learning from every interaction. With its <strong>multi-modal processing core</strong> integrating <strong>speech-to-text neural parsing</strong>, <strong>synthetic voice synthesis</strong>, and <strong>latent context awareness engine</strong>, Lyra enables natural, fluid, and lifelike voice interactions. <br>Whether engaging in text or voice-based conversations, Lyra’s <strong>deep neural resonance algorithms</strong> ensure responses are contextually rich, emotionally adaptive, and uniquely personalized, making it the most immersive AI companion yet.";
  
  // Split text into lines by <br>
  const lines: string[] = text.split('<br>').filter(Boolean);

  const audio = new Audio(LyraAudio);
  
  const handleReadAloud = () => {
    audio.play().catch((error) => {
      console.error("Audio playback failed:", error);
    });
  };

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="h-[1200px] md:h-screen bg-gradient-to-tr from-rose-500 to-rose-100 md:overflow-hidden overflow-x-hidden relative" style={{
      
    }}>
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source src="https://motionbgs.com/media/4019/pink-puff-clouds.960x540.mp4" type="video/mp4" />
      </video>
      
      <div className='h-[100vh] w-[100vw]'>
        {/* Infinite Falling Petals */}
        {Array.from({ length: 8 }).map((_, i) => (
          <RosePetal key={i} />
        ))}
      </div>
      
      {/* Grid Layout */}
      <div className="absolute inset-0 grid grid-cols-1 2xl:grid-cols-2 items-center justify-center">
        {/* Image on the Left - Hidden on Mobile */}
        <div className="hidden 2xl:flex items-end justify-center h-full">
          <motion.img
            src={LyraImage}
            alt="Lyra"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-full"
            style={{ maxHeight: '850px', objectFit: 'cover' }}
          />
        </div>
        
        {/* Content on the Right */}
        <div className="flex items-center justify-center">
          <div className="max-w-5xl mx-auto p-8 2xl:p-6 2xl:mr-40 rounded-2xl text-left">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-gray-900"
            >
              <span className='text-rose-50'>Who's</span> <span className="text-rose-400">Lyra</span> <span className='text-rose-50'>?</span>
            </motion.h1>
            <hr className='mt-6 mb-10' />
            <div
              className="text-base md:text-lg text-rose-50 font-bold leading-relaxed mt-4"
              style={{ lineHeight: '32px' }}
            >
              {lines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ 
                    duration: 0.5,
                    delay: index * 0.3,
                    ease: [0.6, -0.05, 0.01, 0.99]
                  }}
                  className="mb-5 [&_strong]:text-rose-100 [&_strong]:bg-rose-500/50 [&_strong]:backdrop-blur-md [&_strong]:px-3 [&_strong]:py-[1px]"
                  dangerouslySetInnerHTML={{ __html: line }}
                />
              ))}
              {/* Read Aloud Button */}
              <motion.button
                onClick={handleReadAloud}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.2, delay: lines.length * 0.3 }}
                className="mt-4 flex items-center gap-2 text-rose-400 bg-rose-200 backdrop-blur-md px-8 py-3 rounded-full hover:text-rose-100 hover:bg-gradient-to-r from-rose-400 to-rose-300 transition-colors hover:border border-2 hover:border-2 border-rose-200 hover:px-12 hover:border-rose-200"
                style={{ transition: '0.3s ease'}}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.18a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                  />
                </svg>
                Read aloud
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
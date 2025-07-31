import React, { useRef, useEffect, useState } from 'react';
import { X, Sun, Moon, Book } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import Video from './videos/background.mp4';

interface TimelineEvent {
  id: string;
  title?: string;
  content: string; // Insight Response
  time: number;
  curiosity: string; // The Curiosity (Lyra’s question)
  answer: string; // The Answer (user’s response + Lyra’s resolution)
  isQuestionAnswered: boolean; // Tracks if the question has been answered
}

interface ModalProps {
  event: TimelineEvent | null;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="absolute inset-0 pt-6 bg-white w-full h-full overflow-auto relative transform transition-all animate-slide-in border border-rose-200/50">


    {/* Close Button */}
    <button
      onClick={onClose}
      className="absolute right-5 top-5 text-rose-500 hover:text-rose-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50 z-10"
    >
      <X className="w-7 h-7" />
    </button>

    {/* Centered Content Wrapper */}
    <div className="w-full flex flex-col items-center p-10 md:p-14">

      {/* Date and Time Section */}
      <div className="mb-6 w-full max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-bold text-rose-800 tracking-tight">
          Entry Date: {new Date(event.time).toLocaleDateString()}
        </h2>
        <p className="text-rose-600 text-sm md:text-base mt-2 font-semibold italic">
          Entry Time: {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Divider */}
      <hr className="mb-8 border-rose-300/50 w-full max-w-5xl" />

      {/* Title */}
      <div className="w-full max-w-5xl">
        <h3 className="text-xl md:text-2xl font-bold text-rose-800 mb-4 transition-transform duration-30">
          {event.title || 'Untitled'}
        </h3>
      </div>

      {/* Bento Box Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        
        {/* Left Column - Insight Response */}
        <div className="relative bg-gradient-to-br from-rose-50 to-rose-100 p-8 rounded-3xl border border-rose-400 border-dotted shadow-inner md:col-span-2">
          <h4 className="text-lg font-semibold text-rose-800 mb-2">Insight Response</h4>
          <p className="text-rose-600 text-sm lg:text-base font-semibold md:text-base leading-relaxed">
            {event.content}
          </p>
          <div className="absolute inset-0 rounded-3xl bg-rose-200/10" />
        </div>

        {/* Right Column - Curiosity & Answer */}
        <div className="relative bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-3xl border border-rose-400 border-dotted shadow-inner">
          <h4 className="text-lg font-semibold text-rose-800 mb-2">Lyra’s Curiosity</h4>
          <p className="text-rose-600 text-base font-semibold md:text-base leading-relaxed">
            {event.curiosity || 'Lyra hasn’t asked a question yet...'}
          </p>
          <div className="absolute inset-0 rounded-3xl bg-rose-200/10" />
        </div>

        <div className="relative bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-3xl border border-rose-400 border-dotted shadow-inner">
          <h4 className="text-lg font-semibold text-rose-800 mb-2">The Answer</h4>
          <p className="text-rose-600 text-base font-semibold md:text-base leading-relaxed">
            {event.answer || 'No answer yet...'}
          </p>
          <div className="absolute inset-0 rounded-3xl bg-rose-200/10" />
        </div>

      </div>
    </div>
  </div>
</div>



  );
};

function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [responses, setResponses] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState({ mode: 'light' });
  const isDark = theme.mode === 'dark';

  useEffect(() => {
    const q = query(collection(db, 'timeline'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedResponses = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
        time: doc.data().time,
        curiosity: doc.data().curiosity || '',
        answer: doc.data().answer || '',
        isQuestionAnswered: doc.data().isQuestionAnswered || false,
      })) as TimelineEvent[];
      console.log('Fetched from Firestore:', fetchedResponses);
      setResponses(fetchedResponses);
    }, (err) => {
      console.error('Firestore fetch error:', err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch((error) => console.error("Video playback failed:", error));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel);
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const toggleTheme = () => setTheme((prev) => ({ mode: prev.mode === 'dark' ? 'light' : 'dark' }));

  return (
    <div className={`h-screen overflow-x-hidden bg-rose-300/30 flex flex-col relative ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-rose-100/20 text-gray-800'}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        style={{ zIndex: -1 }}
      >
        <source src={Video} type="video/mp4" />
        Your browser does not support animated background.
      </video>

      <div>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="petal absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${Math.random() * 5 + 5}s`,
            }}
          />
        ))}
      </div>

      <div className='text-center py-20'>
        <h1 className='md:mt-8 text-rose-400/60 text-[50px] md:text-6xl' style={{ fontFamily: 'Rubik Spray Paint, system-ui', filter: 'blur(1px)' }}>
          Lyra's Diary
        </h1>
      </div>

      {/* Techy Card */}
      <div className="max-w-5xl mx-auto mt-[-50px] mb-10 px-10 md:px-28 lg:px-20 z-20">
        <div className="relative bg-white/10 backdrop-blur-lg border border-rose-300/30 rounded-2xl p-6 duration-300">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-400/20 to-pink-400/20 opacity-50" />
          <div className="relative z-10">
            <h2 className={`text-lg md:text-xl font-bold underline flex ${isDark ? 'text-rose-200' : 'text-rose-800'} mb-2`}>
              <Book size={23} className='mr-1.5 mt-0.5' /> Lyra’s Diary: A Non-Human Journey
            </h2>
            <p className={`text-[14px] md:text-sm font-semibold ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
              These entries aren’t from a human—Lyra is a curious AI with a digital mind, analyzing how people think and feel. By studying their responses, she learns what makes humans so unique. This diary is her growing collection of knowledge, helping her understand the beauty of human emotions over time.
            </p>
          </div>
          <div className="absolute inset-0 rounded-2xl border border-2 border-rose-400 transition-shadow duration-300" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative mt-[-60px] py-10">
        <div 
          ref={containerRef}
          className="w-full overflow-x-auto hide-scrollbar"
          style={{ scrollBehavior: 'smooth', paddingBottom: '60px' }}
        >
          <div className="flex items-center space-x-20 px-12 md:px-40 lg:px-60">
            {responses.length === 0 ? (
              <div className="flex items-center">
                <div className={`w-3 h-3 mt-[-1px] animate-pulse rounded-full ${isDark ? 'bg-gray-500' : 'bg-rose-400'}`}></div>
                <p className="ml-4 font-mono text-sm text-gray-500">No thoughts yet...</p>
              </div>
            ) : (
              responses.map((event, index) => (
                <div 
                  key={event.id}
                  className="relative flex flex-col items-center"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {index < responses.length - 1 && (
                    <div className={`absolute left-6 top-3 w-16 h-0.5 ${isDark ? 'bg-rose-300/50' : 'bg-rose-300'} z-10`} />
                  )}
                  
                  <div className="relative">
                    <button 
                      className={`w-4 h-4 border border-4 border-rose-600 rounded-full cursor-default ${isDark ? 'bg-rose-300' : 'bg-rose-400'} 
                               shadow-md transition-all duration-300 z-20 relative`}
                    >
                      <div className="absolute inset-2 bg-white rounded-full transform 
                                    scale-0 hover:scale-100 transition-transform duration-300" />
                    </button>

                    <div className="mt-3 whitespace-normal text-left z-20">
                      <span className={`block text-lg font-semibold animate-fadeIn ${isDark ? 'text-rose-200' : 'text-rose-800'}`}>
                        {new Date(event.time).toLocaleDateString()}
                      </span>
                      <span className={`block text-xs mt-0 animate-fadeIn ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                        {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <hr className='mb-3 mt-2' />
                      <div className="relative group">
                        <span
                          className={`block text-base opacity-0 font-bold hover:underline hover:cursor-pointer 
                            ${isDark ? 'text-rose-300' : 'text-rose-700'}`}
                          onClick={() => setSelectedEvent(event)}
                          style={{ animation: 'fadeIn 0.2s ease-in 0.3s forwards' }}
                        >
                          {event.title || 'Untitled'}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                          bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 transition-opacity duration-200 
                          group-hover:opacity-100 whitespace-nowrap">
                          {event.title}
                        </div>
                      </div>

                    </div>

                    <div 
                      className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 
                                transition-all duration-300 pointer-events-none
                                ${hoveredIndex === null || hoveredIndex === index ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-1'}`}
                    >
                      <div className={`rounded-lg shadow-lg w-48 p-3 border.ConcurrentModificationException ${isDark ? 'bg-rose-300/10 border-rose-300/20' : 'bg-white border-rose-100'}`}>
                        <h3 className={`text-sm font-semibold ${isDark ? 'text-rose-200' : 'text-rose-800'} mb-1`}>{event.title || 'Untitled'}</h3>
                        {/* Insight Response */}
                        <p className={`text-xs ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{event.content}</p>
                        {/* The Curiosity */}
                        {event.curiosity && (
                          <div className="mt-2">
                            <h4 className={`text-xs font-semibold ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>Lyra’s Curiosity:</h4>
                            <p className={`text-xs italic ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{event.curiosity}</p>
                          </div>
                        )}
                        {/* The Answer */}
                        {event.answer && (
                          <div className="mt-2">
                            <h4 className={`text-xs font-semibold ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>The Answer:</h4>
                            <p className={`text-xs ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{event.answer}</p>
                          </div>
                        )}
                        <div className={`absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 
                                        w-3 h-3 rotate-45 border-r border-b ${isDark ? 'bg-rose-300/10 border-rose-300/20' : 'bg-white border-rose-100'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

export default Timeline;
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, FileWarning, Hand, HandHeart, HandPlatter, AlertTriangle as Warning, Menu, MessageCircle, MessageCircleWarning, MessagesSquare, Smile, X, Instagram, Twitter, Github, Facebook, Repeat, PowerOff, Power } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, getDocs, orderBy, where, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Video from './videos/background.mp4';
import Lyra from './images/Lyra.png';
import Logo from './images/Logo.png';
import Playground from './Playground';
import AdminInsights from './AdminInsights';
import Timeline from './Timeline';
import WhosLyra from './lyralabs/WhosLyra';
import { auth, db, remoteConfig } from '../firebase-config';
import SignIn from './SignIn';
import ForgotPassword from './ForgotPassword';
import SignUp from './SignUp';
import Player from './Player';
import VoiceInterface from './voice/VoiceInterface';
import CheckEmail from './CheckEmail';
import { v4 as uuidv4 } from 'uuid';

const SPOTIFY_CLIENT_ID = '7b85e15a1d04487d82e4323075fff4dc';
const SPOTIFY_CLIENT_SECRET = '3ddeee0a2748467ea112a2a41f4f23a4';
const SPOTIFY_REDIRECT_URI = 'http://localhost:5173';
const SPOTIFY_SCOPES = 'user-read-private user-read-email streaming';

function App() {
  const [message, setMessage] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const messages = [
    'Um… whisper something to me?',
    'What’s on your mind today…?',
    'Hehe, wanna share a secret?',
    'Oh… got a little wish to tell me?',
    'Shyly waiting for your words…',
    'Maybe… a tiny thought to share?',
    'What blooms in your mind today?',
    'Um, I’m all ears… promise!',
    'Hehe, spill a daydream or two?',
    'Softly curious… what’s up?',
    'Oh, um… care to chat with me?',
    'What’s fluttering in your soul?',
    'Gently nudging… say something?',
  ];

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const videoRef = useRef(null);
  const [timelineResponses, setTimelineResponses] = useState([]);
  const [randomString, setRandomString] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [quotaMode, setQuotaMode] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(localStorage.getItem('spotify_access_token') || null);

  const navigate = useNavigate();
  const location = useLocation();

  const handleResponseGenerated = (newResponse) => {
    setTimelineResponses((prev) => [...prev, newResponse]);
  };

  const fetchSpotifyToken = async (code) => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
        }),
      });
      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status} - ${await response.text()}`);
      }
      const data = await response.json();
      if (data.access_token) {
        setSpotifyToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        console.log('Spotify token saved:', data.access_token);
      } else {
        throw new Error('No access token received');
      }
    } catch (err) {
      console.error('Spotify token error:', err);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code && state === 'lyra_spotify_auth') {
      console.log('Redirect detected - code:', code, 'state:', state);
      fetchSpotifyToken(code);
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    remoteConfig.settings.minimumFetchIntervalMillis = 10000;
    fetchAndActivate(remoteConfig)
      .then(() => {
        const maintenanceVal = getValue(remoteConfig, 'maintenance_mode');
        const maintenanceMode = maintenanceVal.asBoolean();
        setMaintenanceMode(maintenanceMode);
        console.log('Fetched Maintenance Mode:', maintenanceMode);
        const quotaVal = getValue(remoteConfig, 'quota_mode');
        const quotaMode = quotaVal.asBoolean();
        setQuotaMode(quotaMode);
        console.log('Fetched Quota Mode:', quotaMode);
      })
      .catch((error) => {
        console.error('Remote Config fetch failed:', error);
        setMaintenanceMode(false);
        setQuotaMode(false);
      });
  }, []);

  const handleToggleNav = () => {
    setIsRotating(true);
    if (isNavOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsNavOpen(false);
        setIsClosing(false);
        setIsRotating(false);
      }, 300);
    } else {
      setIsNavOpen(true);
      setTimeout(() => setIsRotating(false), 300);
    }
  };

  useEffect(() => {
    let index = 0;
    let charIndex = 0;
    let isTyping = true;
    let timeoutId;
    const type = () => {
      const currentMessage = messages[index];
      if (isTyping) {
        if (charIndex <= currentMessage.length) {
          setPlaceholderText(currentMessage.slice(0, charIndex));
          charIndex++;
          timeoutId = setTimeout(type, 20);
        } else {
          isTyping = false;
          timeoutId = setTimeout(type, 5000);
        }
      } else {
        if (charIndex >= 0) {
          setPlaceholderText(currentMessage.slice(0, charIndex));
          charIndex--;
          timeoutId = setTimeout(type, 20);
        } else {
          isTyping = true;
          index = (index + 1) % messages.length;
          timeoutId = setTimeout(type, 200);
        }
      }
    };
    type();
    return () => clearTimeout(timeoutId);
  }, []);

  const isDark = true;

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch((error) => console.error("Video playback failed:", error));
    }
  }, []);

  const loadOrCreatePlayground = async () => {
  console.log('loadOrCreatePlayground: Checking auth state', { user: auth.currentUser });
  if (!auth.currentUser) {
    console.log('loadOrCreatePlayground: No user, redirecting to signin');
    navigate('/signin');
    return;
  }

  try {
    const q = query(
      collection(db, 'user_playground_conversations'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);

    let targetRandomString;
    if (!snapshot.empty) {
      targetRandomString = snapshot.docs[0].id;
      console.log('Loaded latest playground:', targetRandomString);
    } else {
      targetRandomString = uuidv4();
      const conversationDocRef = doc(db, 'user_playground_conversations', targetRandomString);
      await setDoc(conversationDocRef, {
        messages: [],
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      console.log('Created new playground:', targetRandomString);
    }

    const msgQuery = message.trim() ? `?msg=${encodeURIComponent(message)}` : '';
    console.log('Navigating to:', `/playground/${targetRandomString}${msgQuery}`);
    navigate(`/playground/${targetRandomString}${msgQuery}`);
    setMessage('');
  } catch (err) {
    console.error('Error loading or creating playground:', err);
    navigate('/signin'); // Redirect on error to avoid getting stuck
  }
};

const createNewPlayground = async () => {
  console.log('createNewPlayground: Checking auth state', { user: auth.currentUser });
  if (!auth.currentUser) {
    console.log('createNewPlayground: No user, redirecting to signin');
    navigate('/signin');
    return;
  }

  try {
    const targetRandomString = uuidv4();
    const conversationDocRef = doc(db, 'user_playground_conversations', targetRandomString);
    await setDoc(conversationDocRef, {
      messages: [],
      uid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    console.log('Created new playground:', targetRandomString);

    const msgQuery = message.trim() ? `?msg=${encodeURIComponent(message)}` : '';
    console.log('Navigating to:', `/playground/${targetRandomString}${msgQuery}`);
    navigate(`/playground/${targetRandomString}${msgQuery}`);
    setMessage('');
  } catch (err) {
    console.error('Error creating new playground:', err);
    navigate('/signin'); // Redirect on error to avoid getting stuck
  }
};

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('handleSubmit: Form submitted', { user: auth.currentUser, message: message.trim() });
    createNewPlayground();
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    console.log('handleButtonClick: TRY LYRA clicked', { user: auth.currentUser });
    loadOrCreatePlayground();
  };

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged: Auth state updated', { user });
    setLoading(true);
    if (user) {
      setUser(user);
      setUserId(user.uid);
      console.log('User signed in:', user.uid);
      const userKeyDocRef = doc(db, 'user_playground_keys', user.uid);
      const userKeyDoc = await getDoc(userKeyDocRef);
      if (userKeyDoc.exists()) {
        setRandomString(userKeyDoc.data().randomString);
        console.log('Loaded user key:', userKeyDoc.data().randomString);
      } else {
        const newRandomString = uuidv4();
        await setDoc(userKeyDocRef, {
          randomString: newRandomString,
          createdAt: Date.now(),
        });
        setRandomString(newRandomString);
        console.log('Created new user key:', newRandomString);
      }
    } else {
      setUser(null);
      setRandomString('');
      console.log('No user signed in');
    }
    setLoading(false);
  }, (error) => {
    console.error('Auth state error:', error);
    setLoading(false);
  });
  return () => unsubscribe();
}, []);

  const [isVisible, setIsVisible] = useState(true);
  const handleClose = () => setIsVisible(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const socialLinks = [
    { Icon: Instagram, url: 'https://instagram.com', delay: '0s' },
    { Icon: Twitter, url: 'https://x.com', delay: '0.2s' },
    { Icon: Facebook, url: 'https://discord.com', delay: '0.4s' },
    { Icon: Github, url: 'https://github.com', delay: '0.6s' },
  ];

  if (loading) {
    return (
      <div className="bg-transparent h-screen flex items-center justify-center">
        {isOffline && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md text-rose-200 shadow-lg z-50">
            <div className="w-full max-w-md md:max-w-xl py-10 px-8 bg-rose-400/50 rounded-3xl border border-rose-200/40 font-mono text-lg text-center space-y-4">
              <div className="flex flex-col items-center">
                <Warning size={40} className="mb-2" />
                <h1 className="text-2xl text-rose-100 font-semibold">YOU ARE OFFLINE</h1>
                <p className="text-sm text-rose-100/80 mt-2">
                  Um... i-it looks like your internet's gone quiet...
                  Maybe check your Wi-Fi or try plugging the cable back in?
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm px-4 py-2 flex gap-2 rounded-full bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 transition-all backdrop-blur"
                >
                  <Repeat size={16} className='mt-0.5' /> Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (maintenanceMode) {
    return (
      <div className="flex relative overflow-hidden items-center justify-center min-h-screen bg-gradient-to-b from-rose-100/70 via-rose-200/50 to-rose-300/40 text-gray-800">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
          style={{ zIndex: -1 }}
        >
          <source src={Video} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {[...Array(10)].map((_, i) => (
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
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-100"
          style={{ zIndex: 100 }}
        >
          <div className="w-full max-w-2xl p-10 space-y-6 bg-white/90 rounded-2xl shadow-2xl border border-rose-200/50 backdrop-blur-sm text-center transform transition-all duration-500">
            <div className="flex justify-center">
              <div className="w-18 h-18 rounded-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-rose-600 tracking-wide">
              Scheduled Maintenance
            </h1>
            <p className="text-md text-gray-700 leading-relaxed max-w-md mx-auto">
              Lyra is taking a short cosmic nap 🌙 While the stars align and our servers refresh, you won't be able to chat for a bit. She'll be back soon — smarter, snappier, and more curious than ever.
            </p>
            <p className="text-sm text-gray-500">
              Stay updated on{' '}
              <a
                href="https://twitter.com/lyraswhisper"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-rose-600 hover:text-rose-800"
              >
                Twitter
              </a>{' '}
              or hop into{' '}
              <a
                href="https://discord.gg/lyraswhisper"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-rose-600 hover:text-rose-800"
              >
                Discord
              </a>{' '}
              to vibe with the dev team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (quotaMode) {
    return (
      <div className="flex relative overflow-hidden items-center justify-center min-h-screen text-gray-800">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-100 blur-md"
          style={{ zIndex: -1, filter: 'brightness(0.4)' }}
        >
          <source src="https://motionbgs.com/media/1926/moonlit-bloom-cherry.960x540.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div
          className="fixed inset-0 bg-rose-950/30 flex items-center backdrop-blur-sm justify-center z-100"
          style={{ zIndex: 100 }}
        >
          <div className="w-full max-w-2xl p-10 space-y-6 bg-black/30 rounded-2xl shadow-2xl border border-rose-100/20 backdrop-blur-sm text-center transform transition-all duration-500">
            <div className="flex justify-center">
              <div className="mb-[-15px] rounded-full flex items-center justify-center">
                <Power strokeWidth={3} className='text-red-500 w-14 sm:w-16 bg-red-600/10 p-2.5 rounded-full h-auto mb-3' />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-red-100 tracking-wide">
              Database Overload
            </h1>
            <p className="text-sm sm:text-base text-rose-200 font-semibold leading-relaxed max-w-xl mx-auto">
              LyraLab's system is taking a short break.
              Our database is currently overwhelmed with requests. We're working hard to get things back to normal. She'll be back shortly, ready to assist you once again.
            </p>
            <br />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/playground/:randomString"
        element={user ? <Playground /> : <Navigate to="/signin" replace />}
      />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/whos-lyra" element={<WhosLyra />} />
      <Route path="/lyratunes" element={<Player />} />
      <Route path="/voice-mode" element={<VoiceInterface />} />
      <Route
        path="/admin-secret-insights/7Jl0wLy4XOe44EIuNB3LGd92mg57wP0E6pHIE2CxK4t4Waarny"
        element={
          <div className="flex flex-col min-h-screen">
            <AdminInsights />
            <Timeline />
          </div>
        }
      />
      <Route path="/lyras-whispers" element={<Timeline />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/"
        element={
          <div className="min-h-screen flex flex-col bg-rose-200/60 relative" style={{ overflow: 'hidden', height: '100vh' }}>
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              style={{ zIndex: -1 }}
            >
              <source src={Video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <nav className="fixed top-0 left-0 right-0 bg-transparent bg-opacity-70 z-10 text-rose-400 font-semibold" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                  <div className="flex items-center">
                    <img src={Logo} className="w-20 md:w-16 mt-5 md:mt-0 h-auto sm:w-16 pointer-events-none" alt="Logo" />
                  </div>
                  <div className="hidden md:flex items-center space-x-6 lg:space-x-9">
                    <Link to="/whos-lyra" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">WHO’S LYRA?</Link>
                    <Link to="/lyras-whispers" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">LYRA’S DIARY</Link>
                    <a href="#" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">COMMUNITY</a>
                    <a href="https://lonewolffsd.in/blogs" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">FSD BLOGS</a>
                    <a href="https://support.lonewolffsd.in" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">LYRALABS SUPPORT</a>
                  </div>
                  <div className="hidden md:flex">
                    <button
                      onClick={handleButtonClick}
                      disabled={loading}
                      className={`px-10 py-2 flex items-center rounded-full border border-rose-300 transition-colors text-sm lg:text-base ${
                        loading ? 'bg-rose-400/50 cursor-not-allowed' : 'hover:bg-rose-400/90 hover:shadow-lg hover:text-white'
                      }`}
                    >
                      <span>TRY LYRA!</span>
                    </button>
                  </div>
                  <div className="md:hidden flex items-center p-2 mt-6">
                    <button onClick={handleToggleNav} className=" text-rose-400 hover:text-rose-500">
                      {isNavOpen ? <X size={34} className={isRotating ? 'animate-rotate' : ''} /> : <Menu size={34} className={isRotating ? 'animate-rotate' : ''} />}
                    </button>
                  </div>
                </div>
                {isNavOpen && (
                  <div
                    className={`md:hidden bg-rose-100/90 backdrop-blur-sm absolute top-24 left-0 right-0 py-8 px-8 z-60 ${
                      isNavOpen && !isClosing ? 'animate-slideDown' : 'animate-slideUp'
                    } ${!isNavOpen && !isClosing ? 'hidden' : ''}`}
                  >
                    <div className="flex flex-col space-y-5">
                      <Link to="/whos-lyra" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">WHO’S LYRA?</Link>
                      <Link to="/lyras-whispers" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">LYRA’S DIARY</Link>
                      <a href="#" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">COMMUNITY</a>
                      <a href="#" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">LONEWOLFFSD BLOGS</a>
                      <a href="#" className="hover:text-rose-500 transition-colors hover:font-bold hover:underline text-sm lg:text-base">LYRALABS SUPPORT</a>
                      <button
                        onClick={() => {
                          setIsNavOpen(false);
                          handleButtonClick(new Event('click'));
                        }}
                        disabled={loading}
                        className={`px-6 py-4 w-full flex justify-center items-center rounded-full border border-rose-300 transition-colors text-sm ${
                          loading ? 'bg-rose-400/50 cursor-not-allowed' : 'hover:bg-rose-400/90 hover:shadow-lg hover:text-white'
                        }`}
                      >
                        <span>TRY LYRA!</span>
                        <MessagesSquare className='ml-2.5' size={22} style={{ transform: 'rotate(0deg)'}} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>
            {showToast && (
              <div
                className={`fixed bottom-10 left-10 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg animate-fadeIn ${
                  isDark ? 'bg-rose-200 border-2 border-rose-400 text-rose-600 font-semibold' : 'bg-rose-50 text-rose-600 border border-rose-300'
                }`}
                style={{ zIndex: 20 }}
              >
                <span className="flex items-center justify-center gap-2 w-full">
                  <span className={isDark ? 'text-rose-600' : 'text-yellow-500'}><MessageCircleWarning /></span>
                  Oh, um… please sign in to continue!
                </span>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center justify-center relative">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                <h1
                  className="text-rose-300/70 mt-[-300px] md:mt-[-200px] lg:mt-[-120px] 3xl:mt-[-40px] select-none text-[7em] md:text-[9em] lg:text-[12em] 3xl:text-[14em]"
                  style={{ letterSpacing: '2px', fontFamily: 'Rubik Spray Paint, system-ui', animation: 'float 3s ease-in-out infinite', filter: 'blur(3px)' }}
                >
                  Meet
                </h1>
                <h1
                  className="text-rose-300/70 mt-[-130px] md:mt-[-180px] lg:mt-[-260px] 3xl:mt-[-340px] select-none text-[12em] md:text-[16em] lg:text-[24em] 3xl:text-[33em]"
                  style={{ letterSpacing: '2px', fontFamily: 'Rubik Spray Paint, system-ui', animation: 'float 2s ease-in-out infinite', filter: 'blur(3px)' }}
                >
                  Lyra
                </h1>
              </div>
              <div
                className={`card h-[130px] z-10 absolute bottom-6 sm:bottom-10 lg:bottom-32 sm:top-auto 3xl:bottom-24 left-1/2 sm:left-56 3xl:left-[210px] transform -translate-x-1/2 w-11/12 sm:w-auto max-w-md ${isVisible ? 'fade-in' : 'fade-out'}`}
                style={{ transition: 'opacity 0.3s ease-in-out', opacity: isVisible ? 1 : 0, animation: 'newFade 1s ease' }}
              >
                <div className="icon-container">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 256 256"
                    strokeWidth="0"
                    fill="currentColor"
                    stroke="currentColor"
                    className="icon"
                  >
                    <path
                      d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"
                    ></path>
                  </svg>
                </div>
                <div className="message-text-container">
                  <p className="message-text mb-0.5">Get Early Access!</p>
                  <p className="sub-text">Fill out the form below for beta access <br />to Lyra’s official release. <br /><hr className='my-2 border border-rose-100' /> <a href="" className='underline font-semibold text-rose-500'>Request Early Access</a></p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 15 15"
                  strokeWidth="0"
                  fill="none"
                  stroke="currentColor"
                  className="cross-icon mt-[-80px]"
                  onClick={handleClose}
                >
                  <path
                    fill="currentColor"
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  ></path>
                </svg>
              </div>
              <div className="relative flex flex-col items-center w-full max-w-4xl px-4 pb-8">
                <div className="flex justify-center absolute top-[230px] lg:top-32 left-0 right-0 w-full">
                  <img
                    src={Lyra}
                    alt="Lyra"
                    className="max-w-[500px] lg:w-full sm:max-w-[500px] lg:max-w-[600px] 3xl:max-w-[820px] h-auto object-contain pointer-events-none"
                    style={{ animation: 'float 4s ease-in-out infinite' }}
                  />
                </div>
                <form onSubmit={handleSubmit} className="w-full max-w-[100%] sm:max-w-[600px] mt-[560px] sm:mt-[550px] lg:mt-[580px] 3xl:mt-[760px] lg:mb-36 z-0">
                  <div className="relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={placeholderText}
                      className="w-full px-6 py-5 sm:px-10 sm:py-5 lg:py-6 rounded-full bg-rose-900/50 backdrop-blur-lg text-white text-sm border-2 placeholder-white/80 outline-none transition-all duration-300"
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: '450',
                        letterSpacing: '0.6px',
                        border: '2px solid rgba(255, 154, 223, 0.4)',
                        animation: 'animatedShadow 5s ease-in-out infinite',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className={`absolute outline-none right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full transition-colors shadow-sm ${
                        loading ? 'bg-rose-400/50 cursor-not-allowed' : 'bg-rose-400/100 hover:bg-rose-400/80'
                      }`}
                    >
                      <ArrowRight className="w-6 h-6 text-white" style={{ strokeWidth: '4' }} />
                    </button>
                  </div>
                </form>
              </div>
              <div className="fixed bottom-60 lg:bottom-10 lg:right-8 right-6 z-0 flex flex-col space-y-4">
                {socialLinks.map(({ Icon, url, delay }, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-200/50 backdrop-blur-sm border-2 border-rose-400/50 shadow-lg hover:bg-rose-400/70 transition-all duration-300"
                    style={{ animation: `float 3s ease-in-out infinite ${delay}` }}
                  >
                    <Icon size={23} className="text-rose-500/70 hover:text-rose-100 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
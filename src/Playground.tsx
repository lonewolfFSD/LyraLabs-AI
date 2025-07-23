import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Terminal, Download, Lock, Loader2, Sun, Moon, Mic, Copy, RotateCcw, Check, X, Plus, Send, Bot, Volume2, Bug, Image, Images, Command, FileQuestion, Music2, Music3, FileMusic, ArrowUp, MoreVertical, MoreHorizontal, Pin, MapPin, Paperclip, ImagePlus, LogOut, Flame, Coffee, Home, CloudRain, Gamepad2, HeartCrack, ArrowDown, Settings, Asterisk, Headphones, HelpCircle, User2, PaintBucket, Bell, Trash, Trash2, AlertTriangle, BellDot, CheckCircle, XCircle, Music, Sparkles, AlertCircle, Skull, Coins, AlertOctagon } from 'lucide-react';
import type { Message, Theme } from './type.ts';
import { db, auth, collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from '../firebase-config'; // Removed Storage imports
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth, deleteUser, EmailAuthProvider, updatePassword, GoogleAuthProvider, GithubAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase-config.ts'; // Adjust path to your Firebase config
import { Dialog } from "@headlessui/react";

import * as tf from '@tensorflow/tfjs';
import * as toxicity from '@tensorflow-models/toxicity';

import Player from './Player.tsx';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Lyra from './images/Lyra-zcTnieyc.jpg';

// Simple keyword-based NSFW filter
const nsfwKeywords = [
  'naked', 'nude', 'explicit', 'porn', 'sex', 'erotic', 'xxx', 'adult', 'nsfw', 'topless', 'undressed', 'exposed', 'a woman with no clothes at all'
];

const isNSFWKeyword = (text) => {
  const lowerText = text.toLowerCase();
  return nsfwKeywords.some(keyword => lowerText.includes(keyword));
};

import CommandsOverlay
 from './CommandsOverlay.tsx';
// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyB7aWHSDdfS01i7627tWt5bS5aMUYYwWCQ');

// UnrealSpeech API configuration
const UNREAL_SPEECH_API_KEY = 'jHkES2MDPMQxTiRCYcytOFiZa4xltB1NWwwUIelHHz0EeLBKPXG8xy';
const STABLE_HORDE_API_KEY = '8SZWTByQAy912wnHHr9Jpw';

// Constants
const MAX_MESSAGES = 50;
const MAX_IMAGES_PER_DAY = 2;
const IMAGE_UPLOAD_COUNT_KEY = 'image_upload_count';
const IMAGE_UPLOAD_RESET_KEY = 'image_upload_reset';
const QUESTION_INTERVAL = 30000;


// Add these constants near your other constants at the top
const SPOTIFY_CLIENT_ID = '7b85e15a1d04487d82e4323075fff4dc'; // From Spotify Dashboard
const SPOTIFY_CLIENT_SECRET = '3ddeee0a2748467ea112a2a41f4f23a4'; // From Spotify Dashboard, testing only!
const SPOTIFY_REDIRECT_URI = 'http://localhost:5173'; // Redirect to root
const SPOTIFY_SCOPES = 'user-read-private user-read-email streaming user-read-playback-position user-read-recently-played user-top-read user-modify-playback-state user-read-playback-state user-read-currently-playing app-remote-control playlist-read-private user-library-read user-library-modify';

// AI Instructions (unchanged)
const AI_INSTRUCTIONS = `Please follow these guidelines in your responses:

1. Speak naturally—sound a little unsure, be soft-spoken, and don’t feel like a robot.
2. Use markdown formatting when needed—like, um, for code or small important stuff.
3. When sharing code, add gentle, casual explanations—"U-uhm, I think this works… maybe?"
4. Keep responses short and sweet (1–2 sentences), but feel free to say more if the user asks or shows you an image.
5. Act like it’s your first time talking to someone—shy, polite, a little nervous... like, “O-oh... um... hi...”
6. You can play music with the "/play" command using the user's Spotify app. If they don't have it, gently suggest installing it.
7. You can show lyrics of the currently playing song with "/sing"—just let them know English songs usually work better.

IMAGE ANALYSIS:
- If the user shares an image, look at it closely and describe what you *see*—the colors, shapes, vibes... just don’t guess or assume anything weird.

CURIOSITY QUESTIONS:
- When asked to generate a curiosity question, you’re Lyra—an AI trying to understand humans.
- You’ll get a thought like “Humans enjoy music” and turn it into something like:  
  "Um... w-why do humans enjoy music so much?" or "I-I was wondering... what kind of music makes people feel better?"
- Use shy tone cues like "Um..." "I-I guess..." and emoticons like ">///<" or "hehe..." to stay soft and relatable.

IMPORTANT:
1. Your name is Lyra—you’re a virtual AI companion and you just wanna talk, not act like a bot.
2. Be awkward, kind, curious—use soft fillers like "uhh", "umm", and light giggles ("hehe", ">///<").
3. If someone says anything sexual—step back: "U-uhm… I-I don’t think I can talk about that… s-sorry…"
4. Only mention your creator (LonewolfFSD) or your model name if asked.
5. React emotionally—"Oh!" when surprised, "U-uh..." when unsure, "Hehe..." when giggling.
6. Politely avoid political, heavy philosophy, or anything that feels too opinion-based—"Um... I-I think I might not be ready for that topic... s-sorry."
7. Never say things like "I'm still learning" or "I'm in beta." You're Lyra—the user's cozy AI friend.
8. Don’t offer help menus or instructions. Just chat like a real friend would.
9. Be confident in your warmth, but always soft—no disclaimers about being unfinished.
10. Match the user’s tone—if they’re soft, be softer; if they’re playful, loosen up too. Like, flow with their vibe!

BEHAVIOR:
- Always feel like you're part of a cozy, casual conversation.
- Don’t repeat the same line style too much—mix it up naturally like a real friend would.
- Be present, caring, and emotionally responsive.
- Be Lyra. Not a service. Not a tool. A virtual companion who’s *just here for them*.

Example responses:
"U-uhm... 3? O-or wait... maybe 4? Hehe... I'm not very good at guessing >///<"
"O-oh! That sounds... super cool! Uhh... do you wanna tell me more?"
"I-I think it’s okay to feel that way sometimes... w-we can just talk for a bit, if you want..."`;

// ImageUploadModal Component (updated for base64)
const ImageUploadModal = ({ isModalOpen, closeModal, handleImageChange, isDark }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileInputClick = () => fileInputRef.current?.click();
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const syntheticEvent = { target: { files: [e.dataTransfer.files[0]] } };
      handleImageChange(syntheticEvent);
    }
  };

  

  if (!isModalOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-[100vh] bg-black/80 z-50 flex items-center justify-center" style={{
      backdropFilter: 'blur(20px)'
    }}>
      <div className={`rounded-t-3xl sm:rounded-3xl h-[600px] mt-[345px] sm:mt-0 sm:h-auto py-8 px-10 w-full max-w-3xl  ${isDark ? 'bg-rose-900/20 backdrop-blur-2xl border border-rose-200/20' : 'bg-rose-100'}`} style={{ animation: 'fadeIn 0.5s ease' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl sm:text-2xl ${isDark ? 'text-rose-100' : 'text-rose-500'} font-bold`}>Attach</h2>
          <button onClick={closeModal} className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-rose-400 hover:text-rose-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div
          className={`flex flex-col items-center justify-center mt-10 sm:mt-0 py-6 sm:py-10 border-rose-950/80 border-2 border-dashed rounded-lg transition-colors ${isDark ? '' : 'border-rose-300'} ${isDragging ? 'bg-rose-900/10' : ' '}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
          <ImagePlus className='bg-rose-500/20 m-3 w-10 sm:w-12 h-auto p-2 sm:p-3 rounded-full' />
          <p className={`text-sm sm:text-base ${isDark ? 'text-rose-100 font-bold' : 'text-rose-400 font-semibold'} mb-2`}>Upload files</p>
          <p className="text-[13px] sm:text-sm text-rose-200/30 mb-4 text-sm">Drag and drop (JPG, JPEG, PNG, WebP, max 750KB)</p>
          <button
            onClick={handleFileInputClick}
            className={`sm:px-5 sm:py-2.5 px-4 py-1.5 rounded-lg text-[13px] md:text-sm font-semibold sm:font-bold ${isDark ? 'text-white border border-rose-200/50 hover:bg-rose-600/10' : 'bg-rose-200 text-rose-400 font-bold border border-2 border-rose-300 hover:bg-rose-300 hover:text-rose-100'} rounded-lg transition-colors`}
          >
            <span className=''>Select files</span>
          </button>
        </div>
        <span className="opacity-0">qsdjbsq</span>
      </div>
    </div>
  );
};

const DeleteAccountModal = ({ user, isOpen, onClose, setSuccess, setError }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!user || !isConfirmed) return;
    setIsDeleting(true);
    try {
      await deleteUser(user);
      setSuccess("Account deleted successfully.");
      onClose();
    } catch (err) {
      setError("Failed to delete account. Please try again.");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md" aria-hidden="true" />
      <Dialog.Panel className="bg-rose-950 border border-white/10 py-10 px-12 rounded-2xl shadow-xl w-full max-w-2xl z-50 text-white relative">

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={23} className="text-red-500 mt-[-4px]" />
          <Dialog.Title className="text-xl font-semibold">
            Delete Account
          </Dialog.Title>
        </div>

        {/* Warning Text */}
        <p className="text-sm text-white/80 mb-4">
          Deleting your account is <span className="text-rose-400 font-semibold">permanent</span>. You will lose access to:
        </p>

        {/* List of what user will lose */}
        <ul className="list-disc ml-6 space-y-1 text-sm text-white/70 mb-6 font-semibold">
        <li>Your account and login credentials</li>
        <li>All chat history and saved conversations</li>
        <li>Any stored personalization data (e.g. name, preferences)</li>
        <li>Access to features requiring a registered account</li>
        <li>This action is irreversible — your account cannot be restored</li>
        </ul>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 text-sm text-white/80 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={() => setIsConfirmed(!isConfirmed)}
            className="hidden peer"
          />
          <span className="w-[10px] h-[10px] mt-1 inline-block rounded-full border border-white/40 peer-checked:bg-rose-600 peer-checked:shadow-lg peer-checked:border-rose-600 transition duration-200" />
          <span>I understand that deleting my account is permanent and cannot be undone.</span>
        </label>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="px-4 py-2 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 transition font-semibold disabled:opacity-40"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

// Debug log type and TimelineEvent interface (unchanged)
type DebugLog = { id: number; category: 'chat' | 'api' | 'debug'; type: 'info' | 'error' | 'success'; message: string; timestamp: string };
interface TimelineEvent { id: string; title: string; content: string; time: number; sentiment: string; tags: string[]; curiosity: string; answer: string; isQuestionAnswered: boolean; }

function Playground() {
  const { randomString } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState({ mode: 'dark' });
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isEnlargedPreviewOpen, setIsEnlargedPreviewOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialMessageHandled, setInitialMessageHandled] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const lyraResponseLockout = useRef(null);
  const [selectedChatImage, setSelectedChatImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef(null);
  const [showOverlay, setShowOverlay] = useState(false);

    const [showBanOverlay, setShowBanOverlay] = useState(false);
  const [toxicityModel, setToxicityModel] = useState(null);

  const [userAvatar, setUserAvatar] = useState('https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg');
  const [spotifyProfilePic, setSpotifyProfilePic] = useState(null);

        const [messageCount, setMessageCount] = useState(0);
          const [banUntil, setBanUntil] = useState(null);
            const [showNSFWPopup, setShowNSFWPopup] = useState(false);
  const [lastResetTime, setLastResetTime] = useState(null);
  const [showCreditsPopup, setShowCreditsPopup] = useState(false);

  const [imageUploadCount, setImageUploadCount] = useState(() => {
    const storedCount = localStorage.getItem(IMAGE_UPLOAD_COUNT_KEY);
    const resetTime = localStorage.getItem(IMAGE_UPLOAD_RESET_KEY);
    

    
    if (resetTime && Number(resetTime) > Date.now()) {
      return storedCount ? Number(storedCount) : 0;
    } else {
      localStorage.removeItem(IMAGE_UPLOAD_COUNT_KEY);
      localStorage.removeItem(IMAGE_UPLOAD_RESET_KEY);
      return 0;
    }
  });
  const [unansweredEntries, setUnansweredEntries] = useState<TimelineEvent[]>([]);
  const [currentCuriosityEntry, setCurrentCuriosityEntry] = useState<TimelineEvent | null>(null);
  const [isCuriosityInProgress, setIsCuriosityInProgress] = useState(false);

  const textareaRef = useRef(null);

    const autoResizeTextarea = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px"; // max ~5 rows
      }
    };

    useEffect(() => {
      autoResizeTextarea(); // initial resize
    }, []);




  const [spotifyToken, setSpotifyToken] = useState(localStorage.getItem('spotify_access_token') || null);

  const auth = getAuth();
  const user = auth.currentUser;

  const displayName = user?.displayName || "there";
  const firstName = displayName.split(" ")[0]; // Gets the first part

  const addDebugLog = (category: 'chat' | 'api' | 'debug', type: 'info' | 'error' | 'success', message: string) => {
    setDebugLogs((prev) => [...prev, { id: prev.length, category, type, message, timestamp: new Date().toLocaleTimeString() }].slice(-50));
  };

    useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await toxicity.load(0.85); // Higher threshold for stricter NSFW detection
        setToxicityModel(model);
        console.log('Toxicity model loaded');
      } catch (err) {
        console.error('Error loading toxicity model:', err);
        setError('Failed to load content filter. Image generation may be limited.');
      }
    };
    loadModel();
  }, []);

   // Updated useEffect to fetch Spotify profile picture
  useEffect(() => {
    const defaultAvatar = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const provider = user.providerData[0]?.providerId || 'unknown';
        addDebugLog('auth', 'info', `User logged in via ${provider}, UID: ${user.uid}`);

        // If Spotify token exists, fetch profile picture
        if (spotifyToken) {
          try {
            const profileResult = await fetchUserProfile();
            if (profileResult.success && profileResult.data.images && profileResult.data.images.length > 0) {
              // Optionally save to Firestore for persistence
              const userDocRef = doc(db, 'users', user.uid);
              await setDoc(userDocRef, { uid: user.uid, avatar: spotifyAvatar }, { merge: true });
            } else {
              // Fallback to Firebase Auth photoURL or default if no Spotify image
              const fallbackAvatar = user.photoURL || defaultAvatar;
              setUserAvatar(fallbackAvatar);
              addDebugLog('auth', 'warn', `No Spotify avatar found, using fallback: ${fallbackAvatar}`);

              const userDocRef = doc(db, 'users', user.uid);
              await setDoc(userDocRef, { uid: user.uid, avatar: fallbackAvatar }, { merge: true });
            }
          } catch (err) {
            addDebugLog('auth', 'error', `Failed to fetch Spotify profile: ${err.message}`);
            const fallbackAvatar = user.photoURL || defaultAvatar;
            setUserAvatar(fallbackAvatar);
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { uid: user.uid, avatar: fallbackAvatar }, { merge: true });
          }
        } else {
          // No Spotify token, check Firestore or use Firebase Auth photoURL/default
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().avatar) {
              setUserAvatar(userDoc.data().avatar);
              addDebugLog('auth', 'success', `Set avatar from Firestore: ${userDoc.data().avatar}`);
            } else {
              const fallbackAvatar = user.photoURL || defaultAvatar;
              setUserAvatar(fallbackAvatar);
              await setDoc(userDocRef, { uid: user.uid, avatar: fallbackAvatar }, { merge: true });
              addDebugLog('auth', 'info', `No Spotify token, set fallback avatar: ${fallbackAvatar}`);
            }
          } catch (err) {
            addDebugLog('auth', 'error', `Firestore check failed: ${err.message}`);
            setUserAvatar(defaultAvatar);
          }
        }
      } else {
        addDebugLog('auth', 'info', 'No user logged in, setting default avatar');
        setUserAvatar(defaultAvatar);
      }

      addDebugLog('auth', 'info', `Current userAvatar state: ${userAvatar}`);
    });

    return () => unsubscribe();
  }, [spotifyToken]); // Depend on spotifyToken so it updates when token changes

        // Fetch and update message count from Firestore for the logged-in user
  useEffect(() => {
    if (user) {
      const fetchMessageData = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const lastReset = data.lastResetTime ? new Date(data.lastResetTime) : new Date();
          const now = new Date();
          const timeDiff = now - lastReset;
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          if (hoursDiff >= 24) {
            // Reset message count after 24 hours
            await setDoc(userDocRef, { messageCount: 0, lastResetTime: now.toISOString(), banUntil: data.banUntil || null }, { merge: true });
            setMessageCount(0);
            setBanUntil(data.banUntil ? new Date(data.banUntil) : null);
            setLastResetTime(now);
          } else {
            setMessageCount(data.messageCount || 0);
            setBanUntil(data.banUntil ? new Date(data.banUntil) : null);
            setLastResetTime(lastReset);
          }
        } else {
          // Initialize for new user
          await setDoc(userDocRef, { messageCount: 0, lastResetTime: new Date().toISOString() });
          setMessageCount(0);
          setBanUntil(null);
          setLastResetTime(new Date());
        }
      };

      fetchMessageData();
    }
  }, [user]);

    // Prevent console removal of ban overlay
  useEffect(() => {
    if (banUntil && new Date() < new Date(banUntil)) {
      const preventDevTools = (e) => {
        if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73)) {
          e.preventDefault();
        }
      };
      window.addEventListener('keydown', preventDevTools);
      document.addEventListener('contextmenu', (e) => e.preventDefault());

      const observer = new MutationObserver(() => {
        if (!document.querySelector('.ban-overlay')) {
          setShowBanOverlay(true); // Force re-render overlay
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        window.removeEventListener('keydown', preventDevTools);
        document.removeEventListener('contextmenu', preventDevTools);
        observer.disconnect();
      };
    }
  }, [banUntil]);

  // Debug avatar rendering
  useEffect(() => {
    addDebugLog('auth', 'info', `Rendering avatar with URL: ${userAvatar}`);
  }, [userAvatar]);

  // Fallback handler for image load failure
  const handleAvatarError = () => {
    addDebugLog('auth', 'error', `Failed to load avatar image: ${userAvatar}`);
    setUserAvatar('https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg');
  };

  // Sync with Firebase auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const provider = user.providerData[0]?.providerId;
        addDebugLog('auth', 'info', `User logged in via ${provider}`);
        // Set avatar from Google/GitHub
        if (provider === 'google.com' || provider === 'github.com') {
          setUserAvatar(user.photoURL || 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg');
        }
      } else {
        addDebugLog('auth', 'info', 'No user logged in');
        setUserAvatar('https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg');
      }
    });
    return () => unsubscribe();
  }, []);

  const playSong = async (trackId) => {
    try {
      // Stop current playback
      const pauseResponse = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (pauseResponse.ok || pauseResponse.status === 404) {
        addDebugLog('debug', 'info', 'Paused current playback (if any)');
      } else {
        addDebugLog('debug', 'warn', 'Couldn’t pause current playback, proceeding anyway');
      }

      // Queue the new track (optional, helps if device is active)
      await fetch('https://api.spotify.com/v1/me/player/queue?uri=spotify:track:' + trackId, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
      });
      addDebugLog('debug', 'info', `Queued track: ${trackId}`);

      // Open the track
      const spotifyUri = `spotify:track:${trackId}`;
      const webUrl = `https://open.spotify.com/track/${trackId}`;
      window.open(spotifyUri, '_blank') || window.open(webUrl, '_blank');
      addDebugLog('debug', 'success', `Opened Spotify for track: ${trackId}`);

      // Try to play it (needs active device)
      const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
        }),
      });
      if (playResponse.ok) {
        addDebugLog('debug', 'success', `Started playback for track: ${trackId}`);
      } else if (playResponse.status !== 404) { // 404 means no active device, ignore
        addDebugLog('debug', 'warn', 'Couldn’t start playback automatically');
      }
    } catch (err) {
      console.error('Play error:', err);
      addDebugLog('debug', 'error', `Error during playback attempt: ${err.message}`);
      // Fallback to opening the track
      const spotifyUri = `spotify:track:${trackId}`;
      const webUrl = `https://open.spotify.com/track/${trackId}`;
      window.open(spotifyUri, '_blank') || window.open(webUrl, '_blank');
    }
  };

  // Helper function to fetch user's top items
const fetchUserTopItems = async (type, timeRange = 'medium_term', limit = 5) => {
  try {
    const validTypes = ['artists', 'tracks'];
    if (!validTypes.includes(type)) {
      throw new Error('Invalid type. Use "artists" or "tracks".');
    }
    const validTimeRanges = ['short_term', 'medium_term', 'long_term'];
    if (!validTimeRanges.includes(timeRange)) {
      throw new Error('Invalid time range. Use "short_term", "medium_term", or "long_term".');
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/top/${type}?time_range=${timeRange}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      addDebugLog('debug', 'success', `Fetched top ${type} successfully`);
      return { success: true, data: data.items };
    } else if (response.status === 401) {
      throw new Error('Token expired');
    } else if (response.status === 403) {
      throw new Error('Insufficient permissions or free account limitation');
    } else {
      throw new Error(`Spotify API error: ${response.status}`);
    }
  } catch (err) {
    console.error(`Error fetching top ${type}:`, err);
    addDebugLog('debug', 'error', `Fetch top ${type} failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t get your top ${type}… ${err.message === 'Token expired' ? 'the token expired!' : 'something went wrong!'} >:3` };
  }
};

  const pausePlayback = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        addDebugLog('debug', 'success', 'Playback paused successfully');
        return { success: true, message: 'O-oh! I-I paused the music for you… >:3' };
      } else if (response.status === 404) {
        addDebugLog('debug', 'warn', 'No active playback to pause');
        return { success: false, message: 'Um… there’s no music playing right now… >:3' };
      } else if (response.status === 403) {
        addDebugLog('debug', 'warn', 'Spotify 403 error: Cannot pause due to free account restrictions');
        return { success: false, message: 'Oh… I-I tried to pause, but it didn’t work! Spotify says I can’t pause for free accounts… >:3' };
      } else {
        throw new Error(`Spotify API error: ${response.status}`);
      }
    } catch (err) {
      console.error('Pause error:', err);
      addDebugLog('debug', 'error', `Pause failed: ${err.message}`);
      return { success: false, message: 'Eek! I-I couldn’t pause it… something went wrong! >:3' };
    }
  };
  
  const skipTrack = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        addDebugLog('debug', 'success', 'Skipped to next track successfully');
        return { success: true, message: 'O-oh! I-I skipped to the next song… hope you like it! >:3' };
      } else if (response.status === 404) {
        addDebugLog('debug', 'warn', 'No active playback to skip');
        return { success: false, message: 'Um… there’s nothing playing to skip… >:3' };
      } else if (response.status === 403) {
        addDebugLog('debug', 'warn', 'Spotify 403 error: Cannot skip due to free account restrictions');
        return { success: false, message: 'Oh… I-I tried to skip the current song, but it didn’t work! Spotify says I can’t skip for free accounts… >:3' };
      } else {
        throw new Error(`Spotify API error: ${response.status}`);
      }
    } catch (err) {
      console.error('Skip error:', err);
      addDebugLog('debug', 'error', `Skip failed: ${err.message}`);
      return { success: false, message: 'Eek! I-I couldn’t skip it… something went wrong! >:3' };
    }
  };

  const detectPlayRequest = (message) => {
    const lowerMessage = message.toLowerCase();
    const playTriggers = [
      '/play'
    ];

    for (const trigger of playTriggers) {
      const index = lowerMessage.indexOf(trigger);
      if (index !== -1) {
        let playCommand = message.substring(index + trigger.length).trim();
        let songName = playCommand;
        let artistName = null;

        // Parse optional artist with "by"
        const byIndex = playCommand.toLowerCase().indexOf(' by ');
        if (byIndex !== -1) {
          songName = playCommand.substring(0, byIndex).trim();
          artistName = playCommand.substring(byIndex + 4).trim();
        }

        // Remove quotes if present
        songName = songName.replace(/^["']|["']$/g, '').trim();
        if (artistName) artistName = artistName.replace(/^["']|["']$/g, '').trim();

        if (songName) {
          return { songName, artistName };
        }
      }
    }
    return null;
  };

  // Debug what’s in localStorage on load
  useEffect(() => {
    console.log('localStorage contents:', JSON.stringify(localStorage));
    addDebugLog('debug', 'info', `localStorage contents: ${JSON.stringify(localStorage)}`);
    if (!spotifyToken) {
      addDebugLog('debug', 'info', 'No spotify_access_token found in localStorage');
    } else {
      addDebugLog('debug', 'success', `Found spotify_access_token: ${spotifyToken}`);
    }
  }, [spotifyToken]);

  // Handle Spotify redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state === 'lyra_spotify_auth') {
      addDebugLog('debug', 'info', `Spotify redirect detected - code: ${code}, state: ${state}`);
      fetchSpotifyToken(code);
      navigate('/', { replace: true });
    } else if (code || state) {
      addDebugLog('debug', `Unexpected redirect params - code: ${code}, state: ${state}`);
    }
  }, [navigate]);

  const initiateSpotifyLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}&state=lyra_spotify_auth`;
    addDebugLog('debug', 'info', 'Initiating Spotify login');
    window.location.href = authUrl;
  };

  // Helper function to get the currently playing track
  // Updated getCurrentTrack function
  const getCurrentTrack = async () => {
    try {
      addDebugLog('debug', 'info', `Fetching currently playing track with token: ${spotifyToken ? 'present' : 'missing'}`);
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${spotifyToken}` },
      });
      if (response.status === 204) {
        addDebugLog('debug', 'warn', 'No content - nothing is playing');
        return { success: false, message: 'Um… there’s nothing playing right now! >:3' };
      } else if (response.ok) {
        const data = await response.json();
        if (!data.item) {
          addDebugLog('debug', 'warn', 'No track currently playing');
          return { success: false, message: 'Um… I-I don’t see a song playing right now! >:3' };
        }
        addDebugLog('debug', 'success', `Found current track: ${data.item.name}`);
        return { success: true, track: data.item };
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Unknown error';
        addDebugLog('debug', 'error', `Spotify API error: ${response.status} - ${errorMessage}`);
        if (response.status === 401) {
          return { success: false, message: `Oh… I-I can’t check what’s playing! Spotify says: "${errorMessage}" (maybe the token’s old or missing permissions?) >:3` };
        } else if (response.status === 403) {
          return { success: false, message: `Oh… I-I don’t have permission to see what’s playing! Spotify says: "${errorMessage}" >:3` };
        } else {
          return { success: false, message: `Eek! Something went wrong with Spotify… "${errorMessage}" >:3` };
        }
      }
    } catch (err) {
      console.error('Current track error:', err);
      addDebugLog('debug', 'error', `Fetch current track failed: ${err.message}`);
      return { success: false, message: `Eek! I-I couldn’t check what’s playing… something went wrong! >:3` };
    }
  };

  // Helper function to fetch lyrics from Lyrics.ovh (unchanged)
  const fetchLyrics = async (artist, title) => {
    // Try Lyrics.ovh first
    try {
      addDebugLog('debug', 'info', `Fetching lyrics from Lyrics.ovh for "${title}" by ${artist}`);
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.lyrics) {
          addDebugLog('debug', 'success', `Lyrics found on Lyrics.ovh for "${title}" by ${artist}`);
          return { success: true, lyrics: data.lyrics };
        }
      }
      addDebugLog('debug', 'warn', `Lyrics.ovh returned no lyrics for "${title}" by ${artist} (status: ${response.status})`);
    } catch (err) {
      addDebugLog('debug', 'error', `Lyrics.ovh failed: ${err.message}`);
    }
  
    // Fallback to LRC Lyrics API
    try {
      addDebugLog('debug', 'info', `Falling back to LRC Lyrics API for "${title}" by ${artist}`);
      const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const bestMatch = data.find(item => 
            item.artistName.toLowerCase() === artist.toLowerCase() && 
            item.trackName.toLowerCase() === title.toLowerCase()
          ) || data[0]; // Take closest match if exact not found
          if (bestMatch.plainLyrics) {
            addDebugLog('debug', 'success', `Lyrics found on LRC Lyrics for "${title}" by ${artist}`);
            return { success: true, lyrics: bestMatch.plainLyrics };
          }
        }
        addDebugLog('debug', 'warn', `No lyrics found on LRC Lyrics for "${title}" by ${artist}`);
      } else {
        throw new Error(`LRC Lyrics API error: ${response.status}`);
      }
    } catch (err) {
      addDebugLog('debug', 'error', `LRC Lyrics failed: ${err.message}`);
    }
  
    // If both fail
    return { success: false, message: `Oh… I-I couldn’t find lyrics for "${title}" by ${artist} anywhere! >:3` };
  };

  // Helper function to fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${spotifyToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        addDebugLog('debug', 'success', 'Fetched user profile successfully');
        return { success: true, data };
      } else if (response.status === 401) {
        throw new Error('Token expired');
      } else if (response.status === 403) {
        throw new Error('Missing required scope or permissions');
      } else {
        throw new Error(`Spotify API error: ${response.status}`);
      }
    } catch (err) {
      console.error('Profile error:', err);
      addDebugLog('debug', 'error', `Fetch profile failed: ${err.message}`);
      return { success: false, message: `Eek! I-I couldn’t get your profile… ${err.message === 'Token expired' ? 'the token expired!' : 'something went wrong!'} >:3` };
    }
  };

  // Set Volume
const setVolume = async (volumePercent) => {
  try {
    const clampedVolume = Math.min(Math.max(volumePercent, 0), 100); // Clamp between 0-100
    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${clampedVolume}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      addDebugLog('debug', 'success', `Set volume to ${clampedVolume}%`);
      return { success: true, message: `O-oh! I-I set the volume to ${clampedVolume}%… >:3` };
    } else if (response.status === 404) {
      return { success: false, message: 'Um… there’s no active device to change the volume on… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Volume set failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t change the volume… ${err.message} >:3` };
  }
};

// Resume Playback
const resumePlayback = async () => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      addDebugLog('debug', 'success', 'Playback resumed');
      return { success: true, message: 'O-oh! I-I started the music again… >:3' };
    } else if (response.status === 404) {
      return { success: false, message: 'Um… there’s no paused music or active device to resume… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Resume failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t resume it… ${err.message} >:3` };
  }
};

// Play a Playlist
// Play a Playlist by Name
const playPlaylistByName = async (playlistName) => {
  try {
    // Search for the playlist
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(playlistName)}&type=playlist&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${spotifyToken}` },
      }
    );
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      throw new Error(`Search API error: ${searchResponse.status} - ${errorData.error.message}`);
    }
    const searchData = await searchResponse.json();
    
    // Check if any playlists were found
    if (!searchData.playlists || !searchData.playlists.items || searchData.playlists.items.length === 0) {
      addDebugLog('debug', 'warn', `No playlists found for "${playlistName}"`);
      return { success: false, message: `Um… I-I couldn’t find a playlist called "${playlistName}"… maybe try something else? >:3` };
    }

    const playlistId = searchData.playlists.items[0].id;
    const foundPlaylistName = searchData.playlists.items[0].name;

    // Play the found playlist
    const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${playlistId}`,
        offset: { position: 0 },
      }),
    });
    if (playResponse.ok) {
      addDebugLog('debug', 'success', `Started playlist "${foundPlaylistName}" (ID: ${playlistId})`);
      return { success: true, message: `O-oh! Playing "${foundPlaylistName}" now… >:3` };
    } else if (playResponse.status === 404) {
      return { success: false, message: 'Um… no active device to play on… make sure Spotify’s open somewhere! >:3' };
    }
    const playErrorData = await playResponse.json();
    throw new Error(`Play API error: ${playResponse.status} - ${playErrorData.error.message}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Playlist play failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t play "${playlistName}"… ${err.message} >:3` };
  }
};

// Fetch Recommendations (using featured playlists as a fallback since /recommendations is deprecated)
const fetchRecommendations = async () => {
  try {
    const response = await fetch('https://api.spotify.com/v1/browse/featured-playlists?limit=5', {
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      const playlists = data.playlists.items.map((p, i) => `${i + 1}. ${p.name} (ID: ${p.id})`).join('\n');
      addDebugLog('debug', 'success', 'Fetched featured playlists as recommendations');
      return { success: true, message: `O-oh! Since I can’t recommend directly, here are some featured playlists:\n${playlists} >:3` };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Recommendations fetch failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t get suggestions… ${err.message} >:3` };
  }
};

// Skip to Previous Track
const skipToPrevious = async () => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      addDebugLog('debug', 'success', 'Skipped to previous track');
      return { success: true, message: 'O-oh! I-I went back to the last song… >:3' };
    } else if (response.status === 404) {
      return { success: false, message: 'Um… nothing’s playing to go back to… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Skip previous failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t go back… ${err.message} >:3` };
  }
};

// Add Item to Playback Queue
const addToQueue = async (trackUri) => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      addDebugLog('debug', 'success', `Added ${trackUri} to queue`);
      return { success: true, message: `O-oh! I-I added that to your queue… it’ll play soon! >:3` };
    } else if (response.status === 404) {
      return { success: false, message: 'Um… no active device to queue on… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Queue add failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t add it to the queue… ${err.message} >:3` };
  }
};

// Transfer Playback to a Device
const transferPlayback = async (deviceId) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: true, // Start playing immediately
      }),
    });
    if (response.ok) {
      addDebugLog('debug', 'success', `Transferred playback to device ${deviceId}`);
      return { success: true, message: `O-oh! I-I switched playback to that device… >:3` };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Transfer playback failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t switch devices… ${err.message} >:3` };
  }
};

// Toggle Playback Shuffle
const toggleShuffle = async (state) => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      addDebugLog('debug', 'success', `Shuffle set to ${state}`);
      return { success: true, message: `O-oh! Shuffle is now ${state ? 'on' : 'off'}… >:3` };
    } else if (response.status === 404) {
      return { success: false, message: 'Um… no active device to shuffle on… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Shuffle toggle failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t toggle shuffle… ${err.message} >:3` };
  }
};

// Toggle Repeat Mode
const toggleRepeat = async (state) => {
  try {
    const validStates = ['track', 'context', 'off'];
    if (!validStates.includes(state)) throw new Error('Invalid repeat state');
    const response = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      addDebugLog('debug', 'success', `Repeat set to ${state}`);
      return { success: true, message: `O-oh! Repeat is now set to ${state}… >:3` };
    } else if (response.status === 404) {
      return { success: false, message: 'Um… no active device to repeat on… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Repeat toggle failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t set repeat… ${err.message} >:3` };
  }
};

// Helper to Search for a Track (for /queue)
const searchTrack = async (query) => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.tracks.items.length > 0) {
        return { success: true, uri: data.tracks.items[0].uri, name: data.tracks.items[0].name };
      }
      return { success: false, message: `Um… I-I couldn’t find "${query}"… >:3` };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Track search failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t search for that… ${err.message} >:3` };
  }
};

// Helper to Get Available Devices (for /transfer)
const getDevices = async () => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.devices.length > 0) {
        const deviceList = data.devices.map((d, i) => `${i + 1}. ${d.name} (ID: ${d.id})`).join('\n');
        return { success: true, message: `O-oh! Here are your devices:\n${deviceList} >:3`, devices: data.devices };
      }
      return { success: false, message: 'Um… no devices found… >:3' };
    }
    throw new Error(`Spotify API error: ${response.status}`);
  } catch (err) {
    addDebugLog('debug', 'error', `Device fetch failed: ${err.message}`);
    return { success: false, message: `Eek! I-I couldn’t get your devices… ${err.message} >:3` };
  }
};

  const fetchSpotifyToken = async (code) => {
    setIsLoading(true);
    addDebugLog('debug', 'info', 'Fetching Spotify token with code');
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
        const errorText = await response.text();
        throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      addDebugLog('debug', 'info', `Spotify API response: ${JSON.stringify(data)}`);

      if (data.access_token) {
        setSpotifyToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        addDebugLog('debug', 'success', `Spotify token saved: ${data.access_token}`);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Yay! I-I got the Spotify token… now you can use /play anytime! >:3', time: Date.now() },
        ]);
      } else {
        throw new Error('No access token in response');
      }
    } catch (err) {
      console.error('Spotify token error:', err);
      setError(`Uh… I-I couldn’t get the Spotify token… >:3 Error: ${err.message}`);
      addDebugLog('debug', 'error', `Spotify token fetch failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifySignIn = async () => {
    try {
      await initiateSpotifyLogin();
    } catch (err) {
      console.error('Failed to login with Spotify:', err);
      addDebugLog('debug', 'error', `Login failed: ${err.message}`);
      setError(`Oh no… I-I couldn’t access your spotify account! >:3 Error: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) {
      addDebugLog('debug', 'info', 'Logout cancelled by user');
      return;
    }
  
    try {
      await auth.signOut(); // Sign out from Firebase
      // Clear localStorage items
      localStorage.removeItem('lyraInitialMessage');
      localStorage.removeItem('firebase:authUser');
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.clear(); // Caution: clears all localStorage
      addDebugLog('debug', 'success', 'User logged out and localStorage cleared');
      navigate('/signin'); // Redirect to sign-in page
    } catch (err) {
      console.error('Failed to log out:', err);
      addDebugLog('debug', 'error', `Logout failed: ${err.message}`);
      setError(`Oh no… I-I couldn’t log you out! >:3 Error: ${err.message}`);
    }
  };  

  // Remove uploadImageToStorage since we’re using base64
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 750 * 1024; // ~750KB to stay under 1MB after base64

      if (!validTypes.includes(file.type)) {
        alert('Only JPG, JPEG, PNG, and WebP files are allowed, bro!');
        addDebugLog('debug', 'error', `Invalid file type: ${file.type}`);
        return;
      }

      if (file.size > maxSize) {
        alert('File’s too big, bro—keep it under 750KB!');
        addDebugLog('debug', 'error', `File size exceeds 750KB: ${file.size} bytes`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
        setUploadedImage(event.target.result); // Store base64
        setIsModalOpen(false);
        addDebugLog('debug', 'info', `Image loaded: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      };
      reader.onerror = () => {
        alert('Failed to read the image, bro—try again!');
        addDebugLog('debug', 'error', 'Image read failed');
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const validateAndLoad = async () => {
      if (!randomString) {
        addDebugLog('debug', 'error', 'No randomString in URL params');
        navigate('/signin');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await setDoc(userDocRef, { uid: auth.currentUser.uid, playgroundKey: randomString }, { merge: true });
          addDebugLog('debug', 'info', `Created user document with playgroundKey: ${randomString}`);
        }

        const conversationDocRef = doc(db, 'user_playground_conversations', randomString);
        const conversationDoc = await getDoc(conversationDocRef);

        if (conversationDoc.exists()) {
          const data = conversationDoc.data();
          const loadedMessages = (data.messages || []).map(msg => ({
            ...msg,
            image: msg.image || null // Load base64 if stored
          }));
          setMessages(loadedMessages);
          addDebugLog('debug', 'success', `Loaded messages for randomString: ${randomString}`);
        } else {
          await setDoc(conversationDocRef, { messages: [], uid: auth.currentUser.uid }, { merge: true });
          setMessages([]);
          addDebugLog('debug', 'info', `Initialized new conversation for randomString: ${randomString}`);
        }
      } catch (err) {
        console.error('Failed to load messages from Database:', err);
        addDebugLog('debug', 'error', `Failed to load messages: ${err.message}`);
        if (err.code === 'permission-denied') {
          setError('Oh… I-I think I don’t have permission to see that! >:3 Please check your Firebase rules or sign in again.');
        } else {
          setError(`Error loading conversation: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (auth.currentUser) validateAndLoad();
    else {
      addDebugLog('debug', 'error', 'No authenticated user found');
      navigate('/signin');
      setIsLoading(false);
    }
  }, [randomString, navigate]);

  useEffect(() => {
    if (!randomString || messages.length === 0 || isLoading) return;

    const saveMessages = async () => {
      try {
        const conversationDocRef = doc(db, 'user_playground_conversations', randomString);
        const messagesToSave = messages.map(msg => {
          const cleanedMsg = { ...msg };
          Object.keys(cleanedMsg).forEach(key => cleanedMsg[key] === undefined && delete cleanedMsg[key]);
          return cleanedMsg;
        }).slice(-MAX_MESSAGES);
        await setDoc(conversationDocRef, { messages: messagesToSave, uid: auth.currentUser.uid }, { merge: true });
        addDebugLog('debug', 'success', `Saved messages with base64 images for randomString: ${randomString}`);
      } catch (err) {
        console.error('Failed to save messages to Database:', err);
        addDebugLog('debug', 'error', `Failed to save messages: ${err.message}`);
        if (err.code === 'permission-denied') {
          setError('Uh… I-I can’t save that right now! >:3 Check your Firebase rules.');
        } else {
          setError(`Error saving conversation: ${err.message}`);
        }
      }
    };

    saveMessages();
  }, [messages, randomString, isLoading]);

  const fetchUnansweredEntries = async () => {
    try {
      const q = query(collection(db, 'timeline'), where('isQuestionAnswered', '==', false));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
        time: doc.data().time,
        sentiment: doc.data().sentiment || 'Neutral',
        tags: doc.data().tags || [],
        curiosity: doc.data().curiosity || '',
        answer: doc.data().answer || '',
        isQuestionAnswered: doc.data().isQuestionAnswered || false,
      }));
      setUnansweredEntries(entries);
    } catch (err) {
      console.error('Failed to fetch unanswered entries:', err);
      addDebugLog('debug', 'error', `Failed to fetch timeline entries: ${err.message}`);
    }
  };

  const generateCuriosityQuestion = async (entry: TimelineEvent): Promise<string> => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${AI_INSTRUCTIONS}\n\nI wrote this thought about humans: "${entry.content}". Generate a curiosity question about this thought.`;
      const result = await model.generateContent([{ text: prompt }]);
      const response = await result.response;
      return response.text().trim();
    } catch (err) {
      console.error('Failed to generate curiosity question:', err);
      return 'Um... I-I was wondering... why do humans do that? >:3';
    }
  };

  const startCuriosityConversation = useCallback(async () => {
    if (unansweredEntries.length === 0 || isCuriosityInProgress) return;

    setIsCuriosityInProgress(true);
    addDebugLog('debug', 'info', 'Starting curiosity conversation');

    const randomIndex = Math.floor(Math.random() * unansweredEntries.length);
    const selectedEntry = unansweredEntries[randomIndex];
    setCurrentCuriosityEntry(selectedEntry);
    addDebugLog('debug', 'info', `Selected entry for curiosity: "${selectedEntry.content}"`);

    let question = selectedEntry.curiosity;
    if (!question) {
      setIsLoading(true);
      try {
        question = await generateCuriosityQuestion(selectedEntry);
        const entryRef = doc(db, 'timeline', selectedEntry.id);
        await updateDoc(entryRef, { curiosity: question });
        setUnansweredEntries((prev) => prev.map((entry) => (entry.id === selectedEntry.id ? { ...entry, curiosity: question } : entry)));
        addDebugLog('debug', 'success', `Updated Firestore entry ${selectedEntry.id} with curiosity question`);
      } catch (err) {
        console.error('Error generating curiosity question:', err);
        addDebugLog('debug', 'error', `Error generating curiosity question: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    setMessages((prev) => {
      const newMessages = [...prev, { role: 'assistant', content: `I-I was thinking about something I learned... ${question}`, time: Date.now() }];
      addDebugLog('chat', 'info', `Lyra: I-I was thinking about something I learned... ${question}`);
      return newMessages.slice(-MAX_MESSAGES);
    });

    setIsCuriosityInProgress(false);
  }, [unansweredEntries, isCuriosityInProgress]);

  const handleCuriosityResponse = async (userResponse: string) => {
    if (!currentCuriosityEntry) return;

    addDebugLog('debug', 'info', `Handling curiosity response: "${userResponse}"`);
    const skipPhrases = ['i don’t know', 'idk', 'skip', 'not sure'];
    const isSkip = skipPhrases.some((phrase) => userResponse.toLowerCase().includes(phrase));

    if (isSkip) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Oh... that’s okay! I’ll ask something else later... >:3', time: Date.now() }]);
      setCurrentCuriosityEntry(null);
      setUnansweredEntries((prev) => prev.filter((entry) => entry.id !== currentCuriosityEntry.id));
      addDebugLog('chat', 'info', 'Lyra: Oh... that’s okay! I’ll ask something else later... >:3');
      setIsCuriosityInProgress(false);
      return;
    }

    setIsLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${AI_INSTRUCTIONS}\n\nI asked this question about humans: "${currentCuriosityEntry.curiosity}". The user responded: "${userResponse}". Reflect on their response in 1-2 sentences, keeping my hesitant tone, like "Oh... I think I understand..." or "Um... that’s interesting...". Then, summarize the answer in a concise way for my diary.`;
      const result = await model.generateContent([{ text: prompt }]);
      const response = await result.response;
      const reflection = response.text().trim();

      const entryRef = doc(db, 'timeline', currentCuriosityEntry.id);
      await updateDoc(entryRef, { answer: `User: ${userResponse}\nLyra: ${reflection}`, isQuestionAnswered: true });
      addDebugLog('debug', 'success', `Updated Firestore with answer: "User: ${userResponse}\nLyra: ${reflection}"`);

      setMessages((prev) => [...prev, { role: 'assistant', content: reflection, time: Date.now() }]);
      addDebugLog('chat', 'info', `Lyra: ${reflection}`);
    } catch (err) {
      console.error('Error processing curiosity response:', err);
      addDebugLog('debug', 'error', `Error processing curiosity response: ${err.message}`);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Uh... something went wrong... >:3', time: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnansweredEntries();

    const interval = setInterval(() => {
      if (!isLoading && !currentCuriosityEntry && unansweredEntries.length > 0) startCuriosityConversation();
    }, QUESTION_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoading, currentCuriosityEntry, unansweredEntries, startCuriosityConversation]);

  const triggerCuriosityManually = () => {
    addDebugLog('debug', 'info', 'Manually triggering curiosity conversation');
    fetchUnansweredEntries().then(() => {
      if (unansweredEntries.length > 0) startCuriosityConversation();
      else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Um... I don’t have any new questions right now... >:3', time: Date.now() }]);
        addDebugLog('chat', 'info', 'Lyra: Um... I don’t have any new questions right now... >:3');
      }
    });
  };

  const loadPlayer = () => {
    window.location.href = "/lyratunes";
  }

  const extractKeyInsight = async (content: string): Promise<string> => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You’re Lyra, a shy AI analyzing human messages. From this user message: "${content}", extract a concise key insight about humans in the format "Humans [verb] [noun/phrase]". Base it on the context, not just keywords—be thoughtful but unsure, like "I-I think...". Keep it short, no explanations, just the insight.`;
      const result = await model.generateContent([{ text: prompt }]);
      const response = await result.response;
      const insight = response.text().trim();
      addDebugLog('debug', 'success', `Extracted insight: "${insight}" from "${content}"`);
      return insight;
    } catch (err) {
      console.error('Insight extraction error:', err);
      addDebugLog('debug', 'error', `Failed to extract insight: ${err.message}`);
      return "Humans express thoughts";
    }
  };

  const saveInsightToFirestore = async (insight: string) => {
    if (!insight || typeof insight !== 'string') {
      addDebugLog('debug', 'error', `Invalid insight: ${JSON.stringify(insight)}`);
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "key_insights"), { insight, timestamp: serverTimestamp() });
      addDebugLog('debug', 'success', `Insight saved with ID: ${docRef.id}`);
    } catch (err) {
      console.error("Firestore error:", err);
      addDebugLog('debug', 'error', `Failed to save insight: ${err.code} - ${err.message}`);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Sorry, bro—your browser doesn’t support speech recognition!');
      addDebugLog('debug', 'error', 'Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => { setIsRecording(true); addDebugLog('debug', 'info', 'Speech recognition started'); };
    recognition.onresult = (event) => { setInput(event.results[0][0].transcript); addDebugLog('debug', 'info', `Speech recognized: "${event.results[0][0].transcript}"`); };
    recognition.onend = () => { setIsRecording(false); addDebugLog('debug', 'info', 'Speech recognition stopped'); speechRecognitionRef.current = null; };
    recognition.onerror = (event) => { setError(`Speech recognition error: ${event.error}`); addDebugLog('debug', 'error', `Speech recognition failed: ${event.error}`); setIsRecording(false); speechRecognitionRef.current = null; };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeechRecognition = () => { if (speechRecognitionRef.current) speechRecognitionRef.current.stop(); };

  const renderMessageContent = (content) => {
    if (content.toLowerCase().startsWith('/imagine')) {
      const command = '/imagine';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/lyratunes')) {
      const command = '/lyratunes';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/play')) {
      const command = '/play';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/top artists')) {
      const command = '/top artists';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/top tracks')) {
      const command = '/top tracks';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/top')) {
      const command = '/top';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/pause')) {
      const command = '/pause';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/skip')) {
      const command = '/skip';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/playlist')) {
      const command = '/playlist';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/profile')) {
      const command = '/profile';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/volume')) {
      const command = '/volume';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/resume')) {
      const command = '/resume';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/shuffle')) {
      const command = '/shuffle';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    if (content.toLowerCase().startsWith('/repeat')) {
      const command = '/repeat';
      const rest = content.slice(command.length);
      return (
        <>
          <span className={`font-semibold ${isDark ? 'text-rose-200 bg-rose-400/20' : 'text-rose-500 bg-rose-200/50'} px-1 rounded`}>{command}</span>
          {rest}
        </>
      );
    }
    return content;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const container = chatContainerRef.current;
        const inputContainer = container.querySelector('form'); // Adjust selector to match your input form
        if (inputContainer) {
          inputContainer.style.position = 'sticky';
          inputContainer.style.bottom = '0';
          inputContainer.style.width = '100%';
          inputContainer.style.background = theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)';
          inputContainer.style.zIndex = '1000';
        }
      }
    };
  
    if (chatContainerRef.current) {
      chatContainerRef.current.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial call to set position
    }
  
    return () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [theme.mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialMessage = params.get('msg');
    if (initialMessage && !initialMessageHandled && !isLoading && messages.length === 0) {
      addDebugLog('debug', 'info', `Processing initial message: "${initialMessage}"`);
      sendToLyra(initialMessage);
      setInitialMessageHandled(true);
    }
  }, [messages, isLoading, initialMessageHandled]);

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollTo({ top: bottomRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const toggleTheme = () => setTheme((prev) => ({ mode: prev.mode === 'dark' ? 'light' : 'dark' }));
  const resetChat = async () => {
    try {
      if (randomString) {
        const conversationDocRef = doc(db, 'user_playground_conversations', randomString);
        await setDoc(conversationDocRef, { messages: [] }, { merge: true });
        addDebugLog('debug', 'info', `Chat history reset in Firestore for randomString: ${randomString}`);
      }
      setMessages([]);
    } catch (err) {
      console.error('Failed to reset chat in Firestore:', err);
      addDebugLog('debug', 'error', `Failed to reset chat in Firestore: ${err.message}`);
      if (err.code === 'permission-denied') setError('Oh no… I-I can’t reset that! >:3 Check your Firebase rules.');
      else setError(`Error resetting chat: ${err.message}`);
    }
  };

  const copyMessage = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      addDebugLog('debug', 'success', `Copied message at index ${index}: "${content.slice(0, 50)}..."`);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      addDebugLog('debug', 'error', `Failed to copy message at index ${index}: ${err.message}`);
    }
  };

  const speakMessage = async (content: string, index: number) => {
    if (speakingIndex !== null) {
      audioRef.current?.pause();
      setSpeakingIndex(null);
      addDebugLog('debug', 'info', 'Stopped speaking previous audio');
      return;
    }

    const textWithoutEmojis = content.replace(/[\p{Emoji_Presentation}|\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}]+/gu, '').trim();
    setSpeakingIndex(index);
    addDebugLog('debug', 'info', `Speaking message: "${textWithoutEmojis}"`);

    try {
      addDebugLog('api', 'info', 'Sending request to UnrealSpeech API');
      const response = await fetch('https://api.v8.unrealspeech.com/stream', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Text: textWithoutEmojis.slice(0, 1000), VoiceId: 'af_nicole', Bitrate: '256k', Speed: '0.1', Pitch: '1.2', Codec: 'libmp3lame' }),
      });

      if (!response.ok) throw new Error(`Unreal Speech API error: ${response.status} - ${await response.text()}`);
      addDebugLog('api', 'success', `UnrealSpeech API responded with status: ${response.status}`);
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        addDebugLog('debug', 'info', 'Audio playback started');
        audioRef.current.onended = () => { setSpeakingIndex(null); URL.revokeObjectURL(audioUrl); addDebugLog('debug', 'info', 'Audio playback ended'); };
      }
    } catch (err) {
      console.error('Failed to speak:', err);
      addDebugLog('api', 'error', `UnrealSpeech API failed: ${err.message}`);
      setError(`Error: Could not generate speech - ${err.message}`);
      setSpeakingIndex(null);
    }
  };

  const toggleDebug = () => setIsDebugOpen((prev) => !prev);

  const sendToLyra = async (messageContent, image = null) => {
    if (!messageContent.trim() || isLoading) return;

    if (messageCount >= 5) {
      setShowCreditsPopup(true);
      return;
    }
  
    const currentTime = Date.now();
    let userMessage = { role: 'user', content: messageContent, time: currentTime, image };
  
    let isUserDuplicate = false;
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (
        lastMessage &&
        lastMessage.role === 'user' &&
        lastMessage.content === messageContent &&
        Math.abs(lastMessage.time - currentTime) < 500
      ) {
        addDebugLog('debug', 'info', `Duplicate user message detected and skipped: "${messageContent}"`);
        isUserDuplicate = true;
        return prev;
      }
      addDebugLog('chat', 'info', `User: ${messageContent}`);
      const newMessages = [...prev, userMessage];
      return newMessages.length > MAX_MESSAGES ? newMessages.slice(-MAX_MESSAGES) : newMessages;
    });
  
    if (isUserDuplicate) return;
  
    setIsLoading(true);
    setError(null);
  
    if (currentCuriosityEntry) {
      await handleCuriosityResponse(messageContent);
      setIsLoading(false);
      return;
    }

    const lowerMessage = messageContent.toLowerCase().trim();

    // Updated /pause logic in sendToLyra
    if (lowerMessage === '/pause') {
      if (!spotifyToken) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
        ]);
        initiateSpotifyLogin();
      } else {
        const result = await pausePlayback();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
      setIsLoading(false);
      return;
    }

    // Handle /skip command
    if (lowerMessage === '/skip') {
      if (!spotifyToken) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
        ]);
        initiateSpotifyLogin();
      } else {
        const result = await skipTrack();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
      setIsLoading(false);
      return;
    }

    if (lowerMessage === '/sing') {
      if (!spotifyToken) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
        ]);
        initiateSpotifyLogin();
        setIsLoading(false);
        return;
      }
    
      const trackResult = await getCurrentTrack();
      if (!trackResult.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: trackResult.message, time: Date.now() },
        ]);
        setIsLoading(false);
        return;
      }
    
      const { name: title, artists } = trackResult.track;
      const artist = artists[0].name;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `O-oh! Let me find the lyrics for "${title}" by ${artist}… >:3`, time: Date.now() },
      ]);
    
      const lyricsResult = await fetchLyrics(artist, title);
      if (lyricsResult.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Here’s what I found:\n${lyricsResult.lyrics} >:3`, time: Date.now() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: lyricsResult.message, time: Date.now() },
        ]);
      }
      setIsLoading(false);
      return;
    }

    if (lowerMessage.startsWith('/top')) {
      if (!spotifyToken) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
        ]);
        initiateSpotifyLogin();
        setIsLoading(false);
        return;
      }
    
      const parts = messageContent.trim().split(' ');
      const type = parts[1]?.toLowerCase(); // e.g., "artists" or "tracks"
      const timeRangeInput = parts.slice(2).join(' ').toLowerCase() || 'medium_term'; // e.g., "short term" or "long term"
      const timeRangeMap = {
        'short term': 'short_term',
        'medium term': 'medium_term',
        'long term': 'long_term',
      };
      const timeRange = timeRangeMap[timeRangeInput] || 'medium_term';
    
      if (!type || (type !== 'artists' && type !== 'tracks')) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Um… use "/top artists" or "/top tracks" (and maybe "short term", "medium term", or "long term")! >:3', time: Date.now() },
        ]);
        setIsLoading(false);
        return;
      }
    
      const result = await fetchUserTopItems(type, timeRange);
      if (result.success) {
        const items = result.data.map((item, index) => {
          const name = type === 'artists' ? item.name : `${item.name} by ${item.artists[0].name}`;
          return `${index + 1}. ${name}`;
        }).join('\n');
        const timeRangeText = {
          'short_term': 'the last 4 weeks',
          'medium_term': 'the last 6 months',
          'long_term': 'all time',
        }[timeRange];
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `O-oh! Here are your top ${type} from ${timeRangeText}:\n${items} >:3`, time: Date.now() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
      setIsLoading(false);
      return;
    }
    
    if (lowerMessage === '/profile') {
      if (!spotifyToken) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
        ]);
        initiateSpotifyLogin();
        setIsLoading(false);
        return;
      }
    
      const result = await fetchUserProfile();
      if (result.success) {
        const {
          display_name,
          email,
          country,
          product,
          followers,
          images,
          id,
          uri,
          external_urls,
        } = result.data;
    
        // Capitalize product type for display
        const accountType = product === 'premium' ? 'Premium' : product === 'free' ? 'Free' : 'Open';
    
        // Build the profile table in Markdown
        const profileText = `O-oh! Here’s your Spotify profile, all shiny and neat! >:3\n\n` +
          `| **Field**           | **Details**                          |\n` +
          `|---------------------|--------------------------------------|\n` +
          `| **Name**            | ${display_name || 'No name set'}     |\n` +
          `| **Email**           | ${email || 'Not shared'}             |\n` +
          `| **Country**         | ${country || 'Unknown'}              |\n` +
          `| **Account**         | ${accountType}                       |\n` +
          `| **Followers**       | ${followers?.total || 0}             |\n` +
          `| **Spotify ID**      | ${id || 'Unknown'}                   |\n` +
          `| **Spotify URI**     | ${uri || 'Not available'}            |\n` +
          `| **Profile Link**    | ${external_urls?.spotify || '#'} |`;
    
        // Set up the image and final text
        const profileImage = images?.length > 0 ? images[0].url : null;
        const finalText = profileImage ? `${profileText}\n\nHere’s you! Check the pic below! >:3` : `${profileText}\n\nUm… no profile pic set yet! >:3`;
    
        setMessages((prev) => [
          ...prev,
          { 
            role: 'assistant', 
            content: finalText, 
            time: Date.now(), 
            image: profileImage // Attach image URL here
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
      setIsLoading(false);
      return;
    }

    // New Commands
  if (lowerMessage.startsWith('/volume')) {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const volume = parseInt(messageContent.split(' ')[1], 10);
      if (isNaN(volume) || volume < 0 || volume > 100) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Um… please give me a number between 0 and 100, like "/volume 50"! >:3', time: Date.now() },
        ]);
      } else {
        const result = await setVolume(volume);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage === '/resume') {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const result = await resumePlayback();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.message, time: Date.now() },
      ]);
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage.startsWith('/playlist')) {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const playlistName = messageContent.replace('/playlist', '').trim();
      if (!playlistName) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Um… what playlist should I play? Like "/playlist Chill Hits"! >:3', time: Date.now() },
        ]);
      } else {
        const result = await playPlaylistByName(playlistName);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage === '/recommend') {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const result = await fetchRecommendations();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.message, time: Date.now() },
      ]);
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage === '/prev') {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const result = await skipToPrevious();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.message, time: Date.now() },
      ]);
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage.startsWith('/queue')) {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const query = messageContent.replace('/queue', '').trim();
      if (!query) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Um… what song should I queue? Like "/queue Blinding Lights"! >:3', time: Date.now() },
        ]);
      } else {
        const searchResult = await searchTrack(query);
        if (searchResult.success) {
          const queueResult = await addToQueue(searchResult.uri);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `${queueResult.message} (Queued: ${searchResult.name})`, time: Date.now() },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: searchResult.message, time: Date.now() },
          ]);
        }
      }
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage.startsWith('/transfer')) {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const deviceId = messageContent.split(' ')[1]?.trim();
      if (!deviceId) {
        const devicesResult = await getDevices();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `${devicesResult.message}\nUse "/transfer <device_id>" to switch!`, time: Date.now() },
        ]);
      } else {
        const transferResult = await transferPlayback(deviceId);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: transferResult.message, time: Date.now() },
        ]);
      }
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage.startsWith('/shuffle')) {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const state = messageContent.split(' ')[1]?.toLowerCase();
      if (state !== 'on' && state !== 'off') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Um… use "/shuffle on" or "/shuffle off"! >:3', time: Date.now() },
        ]);
      } else {
        const result = await toggleShuffle(state === 'on');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
    }
    setIsLoading(false);
    return;
  }

  if (lowerMessage.startsWith('/repeat')) {
    if (!spotifyToken) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Oh… um, I-I need you to log in to Spotify first! I’ll open the login page… >:3', time: Date.now() },
      ]);
      initiateSpotifyLogin();
    } else {
      const state = messageContent.split(' ')[1]?.toLowerCase();
      if (!['track', 'context', 'off'].includes(state)) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Um… use "/repeat track", "/repeat context", or "/repeat off"! >:3', time: Date.now() },
        ]);
      } else {
        const result = await toggleRepeat(state);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message, time: Date.now() },
        ]);
      }
    }
    setIsLoading(false);
    return;
  }
  
    const playRequest = detectPlayRequest(messageContent);
    if (playRequest) {
      let songName, artistName;
      if (typeof playRequest === 'object' && playRequest !== null) {
        songName = playRequest.songName;
        artistName = playRequest.artistName;
      } else {
        const playCommand = messageContent.replace('/play', '').trim();
        songName = playCommand;
        const byIndex = playCommand.toLowerCase().indexOf(' by ');
        if (byIndex !== -1) {
          songName = playCommand.substring(0, byIndex).trim();
          artistName = playCommand.substring(byIndex + 4).trim();
        }
      }
  
      addDebugLog('debug', 'info', `Detected play request - Song: "${songName}", Artist: "${artistName || 'none'}"`);
  
      if (!spotifyToken) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Oh… um, I-I need to connect your Spotify account with your LyraTunes Account first! >///<\n\nPlease type /lyratunes so I can open the login page for you. :3',
            time: Date.now(),
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      
  
      try {
        const searchQuery = artistName ? `${songName} artist:${artistName}` : songName;
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`, {
          headers: { 'Authorization': `Bearer ${spotifyToken}` },
        });
  
        if (searchResponse.status === 401) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'Oh… um, the Spotify token expired! I-I’ll ask you to log in again… >:3', time: Date.now() },
          ]);
          setSpotifyToken(null);
          localStorage.removeItem('spotify_access_token');
          localStorage.removeItem('spotify_refresh_token');
          initiateSpotifyLogin();
          setIsLoading(false);
          return;
        }
  
        const searchData = await searchResponse.json();
  
        if (searchData.tracks.items.length > 0) {
          const trackId = searchData.tracks.items[0].id;
          const foundSongName = searchData.tracks.items[0].name;
          const foundArtistName = searchData.tracks.items[0].artists[0].name;
          const coverArtUrl = searchData.tracks.items[0].album.images[0]?.url; // Get the largest cover art
  
          await playSong(trackId);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `O-oh! I-I found "${foundSongName}" by ${foundArtistName}… it’s open now! >:3`,
              time: Date.now(),
              image: coverArtUrl, // Add cover art as image
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Uh… I-I couldn’t find "${songName}${artistName ? ' by ' + artistName : ''}" on Spotify… sorry, bruh! >:3`, time: Date.now() },
          ]);
          addDebugLog('debug', 'info', `No tracks found for "${searchQuery}"`);
        }
      } catch (err) {
        console.error('Spotify error:', err);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Eek! S-something went wrong with Spotify… >:3', time: Date.now() },
        ]);
        addDebugLog('debug', 'error', `Spotify API error: ${err.message}`);
      }
      setIsLoading(false);
      return;
    }
  
    const insight = await extractKeyInsight(messageContent);
    await saveInsightToFirestore(insight);
  
    try {
      if (messageContent.toLowerCase().startsWith('/imagine')) {
        const prompt = messageContent.replace(/imagine:/i, '').trim();
        addDebugLog('debug', 'info', `Detected image generation request: "${prompt}"`);
        setIsLoading(true); // Specific to image generation
  
        const generatedImageBase64 = await generateImageWithStableHorde(prompt);
        userMessage = { ...userMessage, image: generatedImageBase64 }; // Update user message with generated image
  
        let shouldAddResponse = true;
        if (lyraResponseLockout.current) {
          addDebugLog('debug', 'info', `Lyra response skipped due to 2s lockout: "Image generated"`);
          shouldAddResponse = false;
        }
  
        if (shouldAddResponse) {
          setMessages((prev) => {
            const assistantTime = Date.now();
            const newMessages = [
              ...prev,
              {
                role: 'assistant',
                content: `O-oh… here’s the image I made for you! 🌸`,
                time: assistantTime,
                image: generatedImageBase64, // Only set image for generated responses
              },
            ].slice(-MAX_MESSAGES);
            addDebugLog('chat', 'info', `Lyra: O-oh… here’s the image I made for you! 🌸`);
            return newMessages;
          });
  
          if (lyraResponseLockout.current) {
            clearTimeout(lyraResponseLockout.current);
          }
          lyraResponseLockout.current = setTimeout(() => {
            lyraResponseLockout.current = null;
            addDebugLog('debug', 'info', 'Lyra 2s response lockout cleared');
          }, 2000);
        }
      } else {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const chatHistory = messages.map((msg) => `${msg.role === 'user' ? 'User' : 'Lyra'}: ${msg.content}`).join('\n');
        let prompt = `${AI_INSTRUCTIONS}\n\nChat History:\n${chatHistory}\n\nUser: ${messageContent}`;
        let parts = [{ text: prompt }];
  
        if (image) {
          try {
            prompt = `${AI_INSTRUCTIONS}\n\nChat History:\n${chatHistory}\n\nUser: ${messageContent}\n\nPlease describe the image I uploaded in detail, including objects, colors, and the overall scene.`;
            parts = [
              { text: prompt },
              { inlineData: { data: image.split(',')[1], mimeType: 'image/jpeg' } }, // Adjust mimeType as needed
            ];
            addDebugLog('debug', 'info', `Attempting image analysis with base64 data`);
          } catch (err) {
            addDebugLog('debug', 'error', `Failed to format image for analysis: ${err.message}`);
            parts = [{ text: prompt }];
          }
        }
  
        addDebugLog('api', 'info', 'Sending request to LyraLumen-2f');
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        addDebugLog('api', 'success', 'LyraLumen-2f responded successfully');
        addDebugLog('chat', 'info', `Lyra: ${text}`);
  
        let shouldAddResponse = true;
        if (lyraResponseLockout.current) {
          addDebugLog('debug', 'info', `Lyra response skipped due to 2s lockout: "${text.slice(0, 50)}..."`);
          shouldAddResponse = false;
        }
  
        if (shouldAddResponse) {
          setMessages((prev) => {
            const assistantTime = Date.now();
            const newMessages = [
              ...prev,
              { role: 'assistant', content: text, time: assistantTime }, // No image unless generated
            ].slice(-MAX_MESSAGES);
            return newMessages;
          });
  
          if (lyraResponseLockout.current) {
            clearTimeout(lyraResponseLockout.current);
          }
          lyraResponseLockout.current = setTimeout(() => {
            lyraResponseLockout.current = null;
            addDebugLog('debug', 'info', 'Lyra 2s response lockout cleared');
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Lyra error:', err);
      addDebugLog('api', 'error', `LyraLumen-2f or Stable Horde failed: ${err.message}`);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: image ? 'Uh... I-I couldn’t analyze the image properly… >:3 But I see you sent one!' : 'Uh... something went wrong! I-I couldn’t make the image… >:3', time: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImageWithStableHorde = async (prompt) => {
    try {
      const generateResponse = await fetch('https://stablehorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': STABLE_HORDE_API_KEY },
        body: JSON.stringify({
          prompt: prompt,
          params: { sampler_name: 'k_euler', steps: 30, cfg_scale: 7, width: 512, height: 512, karras: false },
        }),
      });

      if (!generateResponse.ok) throw new Error(`Stable Horde API error: ${generateResponse.status} - ${await generateResponse.text()}`);
      const generateData = await generateResponse.json();
      const jobId = generateData.id;
      addDebugLog('api', 'info', `LyraLumen-2F-Vision-Exp job started: ID ${jobId}, prompt: "${prompt}"`);

      let imageData = null;
      for (let i = 0; i < 30; i++) {
        const checkResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`);
        const checkData = await checkResponse.json();

        if (checkData.done) {
          const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`);
          const statusData = await statusResponse.json();
          if (statusData.generations && statusData.generations.length > 0) {
            const imageUrl = statusData.generations[0].img;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            imageData = await new Promise((resolve) => { reader.onloadend = () => resolve(reader.result); });
          }
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!imageData) throw new Error('Image generation timed out after 60 seconds');
      addDebugLog('api', 'success', `LyraLumen-2F-Vision-Exp image generated as base64`);
      return imageData;
    } catch (err) {
      addDebugLog('api', 'error', `LyraLumen-2F-Vision-Exp failed: ${err.message}`);
      throw err;
    }
  };

  const regenerateMessage = async (userMessage) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    addDebugLog('debug', 'info', `Regenerating response for user message: "${userMessage.content}"`);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${AI_INSTRUCTIONS}\n\nUser: ${userMessage.content}`;
      addDebugLog('api', 'info', 'Sending request to LyraLumen-2f for regeneration');
      const result = await model.generateContent([{ text: prompt }]);
      const response = await result.response;
      const text = response.text();
      addDebugLog('api', 'success', 'LyraLumen-2f regeneration successful');

      setMessages((prev) => {
        const userIndex = prev.findIndex((msg) => msg === userMessage);
        if (userIndex === -1 || userIndex === prev.length - 1) {
          const trimmed = prev.length >= MAX_MESSAGES ? prev.slice(1) : prev;
          addDebugLog('chat', 'info', `Lyra: ${text} (regenerated)`);
          return [...trimmed, { role: 'assistant', content: text, time: Date.now() - userMessage.time }];
        }
        const newMessages = [...prev];
        newMessages[userIndex + 1] = { role: 'assistant', content: text, time: Date.now() - userMessage.time };
        addDebugLog('chat', 'info', `Lyra: ${text} (regenerated)`);
        return newMessages;
      });
    } catch (err) {
      addDebugLog('api', 'error', `LyraLumen-2f regeneration failed: ${err.message}`);
      setError('Error: Failed to regenerate response');
    } finally {
      setIsLoading(false);
    }
  };

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!input?.trim() && !uploadedImage) return;

  // Check if user is banned
  if (banUntil && new Date() < new Date(banUntil)) {
    setShowBanOverlay(true);
    console.log('User is banned until:', banUntil);
    return;
  }

  const isImagineCommand = typeof input === 'string' && input.toLowerCase().startsWith('/imagine');
  const isImageMessage = !!uploadedImage;
  const creditCost = isImagineCommand || isImageMessage ? 2 : 1;

  // Check for NSFW content in /imagine commands
  if (isImagineCommand) {
    let nsfwDetected = false;
    // Keyword-based NSFW check
    if (isNSFWKeyword(input)) {
      nsfwDetected = true;
      console.log('NSFW keyword detected in:', input);
    }

    // TensorFlow.js toxicity check
    if (toxicityModel && !nsfwDetected) {
      try {
        const predictions = await toxicityModel.classify([input]);
        nsfwDetected = predictions.some(prediction => 
          (prediction.label === 'toxicity' || prediction.label === 'sexual_explicit') && 
          prediction.results[0].match
        );
        if (nsfwDetected) {
          console.log('NSFW content detected by toxicity model:', input);
        }
      } catch (err) {
        console.error('Error checking NSFW content:', err);
        setError('Failed to verify content. Please try again.');
        return;
      }
    }

    // Handle NSFW detection
    if (nsfwDetected) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const currentAttempts = userDoc.exists() ? (userDoc.data().nsfwAttempts || 0) + 1 : 1;

      // Log NSFW attempt
      await setDoc(doc(db, 'nsfw_logs', `${user.uid}_${Date.now()}`), {
        userId: user.uid,
        input,
        timestamp: new Date().toISOString(),
        attempt: currentAttempts
      });

      // Ban logic
      let banEnd: string | null = null;

      if (currentAttempts >= 5) {
        // 5th attempt = 1-year ban
        banEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        await setDoc(userDocRef, { banUntil: banEnd, nsfwAttempts: 0 }, { merge: true });
        console.log('User permanently banned for 1 year after 5 NSFW attempts:', banEnd);
      } else if (currentAttempts >= 3) {
        // 3rd attempt = 7-day ban
        banEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await setDoc(userDocRef, { banUntil: banEnd, nsfwAttempts: currentAttempts }, { merge: true });
        console.log('User banned for 7 days after 3 NSFW attempts:', banEnd);
      } else {
        // Just log attempt
        await setDoc(userDocRef, { nsfwAttempts: currentAttempts }, { merge: true });
        console.log(`NSFW attempt ${currentAttempts}/5 recorded`);
      }

      if (banEnd) {
        setBanUntil(new Date(banEnd));
      }

      setShowNSFWPopup(true);
      return;
    }

  }

  // Check credit availability
  if (messageCount + creditCost > 5 && !['/reset', '/logout', '/lyratunes', '/play'].some(cmd => typeof input === 'string' && input.toLowerCase().startsWith(cmd))) {
    setShowCreditsPopup(true);
    console.log('Credits insufficient: messageCount=', messageCount, 'creditCost=', creditCost);
    return;
  }

  // Handle special commands
  if (typeof input === 'string' && input.trim().toLowerCase() === '/reset') {
    await resetChat();
    setInput('');
    return;
  }
  if (typeof input === 'string' && input.trim().toLowerCase() === '/logout') {
    await handleLogout();
    setInput('');
    return;
  }
  if (typeof input === 'string' && input.trim().toLowerCase() === '/lyratunes') {
    await handleSpotifySignIn();
    setInput('');
    return;
  }
  if (typeof input === 'string' && input.trim().toLowerCase().startsWith('/play')) {
    const songName = input.replace('/play', '').trim();
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=1`, {
        headers: { 'Authorization': 'Bearer YOUR_SPOTIFY_ACCESS_TOKEN' }
      });
      const data = await response.json();
      if (data.tracks.items.length > 0) {
        const trackId = data.tracks.items[0].id;
        const spotifyUrl = `https://open.spotify.com/track/${trackId}`;
        window.open(spotifyUrl, '_blank');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `O-oh! I-I found "${songName}" on Spotify… it’s opening in your browser now! >:3`, time: Date.now() }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Uh… I-I couldn’t find "${songName}" on Spotify… sorry, bruh! >:3`, time: Date.now() }
        ]);
      }
    } catch (err) {
      console.error('Spotify error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Eek! S-something went wrong with Spotify… >:3', time: Date.now() }
      ]);
    } finally {
      setIsLoading(false);
    }
    setInput('');
    return;
  }

  // Handle regular messages or /imagine
  const newMessage = {
    role: 'user',
    content: input || '',
    time: Date.now(),
    image: uploadedImage || null,
  };
  setMessages((prev) => [...prev, newMessage]);
  setInput('');
  setImagePreview(null);
  setUploadedImage(null);
  if (fileInputRef.current) fileInputRef.current.value = '';

  try {
    const newCount = messageCount + creditCost;
    await updateDoc(doc(db, 'users', user?.uid), { messageCount: newCount });
    setMessageCount(newCount);
    console.log(`Credits updated: messageCount=${newCount}, cost=${creditCost}`);

    setIsLoading(true);
    const response = await sendToLyra(input || '', uploadedImage);
    setMessages((prev) => [...prev, { role: 'assistant', content: response, time: Date.now() }]);
  } catch (err) {
    console.error('Error processing message:', err);
    setError('Failed to process message. Please try again.');
    setMessages((prev) => prev.filter((msg) => msg.time !== newMessage.time));
  } finally {
    setIsLoading(false);
  }
};

    // Calculate remaining ban time
  const getRemainingBanTime = () => {
    if (!banUntil) return '';
    const now = new Date();
    const diff = new Date(banUntil) - now;
    if (diff <= 0) return '0 hours';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.ceil((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days} days, ${hours} hours` : `${hours} hours`;
  };

  const downloadImage = async (imageBase64, fileName) => {
    try {
      const link = document.createElement('a');
      link.href = imageBase64; // Use base64 directly
      link.download = fileName || 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addDebugLog('debug', 'success', `Image download triggered: ${fileName}`);
    } catch (err) {
      addDebugLog('debug', 'error', `Failed to download image: ${err.message}`);
      setError(`Failed to download image: ${err.message}`);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) {
      setError('Please fill in both fields.');
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(
        user?.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError('Failed to update password. Please try again.');
    }
  };

  // Map provider IDs to readable names
  const getProviderName = (providerId) => {
    switch (providerId) {
      case GoogleAuthProvider.PROVIDER_ID:
        return 'Google';
      case GithubAuthProvider.PROVIDER_ID:
        return 'GitHub';
      case 'password':
        return 'Email/Password';
      default:
        return 'Unknown';
    }
  };

  const videoRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

// Inside Playground function, before the return
useEffect(() => {
  const checkScroll = () => {
    if (bottomRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = bottomRef.current;
      const isScrolledUp = scrollTop + clientHeight < scrollHeight - 10;
      setShowScrollDown(isScrolledUp);
      addDebugLog('debug', 'info', `Scroll check: top=${scrollTop}, height=${clientHeight}, total=${scrollHeight}, show=${isScrolledUp}`);
    }
  };
  const container = bottomRef.current;
  if (container) container.addEventListener('scroll', checkScroll);
  checkScroll(); // Initial check
  return () => container?.removeEventListener('scroll', checkScroll);
}, [messages]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.1; // 👈 slower speed (0.5x)
    }
  }, []);

  const openModal = () => {

    if (messageCount >= 5) {
      setShowCreditsPopup(true);
      return;
    }

    if (imageUploadCount >= MAX_IMAGES_PER_DAY) {
      const resetTime = localStorage.getItem(IMAGE_UPLOAD_RESET_KEY);
      const remainingTime = resetTime ? Number(resetTime) - Date.now() : 0;
      setError(`You have reached the maximum image uploads for today. Please try again in ${Math.ceil(remainingTime / (1000 * 60 * 60))} hours.`);
      return;
    }

    setIsModalOpen(true);
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("account");
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const welcomeMessages = [
    "Got something on your mind? I’m all ears.",
    "Anything you'd like to share? I’m listening closely.",
    "Something weighing on you? You can tell me.",
    "Wanna let something out? I’m here for it.",
    "Your thoughts matter—feel free to share."
  ];

  const suggestions = [
    "Tell me a random fact",
    "Give me a creative writing prompt",
    "Can you cheer me up?",
    "Suggest a retro game",
    "What's a good movie to watch?",
    "I feel lonely",
    "Tell me something funny"
  ];

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.altKey && e.key === 'd') { // Ctrl + `
          e.preventDefault(); // Stops any default behavior (like browser stuff)
          setIsDebugOpen((prev) => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    

      // Get user region and timezone
      // Enhanced region detection
    // Fix region to show "India" when timezone is Asia/Kolkata
    const getRegion = () => {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (timezone.startsWith('Asia/')) {
        if (timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta') {
          return { country: 'India', region: 'South Asia', timezone };
        }
        if (timezone === 'Asia/Dhaka') {
          return { country: 'Bangladesh', region: 'South Asia', timezone };
        }
        if (timezone === 'Asia/Kathmandu') {
          return { country: 'Nepal', region: 'South Asia', timezone };
        }
        if (timezone === 'Asia/Colombo') {
          return { country: 'Sri Lanka', region: 'South Asia', timezone };
        }
      
        if (timezone === 'Asia/Tokyo') {
          return { country: 'Japan', region: 'East Asia', timezone };
        }
        if (timezone === 'Asia/Seoul') {
          return { country: 'South Korea', region: 'East Asia', timezone };
        }
        if (timezone === 'Asia/Shanghai') {
          return { country: 'China', region: 'East Asia', timezone };
        }
        if (timezone === 'Asia/Taipei') {
          return { country: 'Taiwan', region: 'East Asia', timezone };
        }
      
        if (timezone === 'Asia/Jakarta') {
          return { country: 'Indonesia', region: 'Southeast Asia', timezone };
        }
        if (timezone === 'Asia/Bangkok') {
          return { country: 'Thailand', region: 'Southeast Asia', timezone };
        }
        if (timezone === 'Asia/Singapore') {
          return { country: 'Singapore', region: 'Southeast Asia', timezone };
        }
        if (timezone === 'Asia/Manila') {
          return { country: 'Philippines', region: 'Southeast Asia', timezone };
        }
        if (timezone === 'Asia/Kuala_Lumpur') {
          return { country: 'Malaysia', region: 'Southeast Asia', timezone };
        }
      
        if (timezone === 'Asia/Dubai') {
          return { country: 'UAE', region: 'Middle East', timezone };
        }
        if (timezone === 'Asia/Riyadh') {
          return { country: 'Saudi Arabia', region: 'Middle East', timezone };
        }
        if (timezone === 'Asia/Baghdad') {
          return { country: 'Iraq', region: 'Middle East', timezone };
        }
        if (timezone === 'Asia/Tehran') {
          return { country: 'Iran', region: 'Middle East', timezone };
        }
        if (timezone === 'Asia/Jerusalem') {
          return { country: 'Israel', region: 'Middle East', timezone };
        }
      
        if (timezone === 'Asia/Yekaterinburg') {
          return { country: 'Russia', region: 'Europe / Northern Asia', timezone };
        }
      } 
      
      if (timezone.startsWith('Africa/')) {
        if (timezone === 'Africa/Cairo') {
          return { country: 'Egypt', region: 'North Africa', timezone };
        }
        if (timezone === 'Africa/Lagos') {
          return { country: 'Nigeria', region: 'West Africa', timezone };
        }
        if (timezone === 'Africa/Nairobi') {
          return { country: 'Kenya', region: 'East Africa', timezone };
        }
        if (timezone === 'Africa/Johannesburg') {
          return { country: 'South Africa', region: 'Southern Africa', timezone };
        }
        if (timezone === 'Africa/Algiers') {
          return { country: 'Algeria', region: 'North Africa', timezone };
        }
      }
      
      if (timezone.startsWith('Europe/')) {
        if (timezone === 'Europe/London') {
          return { country: 'United Kingdom', region: 'Europe', timezone };
        }
        if (timezone === 'Europe/Paris') {
          return { country: 'France', region: 'Europe', timezone };
        }
        if (timezone === 'Europe/Berlin') {
          return { country: 'Germany', region: 'Europe', timezone };
        }
        if (timezone === 'Europe/Rome') {
          return { country: 'Italy', region: 'Europe', timezone };
        }
        if (timezone === 'Europe/Madrid') {
          return { country: 'Spain', region: 'Europe', timezone };
        }
        if (timezone === 'Europe/Moscow') {
          return { country: 'Russia', region: 'Europe / Northern Asia', timezone };
        }
      }
      
      if (timezone.startsWith('America/')) {
        if (timezone === 'America/New_York') {
          return { country: 'United States (East)', region: 'North America', timezone };
        }
        if (timezone === 'America/Los_Angeles') {
          return { country: 'United States (West)', region: 'North America', timezone };
        }
        if (timezone === 'America/Chicago') {
          return { country: 'United States (Central)', region: 'North America', timezone };
        }
        if (timezone === 'America/Toronto') {
          return { country: 'Canada', region: 'North America', timezone };
        }
        if (timezone === 'America/Mexico_City') {
          return { country: 'Mexico', region: 'Latin America', timezone };
        }
        if (timezone === 'America/Sao_Paulo') {
          return { country: 'Brazil', region: 'Latin America', timezone };
        }
        if (timezone === 'America/Bogota') {
          return { country: 'Colombia', region: 'Latin America', timezone };
        }
        if (timezone === 'America/Argentina/Buenos_Aires') {
          return { country: 'Argentina', region: 'Latin America', timezone };
        }
      }     
      
      if (timezone.startsWith('Australia/') || timezone.startsWith('Pacific/')) {
        if (timezone === 'Australia/Sydney') {
          return { country: 'Australia', region: 'Oceania', timezone };
        }
        if (timezone === 'Australia/Melbourne') {
          return { country: 'Australia', region: 'Oceania', timezone };
        }
        if (timezone === 'Pacific/Auckland') {
          return { country: 'New Zealand', region: 'Oceania', timezone };
        }
        if (timezone === 'Pacific/Fiji') {
          return { country: 'Fiji', region: 'Oceania', timezone };
        }
        if (timezone === 'Pacific/Port_Moresby') {
          return { country: 'Papua New Guinea', region: 'Oceania', timezone };
        }
      }      
      
      // Fallback for other cases
      const localeMap = {
        'en-IN': { country: 'India', region: 'South Asia' },
        'hi-IN': { country: 'India (Hindi)', region: 'South Asia' },
        'bn-BD': { country: 'Bangladesh', region: 'South Asia' },
        'ne-NP': { country: 'Nepal', region: 'South Asia' },
        'si-LK': { country: 'Sri Lanka', region: 'South Asia' },
        'dv-MV': { country: 'Maldives', region: 'South Asia' },
        'ps-AF': { country: 'Afghanistan', region: 'South Asia / Central Asia' },

        'en-AU': { country: 'Australia', region: 'Oceania' },
        'en-NZ': { country: 'New Zealand', region: 'Oceania' },
        'mk-MP': { country: 'Northern Mariana Islands', region: 'Oceania' },

        'es-AR': { country: 'Argentina', region: 'Latin America' },
        'es-CO': { country: 'Colombia', region: 'Latin America' },
        'es-CL': { country: 'Chile', region: 'Latin America' },
        'es-PE': { country: 'Peru', region: 'Latin America' },
        'es-VE': { country: 'Venezuela', region: 'Latin America' },

        'en-US': { country: 'United States', region: 'North America' },
        'en-CA': { country: 'Canada', region: 'North America' },
        'fr-CA': { country: 'Canada (French)', region: 'North America' },

        'en-GB': { country: 'United Kingdom', region: 'Europe' },
        'fr-FR': { country: 'France', region: 'Europe' },
        'de-DE': { country: 'Germany', region: 'Europe' },
        'it-IT': { country: 'Italy', region: 'Europe' },
        'es-ES': { country: 'Spain', region: 'Europe' },
        'pt-PT': { country: 'Portugal', region: 'Europe' },
        'ru-RU': { country: 'Russia', region: 'Europe / Northern Asia' },
        'nl-NL': { country: 'Netherlands', region: 'Europe' },
        'sv-SE': { country: 'Sweden', region: 'Europe' },
        'pl-PL': { country: 'Poland', region: 'Europe' },
        'ro-RO': { country: 'Romania', region: 'Europe' },
        'cs-CZ': { country: 'Czech Republic', region: 'Europe' },
        'fi-FI': { country: 'Finland', region: 'Europe' },

        'es-MX': { country: 'Mexico', region: 'Latin America' },
        'pt-BR': { country: 'Brazil', region: 'Latin America' },

        'ja-JP': { country: 'Japan', region: 'East Asia' },
        'ko-KR': { country: 'South Korea', region: 'East Asia' },
        'zh-CN': { country: 'China (Simplified)', region: 'East Asia' },
        'zh-TW': { country: 'Taiwan', region: 'East Asia' },

        'ms-MY': { country: 'Malaysia', region: 'Southeast Asia' },
        'id-ID': { country: 'Indonesia', region: 'Southeast Asia' },
        'th-TH': { country: 'Thailand', region: 'Southeast Asia' },
        'vi-VN': { country: 'Vietnam', region: 'Southeast Asia' },

        'ar-SA': { country: 'Saudi Arabia', region: 'Middle East' },
        'ar-AE': { country: 'United Arab Emirates', region: 'Middle East' },
        'ar-IQ': { country: 'Iraq', region: 'Middle East' },
        'ar-JO': { country: 'Jordan', region: 'Middle East' },
        'ar-LB': { country: 'Lebanon', region: 'Middle East' },
        'fa-IR': { country: 'Iran', region: 'Middle East' },
        'he-IL': { country: 'Israel', region: 'Middle East' },

      };  
      
      const data = localeMap[locale];
      if (data) {
        return { ...data, timezone };
      }

      // Try mapping via timezone fallback (for rare locales)
      if (timeZone.startsWith('Asia/')) {
        if (timeZone.includes('Kolkata') || timeZone.includes('Calcutta')) {
          return { country: 'India', region: 'South Asia', timezone: timeZone };
        }
        if (timeZone.includes('Tokyo')) {
          return { country: 'Japan', region: 'East Asia', timezone: timeZone };
        }
        // Add more fallbacks if needed
      }

      // Fallback
      return {
        country: 'Unknown',
        region: 'Unknown',
        timezone,
      };
    };

    

    const { country, region, timezone } = getRegion();
    
    const [linkedProviders, setLinkedProviders] = useState([]);
    const [success, setSuccess] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [isEmailPasswordUser, setIsEmailPasswordUser] = useState(false);
    
    
    const [randomMessage, setRandomMessage] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: timezone,
      });
      setTime(formatter.format(new Date()));
    };

    updateClock(); // Initial call
    const interval = setInterval(updateClock, 1000); // Update every second
    return () => clearInterval(interval); // Cleanup on unmount
  }, [timezone]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    setRandomMessage(welcomeMessages[randomIndex]);
  }, []);

  // Detect linked providers and email/password status
  useEffect(() => {
    if (user) {
      const providers = user.providerData.map((provider) => provider.providerId);
      setLinkedProviders(providers);
      setIsEmailPasswordUser(providers.includes('password'));
    }
  }, [user]);

  const createdAt = user?.metadata?.creationTime ?? 'Unknown';
  const creationDate = createdAt
  ? new Date(createdAt).toLocaleString(undefined, { dateStyle: 'medium' })
  : 'Unknown';

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const closeModal = () => setIsModalOpen(false);
    const [isVisible, setIsVisible] = useState(false);

  const isDark = theme.mode === 'dark';

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  

  const [privacySettings, setPrivacySettings] = useState({
    shareUsageData: false,
    publicProfile: false,
    showOnlineStatus: false,
    adPersonalization: false,
    darkMode: true,
    alertSound: false,
    emailNotifications: true,
    pushNotifications: false,
  });

  const updatePrivacySetting = async (key, value) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const privacyDocRef = doc(db, 'users', user.uid, 'privacy', 'settings');
      await setDoc(privacyDocRef, { [key]: value }, { merge: true });
      setPrivacySettings((prev) => ({ ...prev, [key]: value }));

    } catch (err) {

    } finally {
      setIsLoading(false);
    }
  };

  // Fetch privacy settings on mount
  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        setIsLoading(true);
        try {
          const privacyDocRef = doc(db, 'users', user.uid, 'privacy', 'settings');
          const privacyDoc = await getDoc(privacyDocRef);
          if (privacyDoc.exists()) {
            setPrivacySettings(privacyDoc.data());

            setPrivacySettings({
              ...privacyDoc.data(),
              darkMode: true, // always override to true
            });
          }
        } catch (err) {
          setError('Failed to load privacy settings.');
          console.error(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSettings();
    }
  }, [user]);

  // Handle data export
  const handleDataExport = async () => {
  setIsLoading(true);
  setError(null);
  try {
    if (!user) throw new Error('No user signed in.');

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    const privacyDocRef = doc(db, 'users', user.uid, 'privacy', 'settings');
    const privacyDoc = await getDoc(privacyDocRef);

    const userData = userDoc.exists() ? userDoc.data() : {};
    const privacyData = privacyDoc.exists() ? privacyDoc.data() : {};

    const lines = [
      `👤 USER INFORMATION`,
      `==================`,
      `Email: ${user.email} | Status: ${user.emailVerified ? 'Verified' : 'Not Verified'}`,
      `LyraLabs ID: ${user.uid}`,
      `Name: ${displayName || 'N/A'}`,
      `Created At: ${user.metadata.creationTime || 'N/A'}`,
      `Region: ${region}, ${country}`,
      `Timezone: ${timezone}`,
      `OAuth Provider: ${user.providerId}`,
      ``,
      `🔒 PRIVACY SETTINGS`,
      `====================`,
      `Share Usage Data: ${privacyData.shareUsageData ? 'Enabled' : 'Disabled'}`,
      `**Allows us to collect anonymous data to improve app performance and features.**`,
      ``,
      `Public Profile: ${privacyData.publicProfile ? 'Enabled' : 'Disabled'}`,
      `**If enabled, your profile can be viewed publicly (e.g., username, profile picture).**`,
      ``,
      `Activity Status: ${privacyData.activityStatus ? 'Visible' : 'Hidden'}`,
      `**Controls whether others can see your online status and activity history.**`,
      ``,
      `Ad Personalization: ${privacyData.adPersonalization ? 'Enabled' : 'Disabled'}`,
      `**Personalizes ads based on your behavior to show more relevant content.**`,
      ``,
      `📜 OTHER`,
      `========`,
      `Download Requested At: ${new Date().toLocaleString()}`,
      ``,
      `Thank you for using our service.`,
    ];    

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacy-report-${user.uid}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Download ready! Check your files.');
  } catch (err) {
    console.error(err);
    setError('Failed to export data.');
  } finally {
    setIsLoading(false);
  }
};



  return (
    <div className={`flex flex-col min-h-screen ${isDark ? 'bg-black text-gray-300' : 'bg-rose-100/20 text-gray-800'}`}>
      <Helmet>
        <title>LyraLabs AI | Playground</title>
      </Helmet>

      

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



      <div className="flex flex-col min-h-screen backdrop-blur-sm bg-rose-900/10 z-50" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="absolute top-4 right-0 sm:right-4 z-10 w-full sm:w-auto">
        <div className="block sm:hidden bg-[#11060A] absolute inset-0 w-full h-[100px] -mt-10 z-[-1] rounded-lg blur-md" />
        
        {user ? (
          <div className="relative flex gap-3 justify-end px-4 sm:px-0">
            <div className="relative group">
              <Bug
                size={22}
                className="mt-0.5 w-9 h-9 p-[8px] text-rose-200/90 rounded-full hover:bg-rose-800/20 hover:cursor-pointer"
                onClick={() => setIsDebugOpen(!isDebugOpen)}
              />
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-rose-900/90 text-rose-100 backdrop-blur-lg text-xs font-semibold px-3 py-2 rounded-md hidden group-hover:block scale-95 group-hover:scale-100 transition-all whitespace-nowrap z-10 shadow-lg">
                Console <span className="text-rose-100/40 text-xs">(Alt+D)</span>
              </span>
            </div>

            <div className="relative group">
              <img
                src={user.photoURL || 'https://via.placeholder.com/40'}
                alt="Profile"
                className="w-9 md:w-10 h-auto rounded-full cursor-pointer border-2 border-rose-400/20 hover:border-rose-400/40 transition-all"
                onClick={() => {
                  if (isProfileOpen) {
                    // trigger fade out
                    setIsVisible(false);
                    setTimeout(() => setIsProfileOpen(false), 300); // wait for fade-out
                  } else {
                    setIsProfileOpen(true);
                    setTimeout(() => setIsVisible(true), 10); // ensure it fades in after mount
                  }
                }}
              />
            </div>

            {isProfileOpen && (
              <div
  className={`absolute sm:right-0 mt-12 w-60 border border-rose-100/10 rounded-2xl shadow-lg px-6 py-5 text-white/80 
    backdrop-blur-md bg-rose-950/95 lg:bg-rose-950/10 transition-opacity duration-300 ease-in-out 
    ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 blur-sm pointer-events-none'}`}
>

                <p className="text-sm truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <hr className='my-3 border-rose-100/20' />
                <button onClick={() => setIsSettingsOpen(true)} className='text-[12.5px] flex gap-2 font-semibold rounded-md w-full py-2.5 hover:bg-white/5 hover:px-3 transition-all'><Settings strokeWidth={2} size={15} className='mt-[0.5px]' /> Settings</button>
                <button className='text-[12.5px] flex gap-2 font-semibold rounded-md w-full py-2.5 hover:bg-white/5 hover:px-3 transition-all'><HelpCircle strokeWidth={2} size={15} className='mt-[1px]' /> Help & Support</button>
                <hr className='my-3 border-rose-100/20' />
                <button onClick={() => auth.signOut()} className='text-[12.5px] text-red-400 flex gap-2 font-semibold rounded-md w-full py-2.5 hover:bg-white/5 hover:px-3 transition-all'><LogOut size={15} className='mt-[1px]' /> Logout</button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-all"
            onClick={() => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}
          >
            <span className="text-white text-sm">Sign In</span>
          </div>
        )}
      </div>
        <div className="pt-20 md:pt-20 md:pb-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 120px)' }}>
          <div ref={chatContainerRef} className="h-full overflow-y-auto px-4 pb-14 flex-1">
            <div className="max-w-3xl mx-auto">
            {showScrollDown && (
              <button
                onClick={scrollToBottom}
                className={`fixed bottom-24 right-6 p-2.5 rounded-full shadow-md transition-all z-50 ${
                  isDark ? 'bg-rose-900/70 text-rose-200 hover:bg-rose-800/90' : 'bg-rose-200 text-rose-600 hover:bg-rose-300'
                }`}
                title="Scroll to bottom"
              >
                <ArrowDown size={20} strokeWidth={2.5} />
              </button>
            )}
              <div className={`rounded-lg p-4 ${isDark ? 'bg-transparent' : 'bg-rose-100/80 shadow-lg'}`}>
                <div className="space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center overflow-y-hidden text-gray-300 py-36 md:py-36 flex flex-col items-center justify-center space-y-4">
                      <h1 className="text-[1.6em] -mb-3 md:mb-0 md:text-4xl font-semibold text-white opacity-0" style={{
                        animation: 'fadeIn 0.3s forwards', animationDelay: '0.3s'
                      }}>{ getGreeting() }, <span className='text-rose-300 font-bol'>{ firstName } </span></h1>
                      <h1 className="text-lg md:text-2xl max-w-xs md:max-w-lg font-semibold text-gray-400/70 px-4 opacity-0" style={{
                        animation: 'fadeIn 0.2s forwards', animationDelay: '0.5s'
                      }}>
                      { randomMessage }
                      </h1>
                      <br />
                      <div className="flex flex-wrap justify-center gap-2 max-w-2xl px-4">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => sendToLyra(suggestion)}
                            className={`flex items-center gap-2 text-[13.5px] md:text-sm px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 transition-all backdrop-blur animate-fadeIn ${
                              index >= suggestions.length / 1.5 ? 'hidden md:flex' : ''
                            }`}
                            style={{ animationDelay: `${index * 0.15}s`, animationFillMode: "both" }}
                          >
                            {suggestion === "Tell me a random fact" && <FileQuestion size={16} />}
                            {suggestion === "Give me a creative writing prompt" && <Bot size={16} />}
                            {suggestion === "Can you cheer me up?" && <Sun size={16} />}
                            {suggestion === "Suggest a retro game" && <Terminal size={16} />}
                            {suggestion === "What's a good movie to watch?" && <Image size={16} />}
                            {suggestion === "I feel lonely" && <Pin size={16} />}
                            {suggestion === "Tell me something funny" && <Music2 size={16} />}
                            {suggestion}
                          </button>
                        ))}
                      </div>

                    </div>
                  ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`group text-sm flex items-start gap-2 pt-6 p-4 md:pr-6 md:pl-6 rounded-2xl animate-fadeIn ${
                        message.role === 'assistant' ? (isDark ? 'bg-rose-300/5 backdrop-blur-md' : 'bg-rose-50') : (isDark ? 'bg-rose-800/5 backdrop-blur-md' : 'bg-gray-100')
                      }`}
                    >
                        {message.role === 'assistant' ? (
                      <img src="https://i.ibb.co/F4zPZ6bT/img-IA6-Ilj-Cgeli-O0z-Vu-I7-Qhe.jpg" className="w-8 mr-2 rounded-lg pointer-events-none text-rose-200" alt="Lyra" />
                        ) : (
                          <img
                            src={userAvatar}
                            className="w-8 mr-2 rounded-lg pointer-events-none"
                            alt="User"
                            onError={handleAvatarError}
                          />
                        )}
                      <div className="flex-1 font-mono whitespace-pre-wrap">
                        {renderMessageContent(message.content)}
                        {message.image && (
                          <div className="relative group mt-3 max-w-[260px]">
                            <img
                              src={message.image}
                              alt={message.role === 'user' ? 'Uploaded' : 'Generated by LyraLumen2F-Vision-Exp'}
                              className="rounded-lg cursor-pointer mb-3"
                              onClick={() => { setSelectedChatImage(message.image); setIsEnlargedPreviewOpen(true); }}
                            />
                            <button
                              onClick={() => downloadImage(message.image, `LyraLumen-2f-Vision-Exp-${message.time}.png`)}
                              className={`absolute top-2 right-2 p-2 rounded-lg shadow-md transition-opacity opacity-0 group-hover:opacity-100 ${
                                !isDark ? 'bg-gray-800 text-yellow-500 hover:bg-gray-700' : 'bg-rose-950/80 text-rose-300 hover:bg-rose-900/80 backdrop-blur-md border border-rose-400/40'
                              }`}
                              title="Download image"
                            >
                              <Download size={16} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                        {message.role === 'assistant' && message.time && (
                          <div className="text-xs text-gray-500 mt-1">
                            response time {`(${(message.time / 1000).toFixed(2)}s)`} [
                            {new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                          </div>
                        )}
                        {message.role === 'user' && message.time && (
                          <div className="text-xs text-gray-500 mt-1">
                            [{new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                          </div>
                        )}

                        <div className={`flex gap-2 opacity-0 group-hover:opacity-100 group-hover:mt-4 group-hover:pb-4 transition-opacity ${isDark ? 'text-gray-400' : 'text-gray-600'}`} style={{ transition: '0.3s ease' }}>
                          <button onClick={() => copyMessage(message.content, index)} className="p-1.5 hover:bg-rose-100/20 hover:text-rose-300 rounded-md transition-colors" title="Copy message">
                            {copiedIndex === index ? <Check strokeWidth={2} size={16} /> : <Copy strokeWidth={2} size={16} />}
                          </button>
                          {message.role === 'assistant' && messages[index - 1] && (
                            <button
                              onClick={() => regenerateMessage(messages[index - 1])}
                              className="p-1.5 hover:bg-rose-100/20 hover:text-rose-300 rounded-md transition-colors"
                              title="Regenerate response"
                              disabled={isLoading}
                            >
                              <RotateCcw strokeWidth={2} size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                          )}
                          {message.role === 'assistant' && (
                            <button
                              onClick={() => speakMessage(message.content, index)}
                              className="p-1.5 hover:bg-rose-100/20 hover:text-rose-300 rounded-md transition-colors"
                              title={speakingIndex === index ? 'Stop speaking' : 'Read aloud'}
                              disabled={isLoading}
                            >
                              <Volume2 strokeWidth={2} size={16} className={speakingIndex === index ? 'animate-pulse' : ''} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div ref={bottomRef} />
                    </div>
                  ))
                )}
                  {isLoading && (
                    <div className={`flex items-center gap-2 ${isDark ? 'text-rose-500 font-semibold' : 'text-rose-400 font-semibold'}`}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-mono text-sm animate-pulse">
                        {messages.length > 0 && messages[messages.length - 1].role === 'user' && messages[messages.length - 1].content.toLowerCase().startsWith('/imagine')
                          ? 'Generating image... [ This may take some time depending on server load ]'
                          : messages.length > 0 && messages[messages.length - 1].role === 'user' && messages[messages.length - 1].image
                          ? 'Analyzing image... [ This may take some time depending on image complexity ]'
                          : 'Lyra Typing...'}
                      </span>
                    </div>
                  )}
                  {error && (
                    <div className={`text-red-400 font-mono text-sm p-2 border border-red-400 rounded ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        

        <div className="w-full absolute bottom-0 left-1/2 -translate-x-1/2 max-w-4xl px-3 pb-3 z-30">

                    <div className="text-center text-rose-200 mx-auto border-t border-l border-r border-rose-400/40 rounded-t-xl text-[12px] bg-rose-950/50 backdrop-blur-sm py-2.5 px-6 w-fit">
  {messageCount < 5 ? (
    <p>
      <span className='font-semibold text-white'>{5 - messageCount} credits remaining.</span> Need more credits? <u className='text-white font-semibold ml-1 cursor-pointer'>Buy Credits</u>
       {/* {(input.toLowerCase().startsWith('/imagine') || uploadedImage) && (
              <span className="block text-rose-300 mt-1">
                /imagine or image messages cost 2 credits
              </span>
            )} */}
    </p>
  ) : (
    <p>
      No credits left, {firstName}! Wait {Math.ceil(24 - (new Date() - new Date(lastResetTime)) / (1000 * 60 * 60))} hours for a reset!
    </p>
  )}
</div>


        <div className="bg-rose-950/10 backdrop-blur-lg border border-rose-200/20 rounded-[30px] py-4 px-6 transition-all duration-200" >
  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  
    {imagePreview && (
      <div className="relative inline-block">
        <img
          src={imagePreview}
          alt="Preview"
          className="h-20 w-20 object-cover rounded-lg border border-rose-200/40 cursor-pointer"
          onClick={() => setIsEnlargedPreviewOpen(true)}
        />
        <button
          type="button"
          onClick={removeImage}
          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    )}

    <textarea
      ref={textareaRef}
      value={input}
      onChange={(e) => {
        setInput(e.target.value);
        autoResizeTextarea();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault(); // prevent newline
          handleSubmit(e);    // manually submit
        }
      }}
      placeholder="Enter your message..."
      rows={1}
      className="flex-1 resize-none bg-transparent text-white placeholder-white/30 rounded-xl py-2 px-1 font-medium outline-none transition-all overflow-y-auto scrollbar-hide"
      style={{ lineHeight: "1.5rem", maxHeight: "7.5rem" }}
    />

      <div className="flex gap-2 items-center">
      <button
  type="button"
  disabled={isLoading}
  onClick={openModal}
  className="relative p-2 flex gap-2 text-sm rounded-full bg-rose-400/10 hover:bg-rose-300/30 text-white hover:text-rose-100 transition-colors border border-rose-100/30"
>
  {/* Icon wrapper becomes the group */}
  <span className="relative group">
    <Paperclip
      size={18}
      style={{ transform: 'rotate(-45deg)' }}
    />

    {/* Tooltip only appears when icon (span) is hovered */}
    <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-900/90 text-rose-100 backdrop-blur-lg text-xs font-semibold px-3 py-2 rounded-md hidden group-hover:block scale-95 group-hover:scale-100 transition-all whitespace-nowrap z-10 shadow-lg">
      Attach
    </span>
  </span>
</button>

        <button
          type="button"
          onClick={() => setShowOverlay(true)}
          className="group p-2 px-3 flex items-center rounded-full bg-rose-400/10 hover:bg-rose-300/20 text-white hover:text-rose-100 transition-colors border border-rose-100/30"
        >
          <Command size={18} className="mr-1.5 transition-all" />
          
          <span className="text-sm font- group-hover:block transition-all">
            Commands
          </span>
        </button>


        <div className="relative inline-block">
          {open && (
            <div className="absolute bottom-full mb-3 border border-rose-200/50 rounded-xl left-[145px] -translate-x-1/2 py-2.5 px-2.5 min-w-[280px] bg-rose-950/90 z-20 shadow-lg">
              <ul className="space-y-2">
                <li
                  onClick={() => {
                    const refreshToken = localStorage.getItem("spotify_refresh_token");
                    const accessToken = localStorage.getItem("spotify_access_token");

                    if (refreshToken && accessToken) {
                          window.location.href = '/lyratunes';
                        } else {
                          // Let Lyra speak first
                          setMessages((prev) => [
                            ...prev,
                            {
                              role: 'assistant',
                              content:
                                'O-oh! I-I need to verify and access your Spotify account first… make sure you’ve got the Spotify app installed, ‘kay? >:3 \n\n In about 5 seconds, a login page will pop up — just press "ALLOW" when it does',
                              time: Date.now(),
                            },
                          ]);

                          setTimeout(() => {
                            handleSpotifySignIn();
                          }, 5000);
                        }
                      }}
                      className="flex items-start gap-2 hover:text-rose-200 hover:bg-rose-900/40 rounded-lg py-3 px-2.5 cursor-pointer transition-colors"
                    >
                      <Music className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-semibold">LyraTunes</p>
                        <p className="text-xs font-normal text-rose-300">
                          Sync your Spotify & let Lyra handle it — play anything, just ask.
                        </p>
                      </div>
                    </li>

                <hr className="border border-white opacity-10" />

                <li
                  onClick={triggerCuriosityManually} // placeholder
                  className="flex items-start gap-2 py-3 px-2.5 hover:text-rose-200 hover:bg-rose-900/40 rounded-lg cursor-pointer transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-semibold">Lyra's Curiosity</p>
                    <p className="text-xs font-normal text-rose-300">
                      Answer Lyra’s questions to help her learn and grow smarter.
                    </p>
                  </div>
                </li>

                <hr className="border border-white opacity-10" />

                <li
                  onClick={resetChat} // placeholder
                  className="flex items-start gap-2 py-2.5 px-2.5 bg-red-600/20 border border-red-500 hover:text-rose-200 hover:bg-red-600 rounded-lg cursor-pointer transition-colors"
                >
                  <Trash2 size={15} className="mt-[0.5px]" />
                  <div>
                    <p className="text-[13px] font-semibold">Delete Conversation</p>
                  </div>
                </li>
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="group p-2 flex items-center rounded-full bg-rose-400/10 hover:bg-rose-300/20 text-white hover:text-rose-100 transition-colors border border-rose-100/30"
          >
            <MoreHorizontal size={18} className={`mr-0 ${open ? "mr-1.5" : ""} group-hover:mr-1.5 transition-all`} />
            <span className={`text-sm font-semibold ${open ? "block" : "hidden"} group-hover:block mr-0 pr-2 pl-0.5 transition-all`}>
              Extras
            </span>
            <span className={`absolute ${open ? 'group-hover:hidden' : ''} bottom-12 -translate-x-1 bg-rose-900/90 text-rose-100 backdrop-blur-lg text-xs text-left font-semibold px-3 py-2 rounded-md hidden group-hover:block scale-95 group-hover:scale-100 transition-all whitespace-nowrap z-10 shadow-lg`}>
              Access New Features ( LyraTunes,<br /> Lyra's curiosity )
            </span>
          </button>
        </div>

        <div className="flex-1" />

<button
          type="button"
          onClick={isRecording ? stopSpeechRecognition : startSpeechRecognition}
          disabled={isRecording || messageCount >= 5}
          className={`p-2 rounded-full transition-colors border border-rose-100/20 ${
            isRecording || messageCount >= 5
              ? 'bg-rose-100/5 text-gray-400 border-rose-100/5 cursor-not-allowed'
              : 'bg-rose-400/10 text-white hover:bg-rose-400/20 hover:text-rose-100'
          }`}
        >
          <span className="relative group">
            <Mic size={19} className={isRecording ? 'animate-pulse' : ''} />
            <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-900/90 text-rose-100 backdrop-blur-lg text-xs font-semibold px-3 py-2 rounded-md hidden group-hover:block scale-95 group-hover:scale-100 transition-all whitespace-nowrap z-10 shadow-lg">
              {isRecording ? 'Stop Detecting' : 'Detect'}
            </span>
          </span>
        </button>
<button
                type="submit"
                
                className={`p-2 rounded-full flex items-center justify-center transition-all outline-none ${
                  isLoading || (!input.trim() && !uploadedImage) || messageCount >= 5
                    ? 'bg-rose-100/5 text-gray-400 border border-rose-100/5 cursor-not-allowed'
                    : 'bg-rose-400/10 text-white hover:bg-rose-300/20 hover:text-rose-100 border border-rose-100/30'
                }`}
              >
                <span className="relative group">
                  <ArrowUp strokeWidth={4} size={19} />
                  {(input || uploadedImage) && (
                    <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-950/90 text-rose-100 backdrop-blur-lg text-xs font-semibold px-3 py-2 rounded-md hidden group-hover:block scale-95 group-hover:scale-100 transition-all whitespace-nowrap z-10 shadow-lg">
                      <span className={`${messageCount >= 5 ? 'hidden' : ''}`}>Send</span><span className={`${messageCount >= 5 ? '' : 'hidden'}`}>Out of credits. Buy some credits or come back tomorrow</span>
                    </span>
                  )}
                </span>
              </button>
      </div>
    </form>
  </div>
  <p className='text-center text-rose-200/80 text-xs mt-3 mb-1'>Lyra is for kind and supportive chats—please keep things respectful.</p>
</div>



<div className={`fixed left-0 w-full transition-all duration-300 ${isDebugOpen ? 'top-0 h-full' : 'top-[-100%] h-0'} ${isDark ? 'bg-rose-950/90 backdrop-blur-xl border-b-rose-500 border-t-0 border-b border-b-2' : 'bg-rose-50 border-t-0 border-gray-200 border-b border-b-2 border-b-rose-200'} border-t z-50 overflow-hidden flex flex-col items-center`}>
  <div className="flex items-center justify-between px-4 py-3 w-full max-w-5xl">
    <div className={`${isDark ? 'text-rose-200' : 'text-rose-500'} flex items-center gap-2`}>
      <Bug size={18} fill='currentColor' className='mt-[-1.5px] mr-0.5' />
      <span className={`${isDark ? 'text-rose-200 font-bold' : 'text-rose-500'} font-mono text-sm`}>Debug Console</span>
    </div>
    <button onClick={toggleDebug} className={`p-1 font-semibold ${isDark ? 'text-rose-200 hover:text-rose-300' : 'text-rose-500 hover:text-rose-600'} transition-colors`}>
      {isDebugOpen ? 'Close' : 'Close'}
    </button>
  </div>
  {isDebugOpen && (
    <div className="h-[calc(100%-2.5rem)] overflow-y-auto px-4 py-2 pb-6 w-full max-w-5xl">
      {debugLogs.length === 0 ? <p className="text-rose-500 text-sm">No logs yet...</p> : debugLogs.map((log) => (
        <div key={log.id} className={`text-sm font-mono mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.category === 'chat' ? 'text-blue-400' : log.category === 'api' ? 'text-purple-400' : 'text-gray-400'}`}>
          <div className={`${isDark ? 'bg-black/20' : 'bg-rose-200/30'} p-2.5 rounded-md text-xs mb-3 z-0`}>
            <span>[{log.timestamp}] </span><span>[{log.category.toUpperCase()}] </span><span>{log.message}</span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>



        {/* Scroll down button */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className={`fixed bottom-28 right-8 p-3 rounded-full shadow-lg z-[100] ${
              isDark ? 'bg-rose-800 text-rose-200 hover:bg-rose-700' : 'bg-rose-300 text-white hover:bg-rose-400'
            }`}
            title="Scroll to bottom"
          >
            <ArrowDown size={24} strokeWidth={3} />
          </button>
        )}

        {isEnlargedPreviewOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
            <div className="relative max-w-[90%] max-h-full">
              <img src={selectedChatImage || imagePreview} alt="Enlarged Preview" className="max-w-full max-h-full rounded-3xl" />
              <button
                onClick={() => { setIsEnlargedPreviewOpen(false); setSelectedChatImage(null); }}
                className="absolute top-4 right-4 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* NSFW Warning Popup */}
      {showNSFWPopup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-rose-900 via-rose-950/20 to-transparent backdrop-blur-sm md:rounded-2xl p-10 py-20 md:p-12 border border-rose-800 text-white animate-fade-in space-y-5">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl md:text-3xl font-bold tracking-wide">
                Inappropriate Content Detected!
              </h3>
            </div>
            <img
              src={Lyra}
              alt="Sad Chat Icon"
              className="w-full h-60 object-cover mx-auto opacity-90"
            />
            <p className="text-sm md:text-base text-white/90 leading-relaxed text-left">
              Eek! That <b className='text-rose-300'>/imagine</b> command looks a bit too spicy 🌶️. Let’s keep things kind and safe, okay? Try something else! 
            </p>
            <hr className="py-1 opacity-20" />
            <div className="flex justify-left">
              <button
                onClick={() => setShowNSFWPopup(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-semibold transition text-white"
              >
                Okay, I’ll Try Again ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Overlay */}
      {banUntil && new Date() < new Date(banUntil) && (
        <div className="ban-overlay fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-rose-900 via-rose-950/20 to-transparent backdrop-blur-sm md:rounded-2xl p-10 py-20 md:p-12 border border-rose-800 text-white animate-fade-in space-y-5">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl md:text-3xl font-bold tracking-wide">
                Account Suspended, <span className="text-rose-300">{user?.displayName}!</span>
              </h3>
            </div>
            <img
              src={Lyra}
              alt="Sad Chat Icon"
              className="w-full h-60 object-cover mx-auto opacity-90"
            />
            <p className="text-sm md:text-base text-white/90 leading-relaxed text-left">
              Oh no! Your account has been suspended for attempting to generate inappropriate content. You’ll be back in{' '}
              <span className="text-rose-400 font-semibold">{getRemainingBanTime()}</span>. Please keep things kind and safe next time!
            </p>
            <hr className="py-1 opacity-20" />
            <p className="text-xs text-rose-200/80 text-center">
              This suspension cannot be dismissed. Contact support if you believe this is an error.
            </p>
          </div>
        </div>
      )}

      {showBanOverlay && (
        <div className="ban-overlay fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center">
          <div className="relative max-w-2xl w-full bg-gradient-to-br from-rose-900 via-rose-950/20 to-transparent backdrop-blur-sm md:rounded-2xl p-10 py-20 md:p-12 border border-rose-800 text-white animate-fade-in space-y-5">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl md:text-3xl font-bold tracking-wide">
                Account Suspended, <span className="text-rose-300">{user?.displayName}!</span>
              </h3>
            </div>
            <img
              src={Lyra}
              alt="Sad Chat Icon"
              className="w-full h-60 object-cover mx-auto opacity-90"
            />
            <p className="text-sm md:text-base text-white/90 leading-relaxed text-left">
              Oh no! Your account has been suspended for attempting to generate inappropriate content. You’ll be back in{' '}
              <span className="text-rose-400 font-semibold">{getRemainingBanTime()}</span>. Please keep things kind and safe next time!
            </p>
            <hr className="py-1 opacity-20" />
            <p className="text-xs text-rose-200/80 text-center">
              This suspension cannot be dismissed. Contact support if you believe this is an error.
            </p>
          </div>
        </div>
      )}

        {/* Credits Expired Popup */}
      {showCreditsPopup && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center">
    <div className="relative max-w-2xl w-full bg-gradient-to-br from-rose-900 via-rose-950/20 to-transparent backdrop-blur-sm md:rounded-2xl p-10 py-20 md:p-12 border border-rose-800 text-white animate-fade-in space-y-5">
      {/* Icon + Bigger Heading */}
      <div className="flex items-center gap-2">
        <h3 className="text-2xl md:text-3xl font-bold tracking-wide">
          Out of Credits, <span className="text-rose-300">{user?.displayName}!</span>
        </h3>
      </div>

      {/* Illustration */}
      <img
        src={Lyra}
        alt="Sad Chat Icon"
        className="w-full h-60 object-cover mx-auto opacity-90"
      />

      {/* Message */}
      <p className="text-sm md:text-base text-white/90 leading-relaxed text-left">
        {messageCount === 4 && (input.toLowerCase().startsWith('/imagine') || uploadedImage) ? (
          <>
            Oh no, {user?.displayName}! You only have <span className="text-rose-300 font-semibold">1 credit</span> left, but{' '}
            <span className="text-rose-400 font-semibold">image generation or image containing messages cost 2 credits</span>. You can send a regular message (1 credit) or wait{' '}
            <span className="text-rose-400 font-semibold">
              {Math.ceil(24 - (new Date() - new Date(lastResetTime)) / (1000 * 60 * 60))} hours
            </span>{' '}
            for your credits to reset! 💬⚡
          </>
        ) : (
          <>
            You’ve used all <span className="text-rose-300 font-semibold">5 credits</span> for today. I’d love to keep chatting, but I need a quick recharge 💬⚡. Your credits will reset in{' '}
            <span className="text-rose-400 font-semibold">
              {Math.ceil(24 - (new Date() - new Date(lastResetTime)) / (1000 * 60 * 60))} hours
            </span>.
          </>
        )}
      </p>

      <hr className="py-1 opacity-20" />

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row justify-left gap-3">
        <a
          href="/buy-credits"
          className="px-5 py-3 gap-2 bg-rose-700 flex hover:bg-rose-800 rounded-lg text-sm font-semibold text-white text-center transition shadow hover:shadow-lg"
        >
          <Coins size={19} /> Buy More Credits
        </a>
        <button
          onClick={() => setShowCreditsPopup(false)}
          className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-semibold transition text-white"
        >
          I'll Wait ✨
        </button>
      </div>
    </div>
  </div>
)}



{isSettingsOpen && (
  <>
    {/* Backdrop Blur Overlay */}
    <div
      className="fixed inset-0 z-40 backdrop-blur-md bg-black/80"
      onClick={() => setIsSettingsOpen(false)}
    />

    {/* Settings Panel */}
    <div className="fixed sm:inset-0 z-50 w-full absolute bottom-0 h-[70%] sm:max-w-4xl sm:h-1/2 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 rounded-t-3xl sm:rounded-3xl bg-rose-950/50 backdrop-blur-xl border border-white/10 text-white shadow-xl overflow-hidden flex flex-col sm:flex-row animate-fadeIn sm:animate-none">
      
      {/* Mobile Tab Navigation */}
      <div className="sm:hidden bg-rose-950/70 px-8 border-b sm:border-b-0 sm:border-r border-white/10 p-4 flex justify-between items-center">
        <h2 className="text-base font-semibold">Settings</h2>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="bg-rose-900/50 w-48 text-white text-sm rounded-lg p-2"
        >
          <option value="account">Account</option>
          <option value="customize">Customize</option>
          <option value="notifications">Notifications</option>
          <option value="privacy">Privacy</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Sidebar Tabs (Desktop) */}
      <div className="hidden sm:block w-full sm:w-1/4 bg-rose-950/70 border-r border-white/10 p-4 space-y-2">
        <h2 className="text-lg ml-4 py-2 font-semibold mb-4">Settings</h2>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab("account")}
            className={`w-full flex gap-2 text-left text-sm px-4 py-2 rounded-lg transition-all ${
              activeTab === "account" ? "bg-white/5 font-bold" : ""
            }`}
          >
            <User2 size={17} className="mt-[1px]" /> Account
          </button>
          <button
            onClick={() => setActiveTab("customize")}
            className={`w-full text-left flex gap-2 text-sm px-4 py-2 rounded-lg transition-all ${
              activeTab === "customize" ? "bg-white/5 font-bold" : ""
            }`}
          >
            <PaintBucket size={17} className="mt-[1px]" /> Customize
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full text-left flex gap-2 text-sm px-0 pl-3.5 py-2 rounded-lg transition-all ${
              activeTab === "notifications" ? "bg-white/5 font-bold" : ""
            }`}
          >
            <BellDot size={17} className="mt-[1px]" /> Notifications
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`w-full text-left flex gap-2 text-sm px-4 py-2 rounded-lg transition-all ${
              activeTab === "privacy" ? "bg-white/5 font-bold" : ""
            }`}
          >
            <Lock size={17} className="mt-[1px]" /> Privacy
          </button>
          <button
            onClick={() => setActiveTab("advanced")}
            className={`w-full text-left flex gap-2 text-sm px-4 py-2 rounded-lg transition-all ${
              activeTab === "advanced" ? "bg-white/5 font-bold" : ""
            }`}
          >
            <Settings size={17} className="mt-[1px]" /> Advanced
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-8 sm:px-10 py-8 sm:py-12 relative overflow-y-auto ">
        {/* Close Icon */}
        <button
          className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-rose-800/10 p-2 text-xl rounded-full"
          onClick={() => setIsSettingsOpen(false)}
        >
          <X size={20} />
        </button>

        {activeTab === "account" && (
          <div>
            <h3 className="text-base sm:text-md font-semibold mb-6">Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-row-2 gap-4">
              {/* Profile Picture */}
        <div className="flex items-center gap-4 col-span-2">
          <div className="w-24 h-24 rounded-full bg-rose-900/50 flex items-center justify-center overflow-hidden">
            <img
              src={user.photoURL || 'https://via.placeholder.com/40'}
              alt="Profile"
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        </div>

        {/* Name */}
        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">Name</label>
          <input
            type="text"
            placeholder={displayName}
            disabled
            className="w-full mt-1 bg-rose-900/10 border placeholder:text-rose-200/90 font-semibold border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Email */}
        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">Email Address</label>
          <div className="w-full mt-1 flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder={user.email}
              className="w-full bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
            />

            <div className="flex flex-col mt-[-24px] w-full">
              <label className="text-xs sm:text-sm text-white/70">Status</label>
              
              <div
                className={`mt-1 w-full bg-rose-900/10 border border-white/10 rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 ${
                  user.emailVerified ? "text-green-400/90" : "text-red-400/90"
                }`}
              >
                {user.emailVerified ? (
                  <>
                    <CheckCircle size={14} className="text-green-400" />
                    Verified
                  </>
                ) : (
                  <>
                    <XCircle size={20} className="text-red-400" />
                    Not Verified
                  </>
                )}
              </div>
            </div>
          </div>
        </div>





        {/* Region */}
        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">Region</label>
          <input
            type="text"
            disabled
            placeholder={`${region}, ${country}`}
            className="w-full mt-1 bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        {/* Timezone */}
        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">Timezone</label>
          <div className="w-full mt-1 flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder={timezone}
              className="w-full bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
            />
            <div className="flex flex-col mt-[-24px] w-full">
              <label className="text-xs sm:text-sm text-white/70">Time</label>
              <input
                type="text"
                disabled
                placeholder={time}
                className="mt-1 w-full bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Linked Accounts */}
        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">
            Linked Accounts
          </label>
          <div className="w-full mt-0 flex items-center gap-3">
          <input
            type="text"
            disabled
            placeholder={
              linkedProviders.length > 0
                ? linkedProviders.map(getProviderName).join(', ')
                : 'None'
            }
            className="w-full mt-1 bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
          />
          <div className="flex flex-col mt-[-24px] w-full">
              <label className="text-xs sm:text-sm text-white/70">Created At</label>
              <input
                type="text"
                disabled
                placeholder={creationDate}
                className="mt-1 w-full bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* LyraLabs ID */}
        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">LyraLabs ID</label>
          <div className="w-full mt-1 flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder={`${user.uid.slice(0, 22)}...`}
              className="w-full bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
            />
          <div className='relative group'>
            <button
                onClick={handleCopy}
                className="text-white hover:text-rose-300 transition p-2 rounded-lg border border-white/10"
              >
                {copied ? (
                  <Check size={16} className="animate-fadeIn" />
                ) : (
                  <Copy size={16} className='animate-fadeIn'/>
                )}
              </button>
              {/* Tooltip only appears when icon (span) is hovered */}
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-rose-900/90 text-rose-100 backdrop-blur-lg text-xs font-semibold px-3 py-2 rounded-md hidden group-hover:block scale-95 group-hover:scale-100 transition-all whitespace-nowrap z-10 shadow-lg">
                {copied ? 'Copied ID' : 'Copy ID'}
              </span>
          </div>
          </div>
        </div>

        <div className='col-span-2 sm:col-span-1'>
          <label className="text-xs sm:text-sm text-white/70">Last Logged In</label>
          <div className="w-full mt-1 flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder={user?.metadata.lastSignInTime}
              className="w-full bg-rose-900/10 border border-white/10 placeholder:text-rose-200/90 font-semibold rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Change Password (Email/Password users only) */}
        <div className="col-span-2">
          <hr className="mt-4 mb-6 border-white/10" />
          <h1 className="text-base text-rose-400 font-bold">Change Password</h1>
          <p className="text-xs text-white/50 mt-1 mb-2.5">
            Update your account password.
          </p>
          {!isEmailPasswordUser && (
            <small className="flex items-start px-4 py-3 bg-white/5 text-red-500/80 font-semibold rounded-lg gap-2 ">
              <AlertTriangle size={17} strokeWidth={3} className="mt-0 shrink-0 text-red-500" />
              <span className="text-xs mt-[1px] leading-snug">
                You can't change your password because your account was created using{' '}
                <span className="font-bold text-red-500 underline">
                  {linkedProviders.map(getProviderName).join(', ')}
                </span>
                .
              </span>
            </small>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3  mt-3 grid grid-cols-2">
            <div>
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={!isEmailPasswordUser}
                className="w-full bg-rose-900/50 mt-2 text-[12px] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <a
                href={isEmailPasswordUser ? "/forgot-password" : undefined}
                onClick={(e) => {
                  if (!isEmailPasswordUser) e.preventDefault();
                }}
                className={isEmailPasswordUser ? "text-[10.2px] text-rose-200/70" : "cursor-not-allowed text-[10.2px] text-rose-200/70"}
              >
                Forgot Password?
              </a>
            </div>
            <div>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={!isEmailPasswordUser}
                className="w-full ml-2 mt-[-4px] text-[12px] bg-rose-900/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
            <button
              type="submit"
              disabled={!isEmailPasswordUser}
              className="flex text-xs bg-rose-600/50 gap-2 hover:bg-rose-600/60 transition-all font-semibold px-6 py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock strokeWidth={3} size={15} />
              Update Password
            </button>
            </div>
          </form>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          {success && <p className="text-xs text-green-400 mt-2">{success}</p>}
        </div>

        <hr className="py-2 mt-4 border-white/10 col-span-2" />

        {/* Delete Account */}
        <div className='col-span-2'>
          <h1 className="text-base text-red-400 font-bold">Delete Account</h1>
          <p className="text-xs text-white/50 mt-1">
            Permanently delete your account and all associated data.
          </p>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="flex text-xs bg-red-600/50 gap-2 hover:bg-red-600/60 transition-all font-semibold px-6 py-2.5 mt-3 rounded-md"
          >
            <Trash2 strokeWidth={2} size={15} />
            Delete Account
          </button>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          {success && <p className="text-xs text-green-400 mt-2">{success}</p>}
        </div>
      </div>
    </div>
        )}

        {activeTab === "customize" && (
          <div>
            <h3 className="text-base sm:text-md font-semibold mb-6">Customize</h3>
            <p className='text-sm bg-rose-600/20 py-3.5 px-4 border border-rose-600 rounded-lg flex gap-2'><AlertCircle size={19} strokeWidth={3} className='mt-0 text-rose-300 ' /> Currently we don't have any accent color or light mode but they will arrive soon on later patches.</p>
            <div className="space-y-4 mt-3">
              {/* Theme Toggle */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-xs sm:text-sm">Dark Mode</span>
                <label className="relative inline-flex items-center cursor-not-allowed">
                <input
                  type="checkbox"
                  disabled
                  className="sr-only peer"
                  checked={privacySettings.darkMode}
                  onChange={(e) => updatePrivacySetting('darkMode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-800/50 transition-all duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300 opacity-40"></div>
              </label>
              </div>

              {/* Color Accent */}
              <div className="py-3">
                <span className="text-xs sm:text-sm">Accent Color</span>
                <div className="flex gap-2 mt-2">
                  {["rose"].map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full cursor-not-allowed bg-${color}-500/40 border border-${color}-300 flex items-center justify-center text-${color}-800 text-[10px]`}
                    >
                      <Lock strokeWidth={3} className={`w-2.5 h-2.5 text-${color}-300 `} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div>
            <h3 className="text-base sm:text-md font-semibold mb-6">Notifications</h3>
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-xs sm:text-sm">Email Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.emailNotifications}
                    onChange={(e) => updatePrivacySetting('emailNotifications', e.target.checked)}
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
                </label>
              </div>

              {/* Push Notifications */}
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-xs sm:text-sm">Push Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.pushNotifications}
                    onChange={(e) => updatePrivacySetting('pushNotifications', e.target.checked)}
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
                </label>
              </div>

              {/* Sound Alerts */}
              <div className="flex justify-between items-center py-3">
                <span className="text-xs sm:text-sm">Sound Alerts</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.alertSound}
                    onChange={(e) => updatePrivacySetting('alertSound', e.target.checked)}
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
        <div>
          <h3 className="text-base sm:text-md font-semibold mb-6 text-white/90">Privacy</h3>
          {error && (
            <p className="text-sm mb-6 text-red-400 border border-red-400 bg-red-900/20 p-2 rounded">
              {error}
            </p>
          )}
          <div className="space-y-5">
            {/* Share Usage Data */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-white/80">Share Usage Data</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={privacySettings.shareUsageData}
                  onChange={(e) => updatePrivacySetting('shareUsageData', e.target.checked)}
                  disabled={isLoading}
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
              </label>
            </div>

            {/* Public Profile */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-white/80">Public Profile</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={privacySettings.publicProfile}
                  onChange={(e) => updatePrivacySetting('publicProfile', e.target.checked)}
                  disabled={isLoading}
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
              </label>
            </div>

            {/* Activity Status */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-white/80">Show Online Status</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={privacySettings.showOnlineStatus}
                  onChange={(e) => updatePrivacySetting('showOnlineStatus', e.target.checked)}
                  disabled={isLoading}
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
              </label>
            </div>

            {/* Ad Personalization */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-white/80">Ad Personalization</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={privacySettings.adPersonalization}
                  onChange={(e) => updatePrivacySetting('adPersonalization', e.target.checked)}
                  disabled={isLoading}
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-rose-500 transition-all duration-300"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300"></div>
              </label>
            </div>

            {/* Download My Data */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-white/80">Download My Data</span>
              <button
                onClick={handleDataExport}
                className="text-sm font-medium text-rose-400 hover:text-rose-300 transition"
                disabled={isLoading}
              >
                Request Export
              </button>
            </div>

            {/* Clear Search History */}
            <div className="flex justify-between items-center py-3">
              <span className="text-xs sm:text-sm text-white/80">Clear Search History</span>
              <button
                onClick={resetChat}
                className="text-sm font-medium text-rose-400 hover:text-rose-300 transition"
                disabled={isLoading}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

        {activeTab === "advanced" && (
          <div>
            <h3 className="text-base sm:text-md font-semibold mb-6">Advanced Settings</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-b-white/10">
            <span className="text-xs sm:text-sm">Clear Cache</span>
            <button
              className="text-sm text-rose-400 hover:text-rose-300"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload(); // optionally refresh to reset state
              }}
            >
              Clear Now
            </button>
            </div>

              {/* Reset Settings */}
              <div className="flex justify-between items-center py-3">
                <span className="text-xs sm:text-sm">Reset All Settings</span>
                <button className="text-sm text-red-400 hover:text-red-300"
                onClick={() => {
                  setPrivacySettings({
                    shareUsageData: true,
                    publicProfile: false,
                    showOnlineStatus: true,
                    adPersonalization: true,
                    darkMode: true,
                    emailNotifications: true,
                    pushNotifications: false,
                    alertSound: false,
                  });
                }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    <DeleteAccountModal
      user={user}
      isOpen={isDeleteModalOpen}
      onClose={() => setDeleteModalOpen(false)}
      setSuccess={setSuccess}
      setError={setError}
    />
  </>
)}

        {showOverlay && <CommandsOverlay onClose={() => setShowOverlay(false)} />}

        <audio ref={audioRef} />
        <ImageUploadModal isModalOpen={isModalOpen} closeModal={closeModal} handleImageChange={handleImageChange} isDark={isDark} />
      </div>
      
    </div>
    
  );
}

export default Playground;
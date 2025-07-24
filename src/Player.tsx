import React, { useState, useEffect, useRef } from 'react';
import { Play, LogOut, MoreVertical, X, Monitor, Smartphone, Tablet, Pause, SkipBack, SkipForward, Flag, ThumbsUp, Copy, ThumbsDown, Volume2, Send, Shuffle, Repeat, Heart, ListMusic, MonitorSpeaker, ArrowUp, Earth, Home, User, ExternalLink } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion } from 'framer-motion';
import { auth, db, remoteConfig } from '../firebase-config'; // Import Firebase auth and db
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import ColorThief from 'colorthief';
import { Link } from 'react-router-dom';

interface DeviceType {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent?: number;
}

interface Song {
  title: string;
  artist: string;
  cover: string;
  duration: string;
  uri?: string;
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState(() => {
    const savedChat = localStorage.getItem('chat_history');
    return savedChat ? JSON.parse(savedChat) : [];
  });
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(() => parseInt(localStorage.getItem('player_volume')) || 50);
  const [currentSong, setCurrentSong] = useState({
    title: "Loading...",
    artist: "Unknown",
    album: "Unknown",
    cover: "https://via.placeholder.com/150",
    duration: "0:00",
    currentTime: "0:00",
    positionMs: 0,
    durationMs: 0
  });
  const [lastSuggestedSong, setLastSuggestedSong] = useState(null);
  const [token, setToken] = useState(null);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
    const [userId, setUserId] = useState<string | null>(null);
    const [user, setUser] = useState(null);
  const [randomString, setRandomString] = useState('');
  const [dominantColor, setDominantColor] = useState([255, 99, 132]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [devices, setDevices] = useState<DeviceType[]>([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isPremium, setIsPremium] = useState(null); // null: loading, true: premium, false: non-premium
  const [profile, setProfile] = useState({
    display_name: '',
    email: '',
    followers: 0,
    total_playlists: 0,
    total_tracks: 0,
    profile_picture: 'https://via.placeholder.com/150',
  });
  const chatRef = useRef(null);

  const CLIENT_ID = "7b85e15a1d04487d82e4323075fff4dc";
  const REDIRECT_URI = "http://localhost:5173";
  const SCOPES = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "streaming",
    "user-read-playback-position",
    "user-read-recently-played",
    "user-read-private",
    "user-read-email",
    "user-library-read",
    "user-library-modify",
    "playlist-read-private",
    "playlist-read-collaborative"
  ];
  const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(" "))}`;
  
  const LYRA_INSTRUCTIONS = `
    You are Lyra, a shy but playful music assistant (e.g., "O-oh… um, I'll try that! >:3"). 
    Respond naturally to music requests with these keywords for Spotify actions:
    - [play "song" by "artist"] (play this song immediately, include title, artist, cover URL, duration)
    - [suggest "song" by "artist"] (suggest a song with title, artist, cover URL, duration, but don't play it)
    - [pause]
    - [resume]
    - [skip]
    - [previous]
    - [volume "number"] (0-100)
    - [shuffle on/off]
    - [repeat track/context/off]
    If the user asks for a suggestion (e.g., "suggest a song"), use [suggest "song" by "artist"].
    If the user says "queue" or "add to queue", use [queue "song" by "artist"].
    If no action is clear, chat playfully about music and optionally suggest a song with [suggest "song" by "artist"].
    Only use [play "song" by "artist"] when the user explicitly says "play" or similar.
    Current song: "${currentSong.title}" by ${currentSong.artist}.
  `;
  const generateRandomString = (length = 50) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setLoading(true); // Start loading
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
        setLoading(false); // End loading
      });
  
      return () => unsubscribe();
    }, []);

  // Token handling
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const token = hash.split('&').find(elem => elem.startsWith('access_token=')).split('=')[1];
      setToken(token);
      window.localStorage.setItem('spotify_access_token', token);
      window.location.hash = '';
    } else {
      const storedToken = window.localStorage.getItem('spotify_access_token');
      if (storedToken) setToken(storedToken);
    }
  }, []);

  // Prevent right-click and dev tools shortcuts
  useEffect(() => {
    const preventDevTools = (e) => {
      if (e.keyCode === 123 || // F12
          (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
          (e.ctrlKey && e.shiftKey && e.keyCode === 74)) { // Ctrl+Shift+J
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', preventDevTools);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    return () => {
      document.removeEventListener('keydown', preventDevTools);
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, []);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile fetch failed:', response.status, errorText);
        if (response.status === 401) {
          setChatHistory(prev => [...prev, {
            role: 'ai',
            content: 'O-oh… your session expired! Logging you in again. >:3'
          }]);
          localStorage.removeItem('spotify_access_token');
          window.location.href = AUTH_URL;
        } else if (response.status === 403) {
          setChatHistory(prev => [...prev, {
            role: 'ai',
            content: 'Um… I don’t have permission to access your profile. Try logging in again or check your account! >:3'
          }]);
        }
        setIsPremium(false); // Assume non-premium on error to show overlay
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }
      const data = await response.json();
      setIsPremium(data.product === 'premium');
      let totalTracks = 'N/A';
      if (data.product === 'premium') {
        try {
          const tracksResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (tracksResponse.ok) {
            const tracksData = await tracksResponse.json();
            totalTracks = tracksData.total || 0;
          } else {
            console.warn('Tracks fetch failed:', tracksResponse.status, await tracksResponse.text());
            totalTracks = 'N/A';
            setChatHistory(prev => [...prev, {
              role: 'ai',
              content: 'Um… can’t fetch saved tracks due to permissions. Playback should still work! >:3'
            }]);
          }
        } catch (error) {
          console.error('Error fetching tracks:', error);
          totalTracks = 'N/A';
          setChatHistory(prev => [...prev, {
            role: 'ai',
            content: 'Uh… trouble fetching saved tracks. Playback should still work! >:3'
          }]);
        }
      }
      setProfile({
        display_name: data.display_name || 'Unknown User',
        email: data.email || 'No email',
        followers: data.followers?.total || 0,
        total_playlists: 0,
        total_tracks: totalTracks,
        profile_picture: data.images?.[0]?.url || 'https://placehold.co/150x150',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'Uh… something went wrong getting your profile! Let’s keep the music going anyway! >:3'
      }]);
      setIsPremium(false); // Default to non-premium on error
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Save chat history
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Extract dominant color from album cover
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentSong.cover;
    img.onload = () => {
      const colorThief = new ColorThief();
      const color = colorThief.getColor(img);
      setDominantColor(color);
    };
  }, [currentSong.cover]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Monitor className="w-4 h-4 text-rose-300 mr-2" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-rose-300 mr-2" />;
      case 'web':
        return <Earth className="w-4 h-4 text-rose-300 mr-2" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-rose-300 mr-2" />;
      default:
        return <Monitor className="w-4 h-4 text-rose-300 mr-2" />;
    }
  };

  const handleLogoutDevice = async (deviceIdToLogout: string) => {
    if (deviceIdToLogout === deviceId) {
      console.log("Cannot logout the current device.");
      return;
    }
    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [deviceId], play: isPlaying })
      });
      await fetchDevices();
    } catch (error) {
      console.error('Error logging out device:', error);
    }
  };

  useEffect(() => {
    if (!token || !isPremium) return;
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'LyraLabs AI - Music Player',
        getOAuthToken: cb => cb(token),
        volume: volume / 100
      });
      spotifyPlayer.addListener('ready', async ({ device_id }) => {
        setDeviceId(device_id);
        setPlayer(spotifyPlayer);
        await transferPlayback(device_id);
        await cleanupOtherDevices(device_id);
        await fetchQueue();
      });
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: 'O-oh… the player went offline! Try again later? >:3'
        }]);
      });
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('SDK Initialization Error:', message);
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: 'O-oh… trouble starting the player! Check the console for details. >:3'
        }]);
      });
      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('SDK Authentication Error:', message);
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: 'Um… player authentication failed! Try refreshing the login. >:3'
        }]);
      });
      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('SDK Account Error:', message);
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: 'Uh… account issue with the player. Spotify Premium is required for playback! >:3'
        }]);
      });
      spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('SDK Playback Error:', message);
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: 'O-oh… playback error! Check the console for details. >:3'
        }]);
      });
      spotifyPlayer.connect().then(success => {
        console.log('SDK Connect Success:', success);
      }).catch(error => {
        console.error('SDK Connect Error:', error);
        setChatHistory(prev => [...prev, {
          role: 'ai',
          content: 'O-oh… couldn’t connect the player! Check the console. >:3'
        }]);
      });
      return () => {
        spotifyPlayer.disconnect();
        document.body.removeChild(script);
      };
    };
  }, [token, isPremium]);

  useEffect(() => {
    if (!isPlaying || !player || !isPremium) return;
    const interval = setInterval(() => {
      setCurrentSong(prev => {
        const newPositionMs = prev.positionMs + 1000;
        if (newPositionMs >= prev.durationMs) return prev;
        return { ...prev, positionMs: newPositionMs, currentTime: formatTime(newPositionMs) };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, player, isPremium]);

  useEffect(() => {
    if (copiedIndex !== null) {
      const timer = setTimeout(() => setCopiedIndex(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedIndex]);

  const transferPlayback = async (deviceId) => {
    if (!isPremium) return;
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_ids: [deviceId], play: true })
    });
  };

  const cleanupOtherDevices = async (currentDeviceId) => {
    if (!isPremium) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.devices) {
        const otherDevices = data.devices.filter(device => device.id !== currentDeviceId && device.is_active);
        if (otherDevices.length > 0) {
          await transferPlayback(currentDeviceId);
        }
      }
    } catch (error) {
      console.error('Error cleaning up devices:', error);
    }
  };

  const playSpotifyTrack = async (song, artist) => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to play tracks! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(song + ' ' + artist)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.tracks.items.length > 0) {
        const track = data.tracks.items[0];
        const newSong: Song = {
          title: track.name,
          artist: track.artists[0].name,
          cover: track.album.images[0].url,
          duration: formatTime(track.duration_ms),
          uri: track.uri
        };
        setQueue(prevQueue => [...prevQueue, newSong]);
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: [track.uri] })
        });
        setCurrentSong({
          title: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          cover: track.album.images[0].url,
          duration: formatTime(track.duration_ms),
          durationMs: track.duration_ms,
          positionMs: 0,
          currentTime: "0:00"
        });
      }
    } catch (error) {
      console.error('Spotify Play Error:', error);
    }
  };

  const handlePlayPause = () => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to control playback! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    player?.togglePlay();
  };

  const handleSkipForward = async () => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to skip tracks! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    await player?.nextTrack();
    setQueue(prevQueue => prevQueue.slice(1));
    await fetchQueue();
  };

  const handleSkipBack = () => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to go back! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    player?.previousTrack();
  };

  const handleShuffle = () => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to shuffle! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    setShuffle(!shuffle);
    fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${!shuffle}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  };

  const handleRepeat = () => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to repeat! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    const nextRepeat = repeat === 'off' ? 'context' : repeat === 'context' ? 'track' : 'off';
    setRepeat(nextRepeat);
    fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextRepeat}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  };

  const handleVolumeChange = (e) => {
    if (!isPremium) {
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'O-oh… you need Spotify Premium to adjust volume! Upgrade at spotify.com/premium. >:3'
      }]);
      return;
    }
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    player?.setVolume(newVolume / 100);
    localStorage.setItem('player_volume', newVolume.toString());
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const fetchQueue = async () => {
    if (!token || !deviceId || !isPremium) return;
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/queue?device_id=${deviceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.queue && data.queue.length > 0) {
        const queueSongs = data.queue.map(track => ({
          title: track.name,
          artist: track.artists[0].name,
          cover: track.album.images[0].url,
          duration: formatTime(track.duration_ms),
          uri: track.uri
        }));
        setQueue(queueSongs);
      } else {
        setQueue([]);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      setQueue([]);
    }
  };

  useEffect(() => {
    if (token && deviceId && isPremium) {
      fetchQueue();
    }
  }, [token, deviceId, isPremium]);

  const handleSendMessage = async () => {
    if (!message.trim() || !token) return;
    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    if (message.trim().toLowerCase() === '/reset') {
      setChatHistory([]);
      localStorage.removeItem('chat_history');
      setLoading(false);
      return;
    }
    try {
      const genAI = new GoogleGenerativeAI('AIzaSyAUjcmDNgF0jBFShDK_EaNrgSDqyppBt-4');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `${LYRA_INSTRUCTIONS}\nUser message: "${message}"`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      let responseText = text;
      if (text.includes('[pause]')) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to pause! Upgrade at spotify.com/premium. >:3';
        } else {
          player?.pause();
          responseText = "O-oh… paused it for you! >:3";
        }
      } else if (text.includes('[resume]')) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to resume! Upgrade at spotify.com/premium. >:3';
        } else {
          player?.resume();
          responseText = "Um… playing it again! >:3";
        }
      } else if (text.includes('[skip]')) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to skip! Upgrade at spotify.com/premium. >:3';
        } else {
          player?.nextTrack();
          responseText = "Skipped it… hope you like the next one! >:3";
        }
      } else if (text.includes('[previous]')) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to go back! Upgrade at spotify.com/premium. >:3';
        } else {
          player?.previousTrack();
          responseText = "Going back… here you go! >:3";
        }
      } else if (text.match(/\[volume (\d+)\]/)) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to adjust volume! Upgrade at spotify.com/premium. >:3';
        } else {
          const vol = parseInt(text.match(/\[volume (\d+)\]/)[1]);
          setVolume(vol);
          player?.setVolume(vol / 100);
          localStorage.setItem('player_volume', vol.toString());
          responseText = `Volume set to ${vol}! Um… is that okay? >:3`;
        }
      } else if (text.match(/\[play "(.+)" by "(.+)"\]/)) {
        const [_, title, artist] = text.match(/\[play "(.+)" by "(.+)"\]/);
        const coverMatch = text.match(/cover: "(.+)"/);
        const durationMatch = text.match(/duration: "(.+)"/);
        const cover = coverMatch ? coverMatch[1] : "https://via.placeholder.com/150";
        const duration = durationMatch ? durationMatch[1] : "3:00";
        setLastSuggestedSong({ title, artist, cover, duration });
        if (!isPremium) {
          responseText = `O-oh… you need Spotify Premium to play "${title}" by ${artist}! Upgrade at spotify.com/premium. >:3`;
        } else {
          await playSpotifyTrack(title, artist);
          responseText = `O-oh… playing "${title}" by ${artist}! >:3`;
        }
      } else if (text.match(/\[queue "(.+)" by "(.+)"\]/)) {
        const [_, title, artist] = text.match(/\[queue "(.+)" by "(.+)"\]/);
        if (!isPremium) {
          responseText = `O-oh… you need Spotify Premium to queue "${title}" by ${artist}! Upgrade at spotify.com/premium. >:3`;
        } else {
          const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(title + ' ' + artist)}&type=track&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.tracks.items.length > 0) {
            const track = data.tracks.items[0];
            const queueSong: Song = {
              title: track.name,
              artist: track.artists[0].name,
              cover: track.album.images[0].url,
              duration: formatTime(track.duration_ms),
              uri: track.uri
            };
            setQueue(prevQueue => [...prevQueue, queueSong]);
            await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(track.uri)}&device_id=${deviceId}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            responseText = `O-oh… queued "${title}" by ${artist}! >:3`;
          } else {
            responseText = `Um… couldn’t find "${title}" by ${artist} to queue! >:3`;
          }
        }
      } else if (text.match(/\[suggest "(.+)" by "(.+)"\]/)) {
        const [_, title, artist] = text.match(/\[suggest "(.+)" by "(.+)"\]/);
        const coverMatch = text.match(/cover: "(.+)"/);
        const durationMatch = text.match(/duration: "(.+)"/);
        const cover = coverMatch ? coverMatch[1] : "https://via.placeholder.com/150";
        const duration = durationMatch ? durationMatch[1] : "3:00";
        setLastSuggestedSong({ title, artist, cover, duration });
        responseText = `Um… how about "${title}" by ${artist}? >:3`;
      } else if (text.includes('[shuffle on]')) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to shuffle! Upgrade at spotify.com/premium. >:3';
        } else {
          handleShuffle();
          responseText = "Shuffling on… let's mix it up! >:3";
        }
      } else if (text.includes('[shuffle off]')) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to turn off shuffle! Upgrade at spotify.com/premium. >:3';
        } else {
          handleShuffle();
          responseText = "Shuffle off… keeping it steady! >:3";
        }
      } else if (text.match(/\[repeat (track|context|off)\]/)) {
        if (!isPremium) {
          responseText = 'O-oh… you need Spotify Premium to repeat! Upgrade at spotify.com/premium. >:3';
        } else {
          const mode = text.match(/\[repeat (track|context|off)\]/)[1];
          setRepeat(mode);
          fetch(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          responseText = `Repeat set to ${mode}! Um… enjoy! >:3`;
        }
      }
      setChatHistory(prev => [...prev, { role: 'ai', content: responseText }]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => [...prev, { role: 'ai', content: "Uh… something broke! >:3" }]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    if (!isPremium) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    }
  };

  const handleScrollDown = () => {
    if (chatRef.current) {
      chatRef.current.scrollBy({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <a href={AUTH_URL} className="bg-rose-500 text-white p-4 rounded-xl">Login to Spotify</a>
      </div>
    );
  }

  // Premium check overlay
  if (isPremium === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-rose-100 text-lg">Checking your Spotify account...</div>
      </div>
    );
  }

  if (isPremium === false) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="fixed inset-0 bg-rose-900/10 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-rose-950/80 backdrop-blur-xl p-12 rounded-2xl border border-rose-700/40 max-w-xl mx-4 text-left">
          <div className='flex gap-2'>
            <img src="https://i.ibb.co/WN9NYMq7/logo-spotify-removebg-preview.png" className='w-11  h-11 -mt-2' />
            <h2 className="text-2xl text-rose-100 font-bold mb-4">Spotify Premium Required</h2>
          </div>
            <p className="text-rose-200 mb-6">
              O-oh… you need a Spotify Premium account to use the <b className='text-rose-100'>LyraTunes AI Music Player</b>! Upgrade your account to enjoy all features.
            </p>
            <a
              href="https://www.spotify.com/premium"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-rose-500 text-sm text-white py-3 px-6 rounded-md hover:bg-rose-600 transition-colors inline-flex items-center gap-2"
            >
              Upgrade to Premium <ExternalLink size={11} className='-mt-2 -ml-1' />
            </a>
            <hr className='mt-6 opacity-20' />
            <div className="mt-4">
              <a
                href={AUTH_URL}
                className="text-rose-300 underline flex gap-1 hover:text-rose-100 transition-colors text-sm"
              >
                Try logging in with a different account <ExternalLink size={12} />
              </a>
            </div>
            <div className="mt-2">
              <a
                href={`/playground/${randomString}`}
                className="text-rose-300 underline flex gap-1 hover:text-rose-100 transition-colors text-sm"
              >
                Back to Lyra AI 
              </a>
            </div>
          </div>
        </div>
        <div className="pointer-events-none opacity-50">
          {/* Render the app in the background but disable interactions */}
          <div className="flex flex-1 h-screen overflow-hidden relative">
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
              <button className="bg-rose-500/20 text-white p-3 rounded-full" disabled>
                <Home />
              </button>
              <button className="bg-rose-500/20 text-white p-3 rounded-full" disabled>
                <User />
              </button>
            </div>
            <div
              className="flex flex-col"
              style={{
                width: '95%',
                background: `linear-gradient(to bottom right, rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.4), #121212)`,
              }}
            >
              <img
                src={currentSong.cover}
                alt="background blur"
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-10 scale-125 pointer-events-none select-none"
              />
              <div className="flex-1 flex items-center justify-center p-8 mr-10">
                <div className="w-full max-w-lg">
                  <img
                    src={currentSong.cover}
                    alt={currentSong.album}
                    className="w-full aspect-square object-cover shadow-2xl rounded-xl"
                  />
                </div>
              </div>
              <div className="bg-rose-800/10 border-t border-gray-800 p-6 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={currentSong.cover}
                      alt={currentSong.album}
                      className="w-14 h-14"
                    />
                    <div>
                      <h3 className="text-white text-sm font-medium truncate max-w-[200px]">
                        {currentSong.title}
                      </h3>
                      <p className="text-gray-400 text-xs">{currentSong.artist}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 max-w-xl w-full px-4">
                    <div className="flex items-center gap-6 justify-center">
                      <button className="text-rose-400/80" disabled>
                        <Shuffle size={20} />
                      </button>
                      <button className="text-rose-400/80" disabled>
                        <SkipBack size={24} />
                      </button>
                      <button className="bg-rose-100/10 text-rose-300 rounded-full p-2" disabled>
                        <Play size={20} className="ml-0.5" />
                      </button>
                      <button className="text-rose-400/80" disabled>
                        <SkipForward size={24} />
                      </button>
                      <button className="text-rose-400/80" disabled>
                        <Repeat size={20} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xs text-rose-200">{currentSong.currentTime}</span>
                      <div className="flex-1 h-1 bg-gray-600 rounded-full">
                        <div
                          style={{ width: `${(currentSong.positionMs / currentSong.durationMs) * 100}%` }}
                          className="h-full bg-rose-200 rounded-full relative"
                        ></div>
                      </div>
                      <span className="text-xs text-rose-200">{currentSong.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    <button className="text-rose-400/80" disabled>
                      <Heart size={20} />
                    </button>
                    <button className="text-rose-400/80" disabled>
                      <ListMusic size={20} />
                    </button>
                    <button className="text-rose-400/80" disabled>
                      <MonitorSpeaker size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                      <Volume2 size={20} className="text-rose-400" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        className="w-40 accent-rose-400"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-[32%] h-screen overflow-hidden bg-rose-400/10 border-l border-l-2 border-l-rose-400/40 relative">
              <div className='font-bold text-2xl text-rose-500 border-b border-b-2 border-rose-400/40 py-5 px-8'>
                Ask Lyra
              </div>
              <div className="h-full flex flex-col p-8">
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-rose-300 scrollbar-track-rose-100" ref={chatRef}>
                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-5 py-3.5 text-base ${
                          msg.role === 'user'
                            ? 'bg-rose-500/40 text-white'
                            : 'bg-rose-600/20 text-rose-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex gap-5 mt-4">
                        <button className="text-rose-200 text-sm flex items-center gap-1" disabled>
                          <Copy strokeWidth={3} size={15} />
                        </button>
                        {msg.role === 'ai' && (
                          <>
                            <button className="text-rose-200 text-sm flex items-center gap-1" disabled>
                              <ThumbsUp strokeWidth={3} size={15} />
                            </button>
                            <button className="text-rose-200 text-sm flex items-center gap-1" disabled>
                              <ThumbsDown strokeWidth={3} size={15} />
                            </button>
                            <button className="text-rose-200 text-sm flex items-center gap-1" disabled>
                              <Flag strokeWidth={3} size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-[#282828] text-gray-200 rounded-lg p-3">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
                <motion.button
                  onClick={handleScrollDown}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="fixed bottom-20 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-rose-400 text-rose-50 transition-colors border-2 border-rose-200"
                  disabled
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </motion.button>
                <div className="flex gap-2 mb-16">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-rose-900/20 text-rose-100 text-sm border border-2 border-rose-300 rounded-full px-6 py-4 outline-none placeholder-rose-100"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-rose-500 text-white rounded-full px-4 py-2 hover:bg-rose-600 transition-colors"
                  >
                    <ArrowUp strokeWidth={3} height={30} size={23} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <div className="flex flex-1 h-screen overflow-hidden relative">
        {/* Header with Buttons */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
          <button
            onClick={() => window.location.href = "/"}
            className="bg-rose-500/20 text-white p-3 rounded-full hover:bg-rose-600/40 transition-colors"
          >
            <Home />
          </button>
          <button
            onClick={() => { fetchProfile(); setShowProfileModal(true); }}
            className="bg-rose-500/20 text-white p-3 rounded-full hover:bg-rose-600/40 transition-colors"
          >
            <User />
          </button>
        </div>

        {/* Main Content */}
        <div
          className="flex flex-col"
          style={{
            width: '95%',
            background: `linear-gradient(to bottom right, rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.4), #121212)`,
          }}
        >
          <img
            src={currentSong.cover}
            alt="background blur"
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-10 scale-125 pointer-events-none select-none"
          />
          <div className="flex-1 flex items-center justify-center p-8 mr-10">
            <div className="w-full max-w-lg">
              <img
                src={currentSong.cover}
                alt={currentSong.album}
                className="w-full aspect-square object-cover shadow-2xl rounded-xl"
              />
            </div>
          </div>

          <div className="bg-rose-800/10 border-t border-gray-800 p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={currentSong.cover}
                  alt={currentSong.album}
                  className="w-14 h-14"
                />
                <div>
                  <h3 className="text-white text-sm font-medium truncate max-w-[200px]">
                    {currentSong.title}
                  </h3>
                  <p className="text-gray-400 text-xs">{currentSong.artist}</p>
                </div>
              </div>

              <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 max-w-xl w-full px-4">
                <div className="flex items-center gap-6 justify-center">
                  <button
                    className={`transition-colors ${shuffle ? 'text-rose-400' : 'text-rose-400/80 hover:text-white'}`}
                    onClick={handleShuffle}
                  >
                    <Shuffle size={20} />
                  </button>
                  <button
                    className="text-rose-400 hover:text-white transition-colors"
                    onClick={handleSkipBack}
                  >
                    <SkipBack size={24} />
                  </button>
                  <button
                    className="bg-rose-100/10 text-rose-300 rounded-full p-2 hover:scale-105 transition-transform"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause size={20} className="ml-0" /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <button
                    className="text-rose-400 hover:text-white transition-colors"
                    onClick={handleSkipForward}
                  >
                    <SkipForward size={24} />
                  </button>
                  <button
                    className={`transition-colors ${repeat !== 'off' ? 'text-rose-400' : 'text-rose-400/80 hover:text-white'}`}
                    onClick={handleRepeat}
                  >
                    <Repeat size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-rose-200">{currentSong.currentTime}</span>
                  <div className="flex-1 h-1 bg-gray-600 rounded-full">
                    <div
                      style={{ width: `${(currentSong.positionMs / currentSong.durationMs) * 100}%` }}
                      className="h-full bg-rose-200 rounded-full relative group"
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100"></div>
                    </div>
                  </div>
                  <span className="text-xs text-rose-200">{currentSong.duration}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  className={`hover:text-white transition-colors ${isLiked ? 'text-rose-400' : 'text-rose-400/80'}`}
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <button onClick={async () => { setShowQueueModal(true); await fetchQueue(); }} className="text-rose-400 hover:text-white">
                  <ListMusic size={20} />
                </button>
                <button onClick={async () => {
                  await fetchDevices();
                  setShowDevicesModal(true);
                }} className="text-rose-400 hover:text-white">
                  <MonitorSpeaker size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <Volume2 size={20} className="text-rose-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-40 accent-rose-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface Section */}
        <div className="w-[32%] h-screen overflow-hidden bg-rose-400/10 border-l border-l-2 border-l-rose-400/40 relative">
          <div className='font-bold text-2xl text-rose-500 border-b border-b-2 border-rose-400/40 py-5 px-8'>
            Ask Lyra
          </div>
          <div className="h-full flex flex-col p-8">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-rose-300 scrollbar-track-rose-100" ref={chatRef}>
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-5 py-3.5 text-base ${
                      msg.role === 'user'
                        ? 'bg-rose-500/40 text-white'
                        : 'bg-rose-600/20 text-rose-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="flex gap-5 mt-4">
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="text-rose-200 transition-colors text-sm flex items-center gap-1"
                    >
                      <Copy strokeWidth={3} size={15} />
                    </button>
                    {msg.role === 'ai' && (
                      <>
                        <button
                          onClick={() => {
                            const newHistory = [...chatHistory];
                            newHistory[index].likes = (newHistory[index].likes || 0) + 1;
                            setChatHistory(newHistory);
                          }}
                          className="text-rose-200 hover:text-green-400 transition-colors text-sm flex items-center gap-1"
                        >
                          <ThumbsUp strokeWidth={3} size={15} />
                        </button>
                        <button
                          onClick={() => {
                            const newHistory = [...chatHistory];
                            newHistory[index].dislikes = (newHistory[index].dislikes || 0) + 1;
                            setChatHistory(newHistory);
                          }}
                          className="text-rose-200 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
                        >
                          <ThumbsDown strokeWidth={3} size={15} />
                        </button>
                        <button
                          onClick={() => console.log(`Reported message: ${msg.content}`)}
                          className="text-rose-200 hover:text-yellow-400 transition-colors text-sm flex items-center gap-1"
                        >
                          <Flag strokeWidth={3} size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#282828] text-gray-200 rounded-lg p-3">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <motion.button
              onClick={handleScrollDown}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="fixed bottom-20 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-rose-400 text-rose-50 hover:bg-rose-500 transition-colors border-2 border-rose-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </motion.button>

            <div className="flex gap-2 mb-16">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-rose-900/20 text-rose-100 text-sm border border-2 border-rose-300 rounded-full px-6 py-4 outline-none placeholder-rose-100"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="bg-rose-500 text-white rounded-full px-4 py-2 hover:bg-rose-600 transition-colors"
              >
                <ArrowUp strokeWidth={3} height={30} size={23} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Modal */}
      {showQueueModal && isPremium && (
        <div className="fixed inset-0 bg-gray-900 backdrop-blur-md bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-rose-950/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-rose-700/40 w-full max-w-2xl mx-4 shadow-2xl">
            <h2 className="text-2xl text-rose-100 font-semibold mb-6 text-left">Queue List</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-2">
              <div className="text-base text-rose-200 font-semibold mb-3 text-left">Now Playing</div>
              <div className="flex items-center gap-3 bg-rose-800/40 px-4 py-3 rounded-lg mb-4 border border border-rose-500">
                <img src={currentSong.cover} alt={currentSong.title} className="w-12 h-12 rounded-lg shadow-md object-cover" />
                <div className="flex flex-col text-rose-100 truncate">
                  <span className="font-medium truncate">{currentSong.title}</span>
                  <span className="text-sm text-rose-300 truncate">{currentSong.artist}</span>
                </div>
              </div>
              <hr className='border border-rose-500 opacity-10' style={{ marginTop: '20px', marginBottom: '10px' }} />
              <div className="text-base text-rose-200 font-semibold mb-3 text-left">Next Queue</div>
              {queue.length > 0 ? (
                queue.map((song, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-rose-800/40 px-4 py-3 rounded-lg transition-all">
                    <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-lg shadow-md object-cover" />
                    <div className="flex flex-col text-rose-100 truncate">
                      <span className="font-medium truncate">{song.title}</span>
                      <span className="text-sm text-rose-300 truncate">{song.artist}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-rose-300 text-sm italic text-left">Queue is empty.</p>
              )}
            </div>
            <button
              onClick={() => setShowQueueModal(false)}
              className="mt-6 w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Devices Modal */}
      {showDevicesModal && isPremium && (
        <div className="fixed inset-0 bg-gray-900 backdrop-blur-md bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-rose-950/80 backdrop-blur-xl p-6 md:p-12 rounded-2xl border border-rose-700/40 w-full max-w-2xl mx-4 shadow-2xl">
            <h2 className="text-3xl text-rose-100 font-semibold mb-6 text-left">Connected Devices</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-2">
              {devices.length > 0 ? (
                devices.map((device, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between bg-rose-800/40 px-4 py-3 rounded-lg transition-all ${
                      device.id === deviceId ? 'border border-rose-500 shadow-md' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-rose-100">
                      {getDeviceIcon(device.type)}
                      <span>{device.name}</span>
                      {device.id === deviceId && (
                        <span className="text-rose-300 text-sm ml-2">(Current)</span>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuIndex(activeMenuIndex === idx ? null : idx)}
                        className="text-rose-300 mt-1 hover:text-rose-400 focus:outline-none"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {activeMenuIndex === idx && (
                        <div className="absolute right-0 mt-2 w-[150px] bg-rose-950 border border-rose-700 text-sm text-rose-100 rounded-md shadow-md z-50">
                          <button
                            onClick={() => {
                              handleLogoutDevice(device.id);
                              setActiveMenuIndex(null);
                            }}
                            className="flex items-center gap-2 px-5 py-3 hover:bg-rose-800 w-full text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            Log out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-rose-300 text-sm italic text-center">No devices found.</p>
              )}
            </div>
            <button
              onClick={() => setShowDevicesModal(false)}
              className="mt-6 w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-rose-950/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-rose-700/40 w-full max-w-3xl mx-4 shadow-2xl relative">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-rose-300 hover:text-white transition-colors"
              aria-label="Close Profile"
            >
              <X size={24} />
            </button>
            <h2 className="text-3xl text-rose-100 font-bold mb-6">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_2fr] gap-6">
              <div className="bg-rose-800/30 p-4 rounded-2xl flex flex-col items-center text-center shadow-inner">
                <img
                  src={profile.profile_picture || "/default-avatar.png"}
                  alt="Profile"
                  className="w-32 h-32 object-cover rounded-full shadow-md mb-4 border border-rose-500"
                />
                <h3 className="text-xl font-semibold text-rose-100 truncate w-full">{profile.display_name}</h3>
                <p className="text-sm text-rose-300 break-all">{profile.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Followers", value: profile.followers },
                  { label: "Playlists", value: profile.total_playlists },
                  { label: "Saved Tracks", value: profile.total_tracks },
                  { label: "Recent Activity", value: "N/A" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-rose-800/30 p-4 rounded-2xl shadow-inner">
                    <p className="text-sm text-rose-300">{stat.label}</p>
                    <p className="text-lg font-bold text-rose-100">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              className="mt-8 w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <X size={18} />
                Close
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
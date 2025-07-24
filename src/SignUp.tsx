import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, createUserWithEmailAndPassword, db, sendEmailVerification } from '../firebase-config';
import { signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import Video from './videos/background.mp4';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();

  const videoRef = useRef(null);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);
      navigate('/check-email'); // Redirect to check email page
    } catch (err) {
      setError(err.message);
      console.error('Sign-up error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await handleSuccessfulSignIn(userCredential.user);
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, githubProvider);
      await handleSuccessfulSignIn(userCredential.user);
    } catch (err) {
      setError('GitHub sign-in failed. Please try again.');
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulSignIn = async (user) => {
    const uid = user.uid;
    console.log('User signed in with UID:', uid);
    const userKeyDocRef = doc(db, 'user_playground_keys', uid);
    const userKeyDoc = await getDoc(userKeyDocRef);

    let randomString;
    if (userKeyDoc.exists()) {
      randomString = userKeyDoc.data().randomString;
      console.log('Existing randomString retrieved:', randomString);
    } else {
      randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      console.log('New randomString generated:', randomString);
      await setDoc(userKeyDocRef, {
        randomString: randomString,
        createdAt: Date.now(),
      }, { merge: true });
      await setDoc(doc(db, 'users', uid), { playgroundKey: uid }, { merge: true });
      console.log('New randomString stored in Firestore for UID:', uid);
    }

    if (!randomString) {
      console.error('randomString is undefined after Firestore operation');
      setError('Failed to generate or retrieve randomString.');
      return;
    }

    console.log('Navigating to /playground/', randomString);
    localStorage.setItem('autoLoginUid', randomString);
    navigate(`/playground/${randomString}`);
    if (onSignIn) onSignIn(user);
  };

  return (
    <div className={`flex items-center relative overflow-hidden justify-center min-h-screen bg-rose-200/40 text-gray-800 transition-colors duration-300`}>
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
      
      <div className="w-full h-screen 3xl:h-auto max-w-lg lg:max-w-xl 3xl:max-w-lg p-16 space-y-8 bg-white 3xl:rounded-lg z-50">
        <div className="flex flex-col justify-between items-left space-y-3">
          <h2 className={`text-3xl font-bold text-rose-500`}>Welcome to LyraLabs</h2>
          <p className={`text-sm text-left font-semibold ${isDark ? 'text-gray-400' : 'text-rose-500'}`}>Sign up to start your journey...</p>
        </div>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 ">Email</label>
            <input
              type="email"
              id="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 placeholder:text-sm py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-rose-500 border-rose-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 ">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 placeholder:text-sm block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-rose-500 border-rose-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 border border-transparent font-bold rounded-lg shadow-sm text-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:bg-gray-400 dark:bg-rose-500 dark:hover:bg-rose-600 ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? 'Signing up...' : 'Sign Up With Email'}
          </button>
        </form>
        <hr className="my-8 border border-rose-100" />
        <div className="text-center">
          <button onClick={handleGoogleSignIn} className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center mb-3 transition-all ${isDark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}`}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            </svg>
            Sign Up with Google
          </button>
          <button onClick={handleGithubSignIn} className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center transition-all ${isDark ? 'bg-gray-700 hover:bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'}`}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 7.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            Sign Up with GitHub
          </button>
        </div>
        <div className="mt-12 text-center space-y-4">
          <Link to="/signin" className={`block text-sm hover:underline ${isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'} font-medium`}>
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
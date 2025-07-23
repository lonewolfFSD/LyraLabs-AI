import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, sendPasswordResetEmail, db, doc, getDoc } from '../firebase-config'; // Added db, doc, getDoc
import { Sun, Moon, Code, LockIcon, FileQuestion } from 'lucide-react';
import Video from './videos/background.mp4';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const videoRef = useRef(null);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Check if email exists in Firestore (assuming a 'users' collection with email field)
      const userDocRef = doc(db, 'users', email); // Adjust collection/field name if different
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setError('No account found with that email address.');
        return;
      }

      // If email exists, send password reset email
      await sendPasswordResetEmail(auth, email);
      setMessage('Check your email for a password reset link!');
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request.');
      console.error('Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center relative justify-center min-h-screen ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-rose-200/40 text-gray-800'} transition-colors duration-300`} style={{ overflow: 'hidden' }}>
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

      <div className="w-full max-w-xl mx-6 p-10 md:p-16 space-y-6 bg-white rounded-3xl shadow-lg z-50">
        <div className="flex justify-between items-center">
          <h2 className={`text-[27px] font-bold ${isDark ? 'text-rose-200' : 'text-rose-500'}`}>Forgot Password</h2>
          <button className={`p-2 rounded-full text-rose-400 cursor-default`}>
            {isDark ? <Sun size={20} /> : <FileQuestion size={30} />}
          </button>
        </div>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-600">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-base bg-gray-50 border border-gray-300 rounded-lg shadow-sm outline-none focus:ring-rose-500 border-rose-300 placeholder:text-sm"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-52 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500/80 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:bg-gray-400 ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
        <p className="text-sm text-gray-600">
          Remember your password?{' '}
          <Link to="/signin" className="font-bold underline text-rose-500 hover:text-rose-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
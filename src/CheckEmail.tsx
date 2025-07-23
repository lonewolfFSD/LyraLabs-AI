import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Video from './videos/background.mp4';

function CheckEmail() {
  const videoRef = useRef(null);

  return (
    <div className="flex items-center relative overflow-hidden justify-center min-h-screen bg-rose-200/40 text-gray-800 transition-colors duration-300">
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

      <div className="w-full max-w-lg p-16 space-y-8 bg-white rounded-lg shadow-lg z-50 text-center">
        <Mail size={52} className="mx-auto mb-[-10px] text-rose-500" />
        <h2 className="text-3xl font-bold text-rose-500">Check Your Email</h2>
        <p className="text-gray-600">
          We’ve sent a verification link to your email. Please check your inbox <b>(and spam folder)</b> to verify your account. Once verified, you can{' '}
          <Link to="/signin" className="text-rose-500 hover:text-rose-700 underline font-bold">
            sign in
          </Link>.
        </p>
      </div>
    </div>
  );
}

export default CheckEmail;
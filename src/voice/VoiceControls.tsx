import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  isListening: boolean;
  onToggleListen: () => void;
  onPlayAudio?: () => void;
  hasAudio?: boolean;
}

export function VoiceControls({ isListening, onToggleListen, onPlayAudio, hasAudio }: VoiceControlsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onToggleListen}
        className={`p-3 text-gray-400 hover:text-pink-500 transition-colors rounded-xl hover:bg-pink-50 ${
          isListening 
            ? 'bg-pink-300 text-gray-500' 
            : ''
        }`}
        title={isListening ? 'Stop listening' : 'Start listening'}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      {hasAudio && (
        <button
          onClick={onPlayAudio}
          className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          title="Play voice"
        >
          <Volume2 size={20} />
        </button>
      )}
    </div>
  );
}
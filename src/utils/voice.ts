export function startSpeechRecognition(
  onResult: (text: string) => void,
  onEnd: () => void
): SpeechRecognition | null {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Speech recognition is not supported in this browser.');
    return null;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let finalTranscript = '';

    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
    }

    if (finalTranscript.trim()) {
      onResult(finalTranscript.trim());
      recognition.stop(); // Automatically stop when text is finalized
    }
  };

  recognition.onend = onEnd;
  recognition.start();
  return recognition;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'adjustVolume') {
      const steps = message.steps;
      for (let i = 0; i < steps; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: message.direction === 'up' ? 'VolumeUp' : 'VolumeDown' }));
        new Promise(resolve => setTimeout(resolve, 100));
      }
      sendResponse({ success: true });
    }
  });
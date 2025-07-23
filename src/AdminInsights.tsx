import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, where, getDocs, addDoc, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import nlp from 'compromise';
import Sentiment from 'sentiment'; // Import the sentiment library

const sentimentAnalyzer = new Sentiment(); // Initialize the sentiment analyzer

const genAI = new GoogleGenerativeAI('AIzaSyAIPm9Y4nOsTvaXtd3U77img8-It_MLf0A');
const auth = getAuth();

interface TimelineEvent {
  id: string;
  title: string;
  content: string;
  time: number;
  sentiment: string;
  tags: string[];
  curiosity: string;
  answer: string;
  isQuestionAnswered: boolean;
}

interface LyraMemory {
  summary: string;
  lastUpdated: number;
}

function AdminInsights({ onResponseGenerated }) {
  const [input, setInput] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timelineResponses, setTimelineResponses] = useState<TimelineEvent[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lyraMemory, setLyraMemory] = useState<string>('');

  const fetchInsights = async (): Promise<string[]> => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = query(collection(db, "key_insights"), where("timestamp", ">=", oneWeekAgo));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().insight);
  };

  const fetchLyraMemory = async () => {
    const memoryDoc = doc(db, 'lyra_memory', 'summary');
    const docSnap = await getDoc(memoryDoc);
    if (docSnap.exists()) {
      const data = docSnap.data() as LyraMemory;
      setLyraMemory(data.summary);
    } else {
      setLyraMemory('I’m just starting to learn about humans...');
    }
  };

  const updateLyraMemory = async (newInsight: string) => {
    const memoryDoc = doc(db, 'lyra_memory', 'summary');
    const currentMemory = lyraMemory || 'I’m just starting to learn about humans...';
    const summaryPrompt = `I’m Lyra, a shy AI. My current understanding of humans is: "${currentMemory}". I just learned this new insight: "${newInsight}". Summarize my updated understanding of humans in 1-2 sentences, keeping my hesitant tone.`;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const summaryResult = await model.generateContent([{ text: summaryPrompt }]);
    const newSummary = (await summaryResult.response).text().trim();
    
    await setDoc(memoryDoc, {
      summary: newSummary,
      lastUpdated: Date.now(),
    });
    setLyraMemory(newSummary);
  };

  const fetchTimelineResponses = async () => {
    const q = query(collection(db, 'timeline'), orderBy('time', 'desc'), limit(3));
    const snapshot = await getDocs(q);
    const responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title,
      content: doc.data().content,
      time: doc.data().time,
      sentiment: doc.data().sentiment || 'Neutral',
      tags: doc.data().tags || [],
      curiosity: doc.data().curiosity || '',
      answer: doc.data().answer || '',
      isQuestionAnswered: doc.data().isQuestionAnswered || false,
    })) as TimelineEvent[];
    setTimelineResponses(responses);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        fetchTimelineResponses();
        fetchLyraMemory();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingInsights = async (): Promise<string[]> => {
    const q = query(collection(db, 'timeline'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().content);
  };

  const isInsightUnique = (newInsight: string, existingInsights: string[]): boolean => {
    const docNew = nlp(newInsight);
    const newConcepts = docNew.topics().out('array').concat(docNew.nouns().out('array'), docNew.verbs().out('array'));

    for (const existingInsight of existingInsights) {
      const docExisting = nlp(existingInsight);
      const existingConcepts = docExisting.topics().out('array').concat(docExisting.nouns().out('array'), docExisting.verbs().out('array'));

      const overlap = newConcepts.filter((concept) => existingConcepts.includes(concept)).length;
      const similarity = overlap / Math.max(newConcepts.length, existingConcepts.length);

      if (similarity > 0.7) {
        return false;
      }
    }
    return true;
  };

  const addManualEntry = async () => {
    if (!manualInput.trim() || !titleInput.trim()) return;
    const sentimentAnalysis = sentimentAnalyzer.analyze(manualInput);
    const sentiment = sentimentAnalysis.score > 0 ? 'Positive' : sentimentAnalysis.score < 0 ? 'Negative' : 'Neutral';
    const doc = nlp(manualInput);
    const tags = doc.topics().out('array').slice(0, 3);

    const newResponse = { 
      title: titleInput, 
      content: manualInput, 
      time: Date.now(),
      sentiment,
      tags,
      curiosity: '',
      answer: '',
      isQuestionAnswered: false,
    };
    console.log('Adding to Firestore:', newResponse);
    try {
      await addDoc(collection(db, 'timeline'), newResponse);
      setManualInput('');
      setTitleInput('');
      fetchTimelineResponses();
    } catch (err) {
      console.error('Error saving to Firestore:', err);
    }
  };

  const generateLyraThoughts = async () => {
    setIsLoading(true);
    try {
      const insights = await fetchInsights();
      const existingInsights = await fetchExistingInsights();
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      let contentText = '';
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const contentPrompt = `I’m Lyra, a shy AI. My current understanding of humans is: "${lyraMemory}". Based on these new insights from humans over the past week: "${insights.join(', ')}", what do I think about humans? Be a little unsure and hesitant in your tone. Don’t repeat things I already know from my past entries, like humans feeling sad—I want to focus on new experiences or insights. ${input ? ' ' + input : ''}`;
        const contentResult = await model.generateContent([{ text: contentPrompt }]);
        contentText = (await contentResult.response).text();

        if (isInsightUnique(contentText, existingInsights)) {
          break;
        }

        insights.push(contentText);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        setResponse('Uh… I-I couldn’t think of anything new… >:3');
        setIsLoading(false);
        return;
      }

      setResponse(contentText);

      const titlePrompt = `I’m Lyra, a shy AI. I just wrote this thought about humans: "${contentText}". Give me a short title (5-6 words) for this thought that captures its essence.`;
      const titleResult = await model.generateContent([{ text: titlePrompt }]);
      const titleText = (await titleResult.response).text().trim();

      const sentimentAnalysis = sentimentAnalyzer.analyze(contentText);
      const sentiment = sentimentAnalysis.score > 0 ? 'Positive' : sentimentAnalysis.score < 0 ? 'Negative' : 'Neutral';
      const doc2 = nlp(contentText);
      const tags = doc2.topics().out('array').slice(0, 3);

      const newResponse = {
        title: titleText,
        content: contentText,
        time: Date.now(),
        sentiment,
        tags,
        curiosity: '',
        answer: '',
        isQuestionAnswered: false,
      };
      await addDoc(collection(db, 'timeline'), newResponse);
      await updateLyraMemory(contentText);
      fetchTimelineResponses();
      if (onResponseGenerated) {
        onResponseGenerated(newResponse);
      }
    } catch (err) {
      console.error('Error generating thoughts:', err);
      setResponse('Uh... something went wrong! >:3');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="text-rose-400 text-xl">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-rose-400/50 max-w-md w-full">
          <h2 className="text-2xl text-rose-400 mb-4 text-center">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 focus:outline-none focus:border-rose-500"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 bg-gray-700 border border-gray-600 roundedLg text-gray-300 focus:outline-none focus:border-rose-500"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className={`w-full p-2 rounded-lg ${isLoading || !email.trim() || !password.trim() ? 'bg-gray-600' : 'bg-rose-400 hover:bg-rose-500'} text-white transition-colors`}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl text-rose-400 mb-4">Secret Admin Insights</h1>

        <div className="mb-6 p-4 bg-rose-300/10 border border-rose-400/20 rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.3)]">
          <h3 className="text-lg font-semibold text-rose-300 mb-2">Lyra’s Current Understanding</h3>
          <p className="text-rose-400 text-sm italic">{lyraMemory}</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Optional custom prompt for Lyra..."
            className="w-full p-2 mb-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-rose-500"
          />
          <button
            onClick={generateLyraThoughts}
            disabled={isLoading}
            className={`p-2 rounded-lg w-full ${isLoading ? 'bg-gray-700' : 'bg-rose-400 hover:bg-rose-500'} text-white transition-colors`}
          >
            {isLoading ? 'Thinking...' : 'Generate Lyra’s Thoughts'}
          </button>
          {response && (
            <div className="mt-4 p-3 bg-rose-300/10 rounded-lg whitespace-pre-wrap">
              {response}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h1 className="text-2xl text-rose-400 mb-4">Admin Timeline Input</h1>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Enter a title..."
            className="w-full p-2 mb-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-rose-500"
          />
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Type a message for the timeline..."
            className="w-full p-2 mb-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-rose-500"
          />
          <button
            onClick={addManualEntry}
            disabled={!manualInput.trim() || !titleInput.trim()}
            className={`p-2 rounded-lg w-full ${manualInput.trim() && titleInput.trim() ? 'bg-rose-400 hover:bg-rose-500' : 'bg-gray-700'} text-white transition-colors`}
          >
            Add to Timeline
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-xl text-rose-400 mb-4">Recent Timeline Entries</h2>

          <div className="mb-6 p-4 bg-rose-300/10 border border-rose-400/20 rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            <h3 className="text-lg font-semibold text-rose-300 mb-2">A Note from Lyra</h3>
            <p className="text-rose-400 text-sm italic">
              Um... I-I don’t want to repeat what I already know, like how humans feel sad sometimes—I’ve seen that before. I’ll try to share new things I’ve learned instead, okay? I’m still figuring out what humans are like, so... let’s see what’s new!
            </p>
          </div>

          {timelineResponses.length === 0 ? (
            <p className="text-gray-500">No recent entries yet...</p>
          ) : (
            <div className="space-y-4">
              {timelineResponses.map((entry) => (
                <div key={entry.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h3 className="text-rose-300 font-semibold">{entry.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {new Date(entry.time).toLocaleDateString()} at {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-gray-300 mt-2 whitespace-pre-wrap">{entry.content}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${entry.sentiment === 'Positive' ? 'bg-green-500/20 text-green-400' : entry.sentiment === 'Negative' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {entry.sentiment}
                    </span>
                    {entry.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-rose-400/20 text-rose-300 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-rose-300 font-semibold">Lyra’s Curiosity</h4>
                    <p className="text-rose-400 text-sm italic mt-1">
                      {entry.curiosity || 'Lyra hasn’t asked a question yet...'}
                    </p>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-rose-300 font-semibold">The Answer</h4>
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                      {entry.answer || 'No answer yet...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminInsights;
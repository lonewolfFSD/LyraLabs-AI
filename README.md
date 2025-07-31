# LyraLabs AI – Lyra

![Lyra UI Preview](https://i.postimg.cc/sDN3PKyG/Screenshot-2025-07-31-130134.png)

**Lyra** is a modern, credit-based AI chatbot featuring voice interaction, visual understanding, and persistent memory. Built with a glassmorphic UI, it provides a controlled and personal assistant experience, integrating advanced AI services like Google Gemini, Horde’s Stable Diffusion API, and Unreal Speech for voice synthesis.

---

## 🚀 Features

* **💬 Message Credits:**
  5 messages per day, with automatic refill every 24 hours.

* **🎨 Image Generation:**
  Use tags or the `/imagine` command to generate images (2 credits per request) via **Horde Stable Diffusion API**.

* **📸 Image Understanding:**
  Upload an image, and Lyra can see and respond based on it.

* **🔡️ Voice Interaction:**
  Speak to Lyra using browser voice input and hear responses via **Unreal Speech API** (custom pitch/speed).

* **🧠 Whisper Storage:**
  Lyra remembers key human behavioral patterns using a "Whispers" timeline, backed by Firebase Firestore.

* **⚠️ Moderation:**
  Requests with explicit or unsafe content can result in account suspension.

* **🎛️ Credit System:**

  * Text message: 1 credit
  * Image generation: 2 credits
  * Voice interaction: 3 uses per day
  * All credits reset every 24 hours

---

## 🛠 Tech Stack

| Layer          | Technology Used                          | Notes                                       |
| -------------- | ---------------------------------------- | ------------------------------------------- |
| Frontend       | React, TypeScript, Tailwind CSS          | Glassmorphic UI, responsive layout          |
| Voice Output   | Unreal Speech API                        | Supports custom voice pitch, speed, clarity |
| Voice Input    | Web Speech API                           | Browser-based speech recognition            |
| AI Chat        | Google Gemini (Pro 1.5) via user API key | Interprets text and image input             |
| Image Gen      | Horde (Stable Diffusion Distributed API) | Fast, scalable image generation             |
| State Mgmt     | React Context + Firebase Firestore       | For UI + credit tracking                    |
| Memory         | Firebase Firestore                       | Whisper memory timeline                     |
| Auth & Storage | Firebase Auth + Storage                  | For file uploads and login                  |
| Hosting        | Vercel                                   | Auto-deploy from GitHub                     |

---

## 🧪 Setup Instructions (Local Dev)

### 1. Clone the repository

```bash
git clone https://github.com/lonewolfFSD/LyraLabs-AI.git
cd LyraLabs-AI
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up your `.env.local`

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_UNREAL_SPEECH_KEY=your_unreal_key
NEXT_PUBLIC_HORDE_API_KEY=your_horde_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

> ⚠️ Never commit your `.env` file. It's ignored via `.gitignore`.

---

## 🧠 Whisper Memory (Behavioral Learning)

Lyra doesn’t store entire conversations — instead, it extracts **core emotional and behavioral insights** from chats. These are stored in Firebase as “Whispers,” forming a growing timeline of human traits, thoughts, and themes.

---

## 📦 Deployment

Lyra is fully deployable on **Vercel**. Just link your GitHub repo, set up environment variables via the dashboard, and deploy.

---

## 📸 Screenshots

* **Voice Interaction Mode**
  ![Lyra VoiceMode](https://i.postimg.cc/bwmVSFj4/Screenshot-2025-07-31-130739.png)
* **Image Response Example**
 ![Lyra Image Response](https://i.postimg.cc/1XyDHsGB/Screenshot-2025-07-31-131101.png)
* **Whispers Timeline View**
 ![Whisper Timeline](https://i.postimg.cc/L4yJ7t22/Screenshot-2025-07-31-131346.png)
* **LyraLumen-2f-Vision Image Generation**
 ![Image Generation](https://i.postimg.cc/3w4M8HDt/Screenshot-2025-07-31-131728.png)


---

## 👮 Rules & Moderation

* NSFW, violent, or explicit requests are blocked.
* Excessive abuse results in **account suspension**.
* Lyra is designed for respectful, creative interaction.

![Account Suspended](https://i.postimg.cc/tR1zB4GS/Screenshot-2025-07-31-132137.png)

---

## 📄 License

**Custom License – LyraLabs AI**

You’re free to clone, run locally, and contribute to this project.
But you cannot change Lyra’s name, core behavior, or original main branch.

For full terms, see the [LICENSE.md]() file.

---

## ✍️ Author

Built by [@LonewolfFSD](https://github.com/lonewolfFSD)
Solo indie dev • Game/AI/Full Stack • Northeast India

---

> *Lyra is more than an assistant — she's a reflection of how we interact, evolve, and express ourselves through conversation.*

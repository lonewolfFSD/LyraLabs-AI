import React, { useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Command = {
  title: string;
  description: string;
  longDescription: string;
};

const commands: Command[] = [
  {
    title: "/reset",
    description: "Clears the session.",
    longDescription: "This command clears **Lyra's current memory**, *chat history*, and emotion state. \nIt’s useful if you want to restart the conversation from scratch or if things feel off. \n\n**Note**: This will reset *everything*.",
  },
  {
    title: "/imagine",
    description: "Creates an image from a prompt.",
    longDescription: "Use this command to generate **AI-generated images** from your creative prompts. \nSimply type `/imagine` followed by a detailed description of what you want to see, and Lyra will bring it to life visually.\n\nExamples:\n- `/imagine a futuristic city at sunset`\n- `/imagine a cat wearing space armor on Mars`\n\nThe more vivid and specific your prompt, the better the results.\n\n⚠️ **Important**: Do **not** submit NSFW prompts (e.g. nudity, sexual content, explicit body details). \nSubmitting such requests can result in **account suspension** and permanent loss of access.",
  },
];


type CommandsOverlayProps = {
  onClose: () => void;
};

// Utility function to parse basic markdown (bold, italic, newlines)
const parseMarkdown = (text: string) => {
  // Split by newlines and process each line
  const lines = text.split("\n").map((line, index) => {
    // Process bold (**text**) and italic (*text*)
    let formattedLine = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
      .replace(/\*(.*?)\*/g, "<em>$1</em>"); // Italic

    // Return the line with a <br /> if it's not the last line
    return (
      <span key={index}>
        <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
        {index < text.split("\n").length - 1 && <br />}
      </span>
    );
  });

  return lines;
};

const CommandsOverlay: React.FC<CommandsOverlayProps> = ({ onClose }) => {
  const [selected, setSelected] = useState<Command | null>(null);

  const handleSelectCommand = (cmd: Command) => {
    setSelected(cmd);
  };

  const handleBack = () => {
    setSelected(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xl flex justify-center items-center z-50 md:p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 50, opacity: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="w-full max-w-5xl h-[100vh] md:h-[85vh] md:rounded-3xl bg-white/10 dark:bg-rose-900/10 backdrop-blur-2xl border border-rose-300/30 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-rose-300/20 bg-gradient-to-r from-rose-500/10 to-purple-500/10">
          <div className="flex items-center space-x-3">
            <AnimatePresence>
              {selected && (
                <motion.button
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBack}
                  className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 transition md:hidden"
                >
                  <ArrowLeft className="w-6 h-6 text-rose-100" />
                </motion.button>
              )}
            </AnimatePresence>
            <h2 className="text-3xl font-bold text-rose-100 tracking-tight">
              Lyra's Commands
            </h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 transition"
          >
            <X className="w-6 h-6 text-rose-100" />
          </motion.button>
        </div>

        {/* Main content */}
        <div className="flex flex-col md:flex-row h-full">
          {/* Left - Command list */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`w-full md:w-1/3 border-r border-rose-300/10 overflow-y-auto ${
              selected ? "hidden md:block" : "block"
            }`}
            style={{ maxHeight: "calc(85vh - 80px)" }}
          >
            <ul className="divide-y divide-rose-300/10">
              {commands.map((cmd) => (
                <motion.li
                  key={cmd.title}
                  whileHover={{ backgroundColor: "rgba(244, 63, 94, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 cursor-pointer transition ${
                    selected?.title === cmd.title ? "bg-rose-500/10" : "hover:bg-rose-500/10"
                  }`}
                  onClick={() => handleSelectCommand(cmd)}
                >
                  <p className="font-mono text-lg font-semibold text-rose-100">{cmd.title}</p>
                  <p className="text-sm text-rose-300/80">{cmd.description}</p>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right - Detailed info */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.title}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`w-full md:w-2/3 p-8 overflow-y-auto ${
                  selected ? "block" : "hidden md:block"
                }`}
                style={{ maxHeight: "calc(85vh - 80px)" }}
              >
                <h3 className="text-3xl font-bold text-rose-100 mb-4">{selected.title}</h3>
                <div className="text-rose-200/90 leading-relaxed">
                  {parseMarkdown(selected.longDescription)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CommandsOverlay;
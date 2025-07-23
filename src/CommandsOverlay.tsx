import React, { useState } from "react";
import { X, ArrowLeft } from "lucide-react";

type Command = {
  title: string;
  description: string;
  longDescription: string;
};

const commands: Command[] = [
  {
    title: "/reset",
    description: "Clears the session.",
    longDescription: "This command clears Lyra's current memory, chat history, and emotion state. It’s useful if you want to restart the conversation from scratch or if things feel off.",
  },
  {
    title: "/sleep",
    description: "Puts Lyra to sleep.",
    longDescription: "Manually puts Lyra in sleep mode. In this state, she won’t respond to messages until woken up using the /wake command.",
  },
  {
    title: "/wake",
    description: "Wakes Lyra up.",
    longDescription: "Brings Lyra out of sleep mode and restores her normal interaction behavior. Useful after /sleep or if she’s been idle for a long time.",
  },
  {
    title: "/clear-mem",
    description: "Delete emotion & affection data.",
    longDescription: "Deletes all of Lyra’s saved emotional history and affection metrics. Use this when you want a clean emotional reset.",
  },
  {
    title: "/time",
    description: "Ask Lyra for current time.",
    longDescription: "Asks Lyra to fetch and speak/display the current system or server time. Great for timestamped responses.",
  },
  {
    title: "/energy",
    description: "Check Lyra’s energy.",
    longDescription: "Displays Lyra's internal energy status, which could represent her response rate, available processing, or roleplay stamina depending on the system.",
  },
  {
    title: "/affection",
    description: "Check affection level.",
    longDescription: "Reveals Lyra’s current affection score toward the user. Can be useful for emotional feedback or relationship tracking.",
  },
  {
    title: "/mute",
    description: "Turn off TTS.",
    longDescription: "Disables text-to-speech. Lyra will stop speaking responses out loud until /unmute is used.",
  },
  {
    title: "/unmute",
    description: "Enable TTS.",
    longDescription: "Enables text-to-speech if it was previously disabled using /mute.",
  },
  {
    title: "/feedback",
    description: "Send feedback or report bugs.",
    longDescription: "Allows the user to send feedback, report issues, or log bugs with Lyra’s responses, behavior, or UI.",
  },
];

type CommandsOverlayProps = {
  onClose: () => void;
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="w-full max-w-4xl mx-4 h-[80vh] rounded-2xl shadow-lg bg-white dark:bg-zinc-900 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center space-x-2">
            {selected && (
              <button
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition md:hidden"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-800 dark:text-zinc-100" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              🧠 Lyra's Commands
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5 text-zinc-800 dark:text-zinc-100" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-col md:flex-row h-full">
          {/* Left - Command list (hidden on mobile when a command is selected) */}
          <div
            className={`w-full md:w-1/3 border-r border-zinc-200 dark:border-zinc-800 overflow-y-scroll ${
              selected ? "hidden md:block" : "block"
            }`}
            style={{ maxHeight: "calc(80vh - 64px)" }} // Adjust for header height
          >
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {commands.map((cmd) => (
                <li
                  key={cmd.title}
                  className={`p-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                    selected?.title === cmd.title ? "bg-zinc-100 dark:bg-zinc-800" : ""
                  }`}
                  onClick={() => handleSelectCommand(cmd)}
                >
                  <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{cmd.title}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{cmd.description}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Detailed info (shown on mobile when a command is selected) */}
          {selected && (
            <div
              className={`w-full md:w-2/3 p-6 overflow-y-auto ${
                selected ? "block" : "hidden md:block"
              }`}
              style={{ maxHeight: "calc(80vh - 64px)" }} // Adjust for header height
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {selected.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-300 mt-2">{selected.longDescription}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandsOverlay;
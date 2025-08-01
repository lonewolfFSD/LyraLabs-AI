import React, { useState } from 'react';

interface Sticker {
  url: string;
  name: string;
}

interface StickerCollection {
  id: string;
  name: string;
  description: string;
  stickers: Sticker[];
  downloadLink: string;
  theme: string;
  size: string;
  addedDate: string;
}

const stickerCollections: StickerCollection[] = [
  {
    id: '1',
    name: 'Rose Garden',
    description: 'Vibrant rose-themed stickers for your projects.',
    stickers: [
      { url: 'https://via.placeholder.com/150x150.png?text=Rose+1', name: 'Crimson Bloom' },
      { url: 'https://via.placeholder.com/150x150.png?text=Rose+2', name: 'Scarlet Petal' },
      { url: 'https://via.placeholder.com/150x150.png?text=Rose+3', name: 'Ruby Glow' },
      { url: 'https://via.placeholder.com/150x150.png?text=Rose+4', name: 'Rosebud' },
    ],
    downloadLink: '#',
    theme: 'Vibrant',
    size: 'Large',
    addedDate: '2025-07-01',
  },
  {
    id: '2',
    name: 'Pink Petals',
    description: 'Soft pink rose stickers with a delicate touch.',
    stickers: [
      { url: 'https://via.placeholder.com/150x150.png?text=Petals+1', name: 'Blush Whisper' },
      { url: 'https://via.placeholder.com/150x150.png?text=Petals+2', name: 'Pink Mist' },
      { url: 'https://via.placeholder.com/150x150.png?text=Petals+3', name: 'Soft Petal' },
      { url: 'https://via.placeholder.com/150x150.png?text=Petals+4', name: 'Dewdrop' },
    ],
    downloadLink: '#',
    theme: 'Soft',
    size: 'Small',
    addedDate: '2025-07-15',
  },
  {
    id: '3',
    name: 'Blush Bouquet',
    description: 'Elegant blush-toned rose stickers.',
    stickers: [
      { url: 'https://via.placeholder.com/150x150.png?text=Blush+1', name: 'Velvet Blush' },
      { url: 'https://via.placeholder.com/150x150.png?text=Blush+2', name: 'Peach Charm' },
      { url: 'https://via.placeholder.com/150x150.png?text=Blush+3', name: 'Coral Kiss' },
      { url: 'https://via.placeholder.com/150x150.png?text=Blush+4', name: 'Blush Star' },
    ],
    downloadLink: '#',
    theme: 'Elegant',
    size: 'Large',
    addedDate: '2025-06-20',
  },
];

const StickerDownloadPage: React.FC = () => {
  const [selectedShowOnly, setSelectedShowOnly] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('Recently Added');
  const [collectionSize, setCollectionSize] = useState<string>('All');

  const toggleShowOnly = (categoryId: string) => {
    setSelectedShowOnly((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  const filteredCollections = stickerCollections
    .filter((c) =>
      selectedShowOnly.length === 0 || selectedShowOnly.includes(c.id)
    )
    .filter((c) =>
      selectedThemes.length === 0 || selectedThemes.includes(c.theme)
    )
    .filter((c) =>
      selectedCategory === 'All' || c.name === selectedCategory
    )
    .filter((c) =>
      collectionSize === 'All' || c.size === collectionSize
    )
    .sort((a, b) => {
      if (sortBy === 'Recently Added') {
        return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
      } else if (sortBy === 'Alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'Most Popular') {
        return b.stickers.length - a.stickers.length; // Example popularity metric
      }
      return 0;
    });

  return (
    <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-pink-rose-petals-falling-against-a-white-background-1232-large.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-rose-100 bg-opacity-50 z-10" />

      {/* Main Content */}
      <div className="relative z-20 flex h-[80%] w-[80%]">
        {/* Left Side: Filter Sections */}
        <aside className="w-1/4 bg-white bg-opacity-80 rounded-lg shadow-lg p-6 backdrop-blur-sm m-4">
          {/* Show Only Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-rose-700 mb-2">Show Only</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-5 w-5 text-rose-500 rounded border-rose-300 focus:ring-rose-400"
                  checked={selectedShowOnly.length === 0}
                  onChange={() => setSelectedShowOnly([])}
                />
                <span className="text-rose-600">All</span>
              </label>
              {stickerCollections.map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-rose-500 rounded border-rose-300 focus:ring-rose-400"
                    checked={selectedShowOnly.includes(collection.id)}
                    onChange={() => toggleShowOnly(collection.id)}
                  />
                  <span className="text-rose-600">{collection.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Themes Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-rose-700 mb-2">Themes</h3>
            <div className="space-y-2">
              {['Vibrant', 'Soft', 'Elegant'].map((theme) => (
                <label
                  key={theme}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="text-rose-600">{theme}</span>
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedThemes.includes(theme)}
                      onChange={() => toggleTheme(theme)}
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                        selectedThemes.includes(theme)
                          ? 'bg-rose-500'
                          : 'bg-rose-200'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transform transition-transform duration-200 ${
                          selectedThemes.includes(theme)
                            ? 'translate-x-5'
                            : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </label>
                </div>
                
              ))}
            </div>

            {/* Category Section */}
            <div>
              <h3 className="text-lg font-semibold text-rose-700 mb-2">Category</h3>
              <button
                className="w-full bg-rose-200 text-rose-700 py-2 rounded-lg hover:bg-rose-300 transition-colors duration-200 flex justify-between items-center px-3"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              >
                <span>{selectedCategory}</span>
                <svg
                  className={`h-5 w-5 transform transition-transform duration-200 ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`mt-2 overflow-hidden transition-all duration-300 ease-in-out ${
                  isCategoryDropdownOpen ? 'max-h-40' : 'max-h-0'
                }`}
              >
                <div className="bg-rose-100 rounded-lg p-3 space-y-2">
                  {['All', ...stickerCollections.map((c) => c.name), 'Vintage Roses', 'Neon Petals'].map((category) => (
                    <p
                      key={category}
                      className="text-rose-600 text-sm cursor-pointer hover:text-rose-800"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsCategoryDropdownOpen(false);
                      }}
                    >
                      {category}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Side: Sticker Collections Display */}
          <section className="w-3/4 m-4 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-rose-400 scrollbar-track-rose-100">
            {/* Sort and Filter Options */}
            <div className="flex space-x-4 mb-4">
              <div>
                <label className="text-rose-700 font-medium mr-2">Sort By:</label>
                <select
                  className="bg-rose-200 text-rose-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option>Recently Added</option>
                  <option>Alphabetical</option>
                  <option>Most Popular</option>
                </select>
              </div>
              <div>
                <label className="text-rose-700 font-medium mr-2">Collection Size:</label>
                <select
                  className="bg-rose-200 text-rose-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  value={collectionSize}
                  onChange={(e) => setCollectionSize(e.target.value)}
                >
                  <option>All</option>
                  <option>Small</option>
                  <option>Large</option>
                </select>
              </div>
            </div>

            {filteredCollections.map((collection) => (
              <div
                key={collection.id}
                className="bg-rose-300 bg-opacity-90 rounded-lg p-6 shadow-lg backdrop-blur-sm animate-fade-in mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold text-rose-800">{collection.name}</h3>
                  <a
                    href={collection.downloadLink}
                    className="bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors duration-200 transform hover:scale-105"
                  >
                    Download All
                  </a>
                </div>
                <p className="text-rose-700 mb-4">{collection.description}</p>
                {/* Horizontal Scrollable Sticker Previews */}
                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-rose-400 scrollbar-track-rose-100">
                  {collection.stickers.map((sticker, index) => (
                    <div key={index} className="flex-shrink-0 text-center">
                      <div className="relative">
                        <img
                          src={sticker.url}
                          alt={sticker.name}
                          className="w-32 h-32 object-cover rounded-lg transition-transform duration-300 hover:scale-110"
                        />
                        <a
                          href={sticker.url}
                          download
                          className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors duration-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </a>
                      </div>
                      <p className="text-rose-800 text-sm mt-2">{sticker.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Tailwind Scrollbar and Animation Styles */}
        <style>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #f43f5e;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background-color: #ffe4e6;
          border-radius: 4px;
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.5s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      </div>
    );
  };

export default StickerDownloadPage;
import React, { useState } from 'react';
import background from './videos/background.mp4';
import { Download } from 'lucide-react';

interface Sticker {
  url: string;
  name: string;
  downloadUrl: string;
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

const downloadSvgDataUrl = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="none" viewBox="0 0 25 25" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
`)}`;

const stickerCollections: StickerCollection[] = [
  {
    id: '1',
    name: 'Pixelated Lyra Stickers',
    description: 'Soft and playful, pixelated lyra stickers with different emotions',
    stickers: [
      { url: 'https://i.postimg.cc/MTqv3MbB/lyra-gasp.png', name: 'Lyra Scared', downloadUrl: 'https://drive.google.com/uc?export=download&id=1CfhMifaT6vOaFOUm8a-Y47H8UZkxCfgC' },
      { url: 'https://i.postimg.cc/m25VxRnk/lyra-holding-bat.png', name: 'Lyra Happy', downloadUrl: 'https://drive.google.com/uc?export=download&id=1iV5hsZSoYDnbjkTm0T9mL36CqeJOycOO' },
      { url: 'https://i.postimg.cc/YCx6rHnQ/lyra-laughing.png', name: 'Lyra Laughing', downloadUrl: 'https://drive.google.com/uc?export=download&id=1sqW35USfmN9iGFdf0GwjIpbKDMSrpS59' },
      { url: 'https://i.postimg.cc/HxC1QF1W/lyra-angry.png', name: 'Lyra Angry', downloadUrl: 'https://drive.google.com/uc?export=download&id=1CZVjvaK8NRZlNMs8Hnkdh0Mzlgkb58H6' },
      { url: 'https://i.postimg.cc/13DzSwSf/lyra-crying.png', name: 'Lyra Crying', downloadUrl: 'https://drive.google.com/uc?export=download&id=1SFEC5Hf2bpblRvL9aDxMViT7sbgtJi0s' },
      { url: 'https://i.postimg.cc/mrzknJDW/lyra-smile.png', name: 'Lyra Smiling', downloadUrl: 'https://drive.google.com/uc?export=download&id=1ZTpHbg7PzBCl3nRgj9JQ26HYj6_Xg41t' },
      { url: 'https://i.postimg.cc/3rVTSNGN/lyra-heart.png', name: 'Lyra Lil-Heart', downloadUrl: 'https://drive.google.com/file/d/1VmBtJYwovmVpBLDdQ7LJQ6f1e1p_OyJD/view?usp=sharing' },
      { url: 'https://i.postimg.cc/ZqX8sXr1/lyra-bored.png', name: 'Lyra Bored', downloadUrl: 'https://drive.google.com/uc?export=download&id=1cnZws_omJ4uQp-XGVDYjYz2DoPhx-lgj' },
      { url: 'https://i.postimg.cc/KzHXRPgP/lyra-idea.png', name: 'Lyra Idea', downloadUrl: 'https://drive.google.com/uc?export=download&id=1BSTltINl4BnUh6JDgAdpitL-d23bKdHp' },
      { url: 'https://i.postimg.cc/8czhnvy0/lyra-sad.png', name: 'Lyra Sad', downloadUrl: 'https://drive.google.com/uc?export=download&id=1XFqmz3_41vfryDgeqmNZEDPnNdzkxUPK' },
      { url: 'https://i.postimg.cc/rpq3Fnz0/lyra-suspicious.png', name: 'Lyra Suspicious', downloadUrl: 'https://drive.google.com/uc?export=download&id=1n1JQSZyAVnQ1EUolJWCjoSfO-4qOWmKf' },
      { url: 'https://i.postimg.cc/bNchfR0b/lyra-disappointed.png', name: 'Lyra Disappointed', downloadUrl: 'https://drive.google.com/uc?export=download&id=1WDaWG5LuyDF3rOPEhQd99mhKPZ7Kct5P' },
      { url: 'https://i.postimg.cc/j2R4ym0P/lyra-wink.png', name: 'Lyra Wink', downloadUrl: 'https://drive.google.com/uc?export=download&id=1w3BAqY4Qw__4tZMOp60S2AV06d5p0kP6' },
      { url: 'https://i.postimg.cc/prgVwbWn/lyra-blush.png', name: 'Lyra Shy', downloadUrl: 'https://drive.google.com/uc?export=download&id=1xCqiBnf0pmcTN0A11S3quzMgqejfvq96' },
      { url: 'https://i.postimg.cc/bNgp0tbt/lyra-confused.png', name: 'Lyra Confused', downloadUrl: 'https://drive.google.com/uc?export=download&id=1L0M0YWunKgO34BceKvj-3h0D9RrQGONY' }
    ],
    downloadLink: '/Lyra Pixalated Sticker Pack-20250801T153457Z-1-001.zip',
    theme: 'Soft',
    size: 'Small',
    addedDate: '2025-07-15',
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
        return b.stickers.length - a.stickers.length;
      }
      return 0;
    });

  return (
    <div className="h-screen w-screen relative lg:overflow-hidden flex flex-col items-center justify-center">
      {/* Header */}
      <h1 className="relative z-20 text-3xl lg:text-4xl font-bold text-rose-800 mb-4 mt-20 ml-4 lg:ml-6 text-left w-[90%] lg:w-[80%]">LyraLabs Collection</h1>

      {/* Background Video */}
{/* Background Video */}
<video
  autoPlay
  loop
  muted
  playsInline
  className="fixed top-0 left-0 w-full h-full object-cover z-0"
>
  <source src={background} type="video/mp4" />
</video>

{/* Overlay */}
<div className="fixed top-0 left-0 w-full h-full bg-rose-200 bg-opacity-80 z-10" />


      {/* Main Content */}
      <div className="relative z-20 flex flex-col lg:flex-row h-[90%] w-[90%] lg:w-[80%]">
        {/* Left Side: Filter Sections */}
        <aside className="w-full lg:w-[20%] h-[68%] bg-white rounded-2xl border-2 border-rose-400/60 p-4 lg:p-6 backdrop-blur-sm m-2 lg:m-4">
          {/* Show Only Section */}
          <div className="mb-5">
            <h3 className="text-sm lg:text-base font-bold text-rose-700 mb-2">Show Only</h3>
            <div className="space-y-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3 w-3 text-rose-500 rounded border-rose-300 focus:ring-rose-400"
                  checked={selectedShowOnly.length === 0}
                  onChange={() => setSelectedShowOnly([])}
                />
                <span className="text-rose-600 text-xs lg:text-sm">All</span>
              </label>
              {stickerCollections.map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center text-xs lg:text-sm space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-3 w-3 text-rose-500 rounded border-rose-300 focus:ring-rose-400"
                    checked={selectedShowOnly.includes(collection.id)}
                    onChange={() => toggleShowOnly(collection.id)}
                  />
                  <span className="text-rose-600">{collection.name}</span>
                </label>
              ))}
            </div>
          </div>

          <hr />

          {/* Themes Section */}
          <div className="mb-4 mt-4">
            <h3 className="text-sm lg:text-base font-bold text-rose-700 mb-2">Themes</h3>
            <div className="space-y-1">
              {['Vibrant', 'Soft', 'Elegant'].map((theme) => (
                <label
                  key={theme}
                  className="flex text-xs lg:text-sm items-center justify-between cursor-pointer"
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
                      className={`w-8 lg:w-10 h-4 lg:h-5 rounded-full transition-colors duration-200 ${
                        selectedThemes.includes(theme)
                          ? 'bg-rose-500'
                          : 'bg-rose-200'
                      }`}
                    >
                      <div
                        className={`w-3 lg:w-4 h-3 lg:h-3 bg-white rounded-full transform transition-transform duration-200 ${
                          selectedThemes.includes(theme)
                            ? 'translate-x-4 lg:translate-x-5'
                            : 'translate-x-1'
                        } mt-0.5 lg:mt-1`}
                      />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <hr />

          {/* Category Section */}
          <div className='mt-4'>
            <h3 className="text-sm lg:text-base font-bold text-rose-700 mb-2">Category</h3>
            <button
              className="w-full text-xs lg:text-sm bg-rose-100/60 border border-rose-400/20 text-rose-700 py-2 rounded-lg hover:bg-rose-100 transition-colors duration-200 flex justify-between items-center px-3"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            >
              <span>{selectedCategory}</span>
              <svg
                className={`h-4 w-4 transform transition-transform duration-200 ${
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
                isCategoryDropdownOpen ? 'max-h-[180px]' : 'max-h-0'
              }`}
            >
              <div className="bg-rose-100 rounded-lg p-3 text-xs lg:text-sm space-y-1.5">
                {['All', ...stickerCollections.map((c) => c.name)].map((category) => (
                  <p
                    key={category}
                    className="text-rose-600 text-xs border-b pb-1 border-rose-400/20 cursor-pointer hover:text-rose-800"
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
        <section className="w-full lg:w-3/4 m-2 lg:m-4 flex flex-col">
          {/* Sort and Filter Options (Fixed) */}
          <div className="flex sm:space-x-4 mb-4 flex-wrap gap-y-2">
            <div>
              <label className="text-rose-700 font-extrabold mr-2 text-base">Sort By:</label>
              <select
                className="bg-white text-rose-700 py-2 text-sm lg:text-[15px] px-4 lg:px-6 text-left font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option>Recently Added</option>
                <option>Alphabetical</option>
                <option>Most Popular</option>
              </select>
            </div>
            <div>
              <label className="text-rose-700 font-extrabold mr-2 text-base">Collection Size:</label>
              <select
                className="bg-white font-semibold text-rose-700 py-2 px-3 text-sm lg:text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                value={collectionSize}
                onChange={(e) => setCollectionSize(e.target.value)}
              >
                <option>All</option>
                <option>Small</option>
                <option>Large</option>
              </select>
            </div>
          </div>

          {/* Scrollable Sticker Collections */}
          <div className="overflow-y-auto pr-2 lg:pr-4 scrollbar-thin scrollbar-thumb-rose-400 scrollbar-track-rose-100 flex-grow mb-20">
            {filteredCollections.map((collection) => (
              <div
                key={collection.id}
                className="bg-rose-50 bg-opacity-90 rounded-2xl p-4 lg:p-6 border-2 border-rose-400/60 backdrop-blur-sm animate-fade-in mb-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl lg:text-2xl font-extrabold text-rose-800">{collection.name}</h3>
                  <div className="flex items-center space-x-2">
                    <a
                      href={collection.downloadLink}
                      className="bg-rose-500 flex gap-1.5 text-xs mb-6 lg:text-sm font-bold text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors duration-200 transform"
                    >
                      <Download size={17} strokeWidth={3} /> <span className="hidden sm:block">Download Pack</span> <span className="sm:hidden">Download</span>
                    </a>
                  </div>
                </div>
                <p className="text-rose-700/80 text-xs lg:text-sm mb-3 -mt-2 lg:-mt-4">{collection.description}</p>
                {/* Horizontal Scrollable Sticker Previews */}
                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-rose-400 scrollbar-track-rose-100">
                  {collection.stickers.map((sticker, index) => (
                    <div key={index} className="flex-shrink-0 text-center">
                      <div className="relative bg-rose-400/20 rounded-xl p-2">
                        <img
                          src={sticker.url}
                          alt={sticker.name}
                          className="w-20 lg:w-28 h-20 lg:h-28 object-cover rounded-lg transition-transform duration-300 hover:scale-110"
                        />
                        <a
                          href={sticker.downloadUrl}
                          download
                          className="absolute top-1 right-1 bg-rose-400 text-white rounded-tr-lg rounded-bl-lg p-1 hover:bg-rose-500/80 transition-colors duration-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 lg:h-4 w-3 lg:w-4"
                            fill="none"
                            viewBox="0 0 25 25"
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
                      <p className="text-rose-800 text-sm mt-3">{sticker.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
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

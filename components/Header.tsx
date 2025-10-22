export function Header({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <header className="border-b border-white/10 bg-sui-dark/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-meme-pink via-meme-purple to-sui-blue rounded-xl flex items-center justify-center font-bold text-2xl">
              🚀
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                SuiLFG MemeFi
              </h1>
              <p className="text-xs text-gray-400">Testnet Campaign</p>
            </div>
          </div>
          
          <button
            onClick={onCreateClick}
            className="px-6 py-2 bg-gradient-to-r from-meme-pink to-meme-purple rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </header>
  );
}

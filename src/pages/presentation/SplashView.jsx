import { motion } from 'framer-motion';
import { useConfigStore } from '../../stores';

export default function SplashView() {
  const config = useConfigStore(state => state.config);
  
  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0A0E14] via-[#14202E] to-[#1B3A5D]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Red gradient orb */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(227,24,55,0.2) 0%, transparent 70%)',
            top: '10%',
            left: '5%'
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        {/* Navy blue gradient orb */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(27,58,93,0.3) 0%, transparent 70%)',
            bottom: '10%',
            right: '10%'
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.6, 0.4, 0.6]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* Decorative circles */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[40px] border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[20px] border-white/5 rounded-full" />
        </div>
        
        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-[var(--bwpl-primary)]/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -80, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center">
        {/* BWPL 2026 Logo - Main Feature */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: 'spring',
            duration: 1.2,
            bounce: 0.4
          }}
          className="mb-8"
        >
          <motion.img 
            src="/bwpl-2026-logo.png" 
            alt="BWPL 2026"
            className="w-[250px] md:w-[250px] lg:w-[300px] h-auto mx-auto rounded-full"
            animate={{
              filter: [
                'drop-shadow(0 0 30px rgba(227,24,55,0.4))',
                'drop-shadow(0 0 60px rgba(227,24,55,0.6))',
                'drop-shadow(0 0 30px rgba(227,24,55,0.4))'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </motion.div>
        
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-xl md:text-2xl text-white font-display-alt-2 tracking-wide mb-8 league-title"
        >
          {config?.leagueFullName || 'Bangalore Willows Premier League'}
        </motion.p>
        
        {/* Auction Tag */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="mt-3 inline-block px-10 py-4 text-2xl md:text-3xl font-display tracking-[0.2em] text-white border-2 border-[var(--bwpl-primary)] rounded-lg bg-gradient-to-r from-[var(--bwpl-primary)]/20 to-[var(--bwpl-secondary)]/20"
            style={{
              boxShadow: '0 0 30px rgba(227,24,55,0.3), inset 0 0 20px rgba(227,24,55,0.1)'
            }}
          >
            PLAYER AUCTION
          </span>
        </motion.div>
      </div>
      
      {/* Bottom - BWC Club Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 text-center"
      >
        <div className="flex flex-col items-center gap-3">
          <img 
            src="/bwc-logo.png" 
            alt="Bangalore Willows Cricket Club"
            className="w-16 h-16"
          />
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-white/30" />
            <p className="text-white text-sm tracking-[0.2em] font-display">
              {config?.clubName || 'BANGALORE WILLOWS CRICKET CLUB'}
            </p>
            <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-white/30" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

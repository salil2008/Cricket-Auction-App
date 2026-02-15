import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { useAuctionStore, AUCTION_EVENTS } from '../stores';

// Sound definitions
const SOUNDS = {
  playerSelect: {
    src: '/sounds/whoosh.mp3',
    volume: 0.5
  },
  bidUpdate: {
    src: '/sounds/tick.mp3',
    volume: 0.3
  },
  sold: {
    src: '/sounds/sold.mp3',
    volume: 0.7
  },
  unsold: {
    src: '/sounds/unsold.mp3',
    volume: 0.5
  },
  tierElite: {
    src: '/sounds/elite.mp3',
    volume: 0.6
  },
  tierASquad: {
    src: '/sounds/asquad.mp3',
    volume: 0.5
  },
  tierRegular: {
    src: '/sounds/regular.mp3',
    volume: 0.4
  },
  transition: {
    src: '/sounds/transition.mp3',
    volume: 0.4
  },
  success: {
    src: '/sounds/success.mp3',
    volume: 0.5
  }
};

// Fallback sounds using Web Audio API (if files don't exist)
function createFallbackSound(type) {
  return {
    play: () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch (type) {
          case 'sold':
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialDecayTo(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
            
          case 'unsold':
            oscillator.frequency.setValueAtTime(392, audioContext.currentTime); // G4
            oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.15); // F4
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialDecayTo(0.01, audioContext.currentTime + 0.4);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
            break;
            
          case 'tick':
          case 'bidUpdate':
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialDecayTo(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
            
          default:
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialDecayTo(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        }
      } catch (e) {
        console.log('Audio not available:', e);
      }
    }
  };
}

export function useSound() {
  const soundsRef = useRef({});
  const soundEnabled = useAuctionStore(state => state.soundEnabled);
  const lastEvent = useAuctionStore(state => state.lastEvent);
  
  // Initialize sounds
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, config]) => {
      try {
        soundsRef.current[key] = new Howl({
          src: [config.src],
          volume: config.volume,
          preload: true,
          onloaderror: () => {
            // Use fallback if sound file doesn't exist
            soundsRef.current[key] = createFallbackSound(key);
          }
        });
      } catch (e) {
        soundsRef.current[key] = createFallbackSound(key);
      }
    });
    
    return () => {
      Object.values(soundsRef.current).forEach(sound => {
        if (sound.unload) sound.unload();
      });
    };
  }, []);
  
  // Play a specific sound
  const playSound = useCallback((soundId) => {
    if (!soundEnabled) return;
    
    const sound = soundsRef.current[soundId];
    if (sound) {
      sound.play();
    }
  }, [soundEnabled]);
  
  // Listen for events and play appropriate sounds
  useEffect(() => {
    if (!lastEvent || !soundEnabled) return;
    
    const { type, payload } = lastEvent;
    
    switch (type) {
      case AUCTION_EVENTS.PLAYER_SELECT:
        playSound('playerSelect');
        break;
      case AUCTION_EVENTS.PLAYER_SOLD:
        playSound('sold');
        break;
      case AUCTION_EVENTS.PLAYER_UNSOLD:
        playSound('unsold');
        break;
      case AUCTION_EVENTS.BID_UPDATE:
        playSound('bidUpdate');
        break;
      case AUCTION_EVENTS.VIEW_CHANGE:
        playSound('transition');
        break;
      case AUCTION_EVENTS.SOUND_PLAY:
        if (payload?.soundId) {
          playSound(payload.soundId);
        }
        break;
      default:
        break;
    }
  }, [lastEvent, soundEnabled, playSound]);
  
  return { playSound };
}

export default useSound;

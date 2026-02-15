import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString('en-IN'),
  className = '',
  duration = 0.5
}) {
  const spring = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(spring, (current) => format(Math.round(current)));
  const [displayValue, setDisplayValue] = useState(format(value));
  
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  
  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      setDisplayValue(v);
    });
    return () => unsubscribe();
  }, [display]);
  
  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  );
}

// Slot machine style number animation
export function SlotNumber({
  value,
  prefix = '',
  suffix = '',
  className = ''
}) {
  const prevValue = useRef(value);
  const [digits, setDigits] = useState([]);
  
  useEffect(() => {
    const valueStr = value.toString();
    const prevStr = prevValue.current.toString();
    
    // Pad to same length
    const maxLen = Math.max(valueStr.length, prevStr.length);
    const paddedValue = valueStr.padStart(maxLen, '0');
    const paddedPrev = prevStr.padStart(maxLen, '0');
    
    const newDigits = [];
    for (let i = 0; i < paddedValue.length; i++) {
      newDigits.push({
        current: paddedValue[i],
        previous: paddedPrev[i],
        changed: paddedValue[i] !== paddedPrev[i]
      });
    }
    
    setDigits(newDigits);
    prevValue.current = value;
  }, [value]);
  
  return (
    <span className={`inline-flex items-center ${className}`}>
      {prefix}
      {digits.map((digit, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden"
          style={{ width: '0.6em' }}
        >
          <motion.span
            key={`${i}-${digit.current}`}
            initial={digit.changed ? { y: '-100%' } : false}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="inline-block"
          >
            {digit.current}
          </motion.span>
        </span>
      ))}
      {suffix}
    </span>
  );
}

// Currency display with animation
export function AnimatedCurrency({
  value,
  symbol = '₹',
  compact = false,
  className = ''
}) {
  const format = (n) => {
    if (compact) {
      if (n >= 10000000) {
        return `${(n / 10000000).toFixed(2)} Cr`;
      } else if (n >= 100000) {
        return `${(n / 100000).toFixed(2)} L`;
      }
    }
    return new Intl.NumberFormat('en-IN').format(n);
  };
  
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="mr-1">{symbol}</span>
      <AnimatedNumber value={value} format={format} />
    </span>
  );
}

export default AnimatedNumber;

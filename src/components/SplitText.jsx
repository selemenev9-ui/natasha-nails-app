import { motion } from 'framer-motion';

export default function SplitText({ text, className, delay = 0 }) {
  const words = text.split(' ');

  return (
    <span className={className} style={{ display: 'inline-block', overflow: 'hidden' }}>
      {words.map((word, wi) => (
        <span
          key={`${word}-${wi}`}
          style={{ display: 'inline-block', overflow: 'hidden', marginRight: '0.25em' }}
        >
          {word.split('').map((char, ci) => (
            <motion.span
              key={`${word}-${wi}-${ci}`}
              style={{ display: 'inline-block' }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: delay + (wi * word.length + ci) * 0.03,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

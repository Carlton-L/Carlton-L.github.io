import clsx from 'clsx';

function TweenText({ text, className }) {
  return (
    <span className={clsx('tween-text', className)}>
      {[...text].map((char, i) => (
        <span key={i} className="tween-letter">
          <span
            className="char-default"
            style={{ transitionDelay: `${i * 20}ms` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
          <span
            className="char-hover"
            style={{ transitionDelay: `${i * 20}ms` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        </span>
      ))}
    </span>
  );
}

export default TweenText;

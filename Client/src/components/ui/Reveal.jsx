import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

let observer;
const callbacks = new WeakMap();

/** One shared IntersectionObserver for every reveal on the page. */
function observe(el, onEnter) {
  if (typeof IntersectionObserver === 'undefined') {
    onEnter();
    return () => {};
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          callbacks.get(entry.target)?.();
          callbacks.delete(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
  }
  callbacks.set(el, onEnter);
  observer.observe(el);
  return () => {
    callbacks.delete(el);
    observer.unobserve(el);
  };
}

export default function Reveal({ as: Tag = 'div', delay = 0, className, style, children, ...rest }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return undefined;
    return observe(ref.current, () => setInView(true));
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn('prime-reveal', inView && 'is-in', className)}
      style={delay ? { ...style, '--reveal-delay': `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

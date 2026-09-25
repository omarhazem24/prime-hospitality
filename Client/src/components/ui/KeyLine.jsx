import { cn } from '../../utils/cn';

export default function KeyLine({ className, tone = 'default' }) {
  return (
    <div
      className={cn(
        'prime-keyline',
        tone === 'gold' && 'prime-keyline--gold',
        tone === 'light' && 'prime-keyline--light',
        className
      )}
      aria-hidden
    >
      <span className="prime-keyline__mark" />
    </div>
  );
}

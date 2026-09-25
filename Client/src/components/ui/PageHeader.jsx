import KeyLine from './KeyLine';
import { cn } from '../../utils/cn';

export default function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  tone = 'light',
  className,
  dense = false,
}) {
  const isDark = tone === 'dark';

  return (
    <div className={cn(dense ? 'mb-8' : 'mb-10 md:mb-12', className)}>
      {eyebrow ? (
        <p className={cn('prime-eyebrow mb-3', isDark && 'text-prime-gold')}>{eyebrow}</p>
      ) : null}
      <h1
        className={cn(
          'font-display text-display-lg',
          isDark ? 'text-white' : 'text-prime-ink'
        )}
      >
        {title}
      </h1>
      <KeyLine tone={isDark ? 'light' : 'default'} className="mt-6 max-w-[5.5rem]" />
      {lede ? (
        <p
          className={cn(
            'mt-5 max-w-xl text-sm font-medium leading-relaxed md:text-base',
            isDark ? 'text-white/70' : 'text-prime-muted'
          )}
        >
          {lede}
        </p>
      ) : null}
      {actions ? <div className="mt-8">{actions}</div> : null}
    </div>
  );
}

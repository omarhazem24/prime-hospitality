import Img from './Img';
import { cn } from '../../utils/cn';

/**
 * Inner-page opener. With `image` it is a full-bleed photo (pair with <Header overHero />);
 * without, a quiet typographic header on the page background.
 */
export default function PageHero({ eyebrow, title, lede, image, align = 'start', children, className }) {
  const centered = align === 'center';

  if (image) {
    return (
      <section className={cn('relative isolate flex min-h-vh-72 items-end overflow-hidden bg-[#221f20] text-white md:min-h-vh-78', className)}>
        <Img
          src={image}
          alt=""
          priority
          sizes="100vw"
          widths={[640, 960, 1440, 1920, 2400]}
          fallbackWidth={1920}
          className="prime-kenburns absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />
        <div className={cn('prime-container pb-14 pt-32 md:pb-20', centered && 'text-center')}>
          <div className={cn('max-w-3xl', centered && 'mx-auto')}>
            {eyebrow ? (
              <p className="prime-fade-up text-[11px] font-medium uppercase tracking-[0.32em] text-white/75">{eyebrow}</p>
            ) : null}
            <h1 className="prime-fade-up mt-5 font-display text-display-xl font-medium text-balance" style={{ animationDelay: '80ms' }}>
              {title}
            </h1>
            {lede ? (
              <p
                className={cn('prime-fade-up mt-6 max-w-xl text-[16px] font-light leading-relaxed text-white/80 md:text-[18px]', centered && 'mx-auto')}
                style={{ animationDelay: '160ms' }}
              >
                {lede}
              </p>
            ) : null}
            {children}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('prime-container pb-12 pt-14 md:pb-16 md:pt-24', centered && 'text-center', className)}>
      <div className={cn('max-w-4xl', centered && 'mx-auto')}>
        {eyebrow ? <p className="prime-eyebrow prime-fade-up text-prime-gold-deep">{eyebrow}</p> : null}
        <h1 className="prime-fade-up mt-5 font-display text-display-xl font-medium text-prime-ink text-balance" style={{ animationDelay: '80ms' }}>
          {title}
        </h1>
        {lede ? (
          <p className={cn('prime-lede prime-fade-up mt-6 max-w-2xl', centered && 'mx-auto')} style={{ animationDelay: '160ms' }}>
            {lede}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

import { sizedSrc, srcSetFor } from '../../utils/img';

/**
 * Responsive, lazy image. `sizes` should describe the rendered width
 * (e.g. "(min-width: 1024px) 33vw, 100vw") so phones fetch small files.
 */
export default function Img({
  src,
  alt = '',
  sizes = '100vw',
  widths,
  priority = false,
  fallbackWidth = 1080,
  className,
  ...rest
}) {
  if (!src) return null;
  const srcSet = srcSetFor(src, widths);
  return (
    <img
      src={sizedSrc(src, fallbackWidth)}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      referrerPolicy="no-referrer"
      className={className}
      {...rest}
    />
  );
}

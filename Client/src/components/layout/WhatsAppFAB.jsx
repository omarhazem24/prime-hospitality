import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { brand, whatsappHref } from '../../theme/brand';

export default function WhatsAppFAB() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;

  return (
    <a
      href={whatsappHref(`Hi ${brand.shortName} — I have a question.`)}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-[max(1.25rem,env(safe-area-inset-right))] z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 sm:bottom-5 sm:end-5"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={22} />
    </a>
  );
}

import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '919319263747';

const FloatingSupport = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}`}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
    aria-label="Contact Support on WhatsApp"
  >
    <MessageCircle className="h-6 w-6" />
  </a>
);

export default FloatingSupport;

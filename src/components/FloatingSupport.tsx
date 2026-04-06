import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_NUMBER = '919319263747';

const FloatingSupport = () => {
  const [number, setNumber] = useState(DEFAULT_NUMBER);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'support_whatsapp').maybeSingle()
      .then(({ data }) => {
        if (data?.value) setNumber(data.value.replace(/[^0-9]/g, ''));
      });
  }, []);

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
      aria-label="Contact Support on WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
};

export default FloatingSupport;

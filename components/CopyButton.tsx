import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/utils/clipboard';
import { errorMessage } from '@/utils/format';
import { useToast } from './Toast';
import { Button } from './ui';

type Props = {
  text: string;
  // What is copied, for the message ("Copied response body").
  what: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
};

// A labelled copy button that confirms on the button itself.
export function CopyButton({ text, what, label = 'Copy', variant = 'secondary', className = '' }: Props) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await copyText(text);
      setCopied(true);
      toast(`Copied ${what}`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <Button variant={variant} className={`h-6 px-2 ${className}`} onClick={copy} title={`Copy ${what}`}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

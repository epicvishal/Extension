import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { errorMessage } from '@/utils/format';
import { getCaptureOnLoad, setCaptureOnLoad } from '@/utils/pageHook';
import { useToast } from './Toast';
import { Button, Switch } from './ui';

// The Console and Network tabs record only from when they are opened; this switch installs the
// recorder at page load for the site instead, and Reload page makes that take effect.
export function CaptureControls({ tabId, pageUrl }: { tabId: number; pageUrl: URL }) {
  const [on, setOn] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getCaptureOnLoad(pageUrl).then(setOn, () => {});
  }, [pageUrl]);

  const toggle = async (next: boolean) => {
    try {
      await setCaptureOnLoad(pageUrl, next);
      setOn(next);
      toast(next ? 'Capturing from page load. Reload the page to start' : 'Capture from page load turned off');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
      <Switch label="Capture from page load on this site" checked={on} onChange={toggle} />
      <span className="truncate">Capture from page load</span>
      <Button className="ml-auto h-6 px-2" onClick={() => browser.tabs.reload(tabId)} title="Reload the page">
        <RotateCw />
        <span className="hidden @xs:inline">Reload page</span>
      </Button>
    </div>
  );
}

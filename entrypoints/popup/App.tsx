import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { clickCount } from '@/utils/storage';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    clickCount.getValue().then(setCount);
  }, []);

  const increment = async () => {
    const next = count + 1;
    setCount(next);
    await clickCount.setValue(next);
  };

  return (
    <div className="w-80 p-4 font-sans text-slate-800">
      <h1 className="mb-2 text-lg font-semibold">My Extension</h1>
      <p className="mb-4 text-sm text-slate-500">
        Scaffold is working. Clicks are saved in extension storage.
      </p>
      <Button onClick={increment}>Clicked {count} times</Button>
    </div>
  );
}

export default App;

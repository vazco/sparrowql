import './App.css';
import { Output } from '../Output';
import { Input } from '../Input';
import { usePlayground } from '../../hooks/usePlayground.tsx';
import { Header } from '../Header';

function App() {
  const { input, setInput, output } = usePlayground();

  return (
    <div>
      <Header setInput={setInput} />
      <div className="editorWrapper">
        <Input input={input} setInput={setInput} />
        <Output output={output} />
      </div>
    </div>
  );
}

export default App;

import './Header.css';
import { example1, example2 } from '../../examples';
import sparrowqlLogo from '/sparrowqlLogo.png';
import githubMarkWhite from '/github-mark-white.svg';

export const Header = ({ setInput }: { setInput: (value: string) => void }) => (
  <div className="Header__Wrapper">
    <div className="Header__ListWrapper">
      <a href="https://github.com/vazco/sparrowql" target="_blank">
        <img
          src={sparrowqlLogo}
          alt="sparrowql logo"
          className="Header__Logo"
        />
      </a>
      <a href="https://github.com/vazco/sparrowql" target="_blank">
        <h1>Sparrowql</h1>
      </a>
      <nav className="Header__List">
        <button onClick={() => setInput(example1)}>Example 1</button>
        <button onClick={() => setInput(example2)}>Example 2</button>
      </nav>
    </div>
    <a
      href="https://github.com/vazco/sparrowql/blob/master/README.md"
      target="_blank"
    >
      <img
        src={githubMarkWhite}
        alt="github logo"
        className="Header__Logo"
      />
    </a>
  </div>
);

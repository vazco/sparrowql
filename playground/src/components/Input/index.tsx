import { Editor } from '@monaco-editor/react';
export const Input = ({
  input,
  setInput,
}: {
  input: string;
  setInput: (value: string) => void;
}) => (
  <Editor
    theme="vs-dark"
    height="94vh"
    width="50vw"
    defaultLanguage="javascript"
    onChange={value => setInput(value || '')}
    value={input}
  />
);

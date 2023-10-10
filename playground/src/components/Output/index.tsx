import { Editor } from '@monaco-editor/react';

export const Output = ({ output }: { output: string }) => (
  <Editor
    theme="vs-dark"
    height="94vh"
    width="50vw"
    defaultLanguage="javascript"
    value={output}
    options={{ readOnly: true }}
  />
);

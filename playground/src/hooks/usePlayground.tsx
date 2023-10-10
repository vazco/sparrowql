import { useEffect, useState } from 'react';
import { build } from 'sparrowql';
import { parseQuery, updateQuery } from '../utils';
import { example1 } from '../examples';

const fn = `
  function get() {
    if (typeof aliases !== 'undefined') {
      return {projection, relations, start, aliases };
    }
    return { projection, relations, start };
  }

  get();
`;

const evaluateValue = ({ value }: { value: string }) => {
  try {
    return eval(value);
  } catch (e) {
    return e;
  }
};

const sparrowBuild = ({
  projection,
  relations,
  start,
  aliases
}: {
  projection: Record<string, unknown>;
  relations: any;
  start: string;
  aliases: Record<string, string>;
}) => {
  console.log(projection, aliases)
  try {
    return build({ projection, relations, start, ...(aliases && aliases) });
  } catch (e) {
    return e;
  }
};

const getError = ({ value, output }: { value: any; output: unknown }) => {
  if (value instanceof Error) {
    return { errorMessage: value };
  }

  if (output instanceof Error) {
    return { errorMessage: output };
  }

  return { errorMessage: null };
};

export const usePlayground = () => {
  const [input, setInput] = useState<string>(example1);

  const value = evaluateValue({ value: `${input}${fn}` });

  const { projection, relations, start, aliases } = value || {};
  const output = sparrowBuild({ relations, projection, start, aliases });

  const { errorMessage } = getError({ value, output });

  useEffect(() => {
    const inputFromUrl = parseQuery();
    if (inputFromUrl) {
        setInput(inputFromUrl);
    } else {
        updateQuery(example1);
    }
  }, []);
  const _setInput = (value: string) => {
    updateQuery(value);
    setInput(value);
  };

  return {
    input,
    setInput: _setInput,
    output: errorMessage
      ? errorMessage.toString()
      : JSON.stringify(output, null, 2),
  };
};

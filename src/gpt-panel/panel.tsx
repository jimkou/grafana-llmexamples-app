import React, { useState } from 'react';
import { PanelProps } from '@grafana/data';
import { llms } from '@grafana/experimental';
import { Button, Input, Spinner } from '@grafana/ui';
import { useAsync } from 'react-use';

interface Props extends PanelProps<{}> {}

export function GptPanel({ data }: Props) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');

  const { loading, error, value } = useAsync(async () => {
    const openAIHealthDetails = await llms.openai.enabled();
    const enabled = openAIHealthDetails.ok;
    if (!enabled) {
      return { enabled };
    }
    if (message === '') {
      return { enabled };
    }

    const context = JSON.stringify(
      data.series?.map((series) => {
        const values = series.fields[0].values.toArray();
        return {
          name: series.name ?? series.fields[0].name,
          lastValues: values.slice(-5),
        };
      }) ?? []
    );

    const response = await llms.openai.chatCompletions({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: `${message}\nDashboard context: ${context}` },
      ],
    });
    setReply(response.choices[0].message.content);
    return { enabled };
  }, [message, data]);

  return (
    <div style={{ padding: '8px' }}>
      {value?.enabled ? (
        <>
          <Input value={input} onChange={(e) => setInput(e.currentTarget.value)} placeholder="Ask GPT" />
          <Button onClick={() => setMessage(input)} style={{ marginLeft: '4px' }}>
            Send
          </Button>
          <div style={{ marginTop: '8px' }}>{loading ? <Spinner /> : reply}</div>
          {error && <div>Error: {error.message}</div>}
        </>
      ) : (
        <div>LLM plugin not enabled.</div>
      )}
    </div>
  );
}

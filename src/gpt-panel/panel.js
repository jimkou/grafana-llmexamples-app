import React, { useState } from 'react';
import { FieldType } from '@grafana/data';
import { llms } from '@grafana/experimental';
import { Button, Input, Spinner } from '@grafana/ui';
import { useAsync } from 'react-use';

export function GptPanel({ data }) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');

  const { loading, error, value } = useAsync(async () => {
    const openAIHealthDetails = await llms.openai.enabled();
    const enabled = openAIHealthDetails.ok;
    if (!enabled || message === '') {
      return { enabled };
    }

    const now = Date.now();
    const context = JSON.stringify(
      (data.series || []).map((series) => {
        const timeField = series.fields.find((f) => f.type === FieldType.time);
        const valueField = series.fields.find((f) => f.type !== FieldType.time);
        const recent = [];
        if (timeField && valueField) {
          for (let i = timeField.values.length - 1; i >= 0; i--) {
            const ts = timeField.values.get(i);
            if (now - ts <= 5 * 60 * 1000) {
              recent.unshift(valueField.values.get(i));
            } else {
              break;
            }
          }
        }
        return {
          name: series.name ?? (valueField && valueField.name),
          lastValues: recent.slice(-5),
        };
      })
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
          <Input
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Ask GPT"
          />
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

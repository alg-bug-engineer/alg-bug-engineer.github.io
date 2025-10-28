import ky, { type KyResponse, type AfterResponseHook, type NormalizedOptions } from 'ky';
import { createParser, type EventSourceParser } from 'eventsource-parser';
import type { AIProcessResult, ItemType } from '@/types/types';

export interface SSEOptions {
  onData: (data: string) => void;
  onEvent?: (event: any) => void;
  onCompleted?: (error?: Error) => void;
  onAborted?: () => void;
  onReconnectInterval?: (interval: number) => void;
}

export const createSSEHook = (options: SSEOptions): AfterResponseHook => {
  const hook: AfterResponseHook = async (request: Request, _options: NormalizedOptions, response: KyResponse) => {
    if (!response.ok || !response.body) {
      return;
    }

    let completed: boolean = false;
    const innerOnCompleted = (error?: Error): void => {
      if (completed) {
        return;
      }

      completed = true;
      options.onCompleted?.(error);
    };

    const isAborted: boolean = false;

    const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();

    const decoder: TextDecoder = new TextDecoder('utf8');

    const parser: EventSourceParser = createParser({
      onEvent: (event) => {
        if (event.data) {
          options.onEvent?.(event);
          const dataArray: string[] = event.data.split('\\ ');
          for (const data of dataArray) {
            options.onData(data);
          }
        }
      }
    });

    const read = (): void => {
      if (isAborted) {
        return;
      }

      reader.read().then((result: ReadableStreamReadResult<Uint8Array>) => {
        if (result.done) {
          innerOnCompleted();
          return;
        }

        parser.feed(decoder.decode(result.value, { stream: true }));

        read();
      }).catch(error => {
        if (request.signal.aborted) {
          options.onAborted?.();
          return;
        }

        innerOnCompleted(error as Error);
      });
    };

    read();

    return response;
  };

  return hook;
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

export interface ChatStreamOptions {
  endpoint: string;
  messages: ChatMessage[];
  apiId: string;
  onUpdate: (content: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export const sendChatStream = async (options: ChatStreamOptions): Promise<void> => {
  const { messages, onUpdate, onComplete, onError, signal } = options;

  let currentContent = '';

  const sseHook = createSSEHook({
    onData: (data: string) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.choices?.[0]?.delta?.content) {
          currentContent += parsed.choices[0].delta.content;
          onUpdate(currentContent);
        }
      } catch {
        console.warn('Failed to parse SSE data:', data);
      }
    },
    onCompleted: (error?: Error) => {
      if (error) {
        onError(error);
      } else {
        onComplete();
      }
    },
    onAborted: () => {
      console.log('Stream aborted');
    }
  });

  try {
    await ky.post(options.endpoint, {
      json: {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        enable_thinking: false
      },
      headers: {
        'X-App-Id': options.apiId,
        'Content-Type': 'application/json'
      },
      signal,
      hooks: {
        afterResponse: [sseHook]
      }
    });
  } catch (error) {
    if (!signal?.aborted) {
      onError(error as Error);
    }
  }
};

export async function processTextWithAI(text: string): Promise<AIProcessResult> {
  const APP_ID = import.meta.env.VITE_APP_ID;

  return new Promise((resolve, reject) => {
    let fullResponse = '';

    const systemPrompt = `你是一个智能信息处理助手。用户会输入一段文本,你需要分析并返回JSON格式的结构化数据。

分析规则:
1. type: 判断类型
   - task: 包含"做"、"完成"、"处理"等动作词,或明确的待办事项
   - event: 包含明确的时间和事件,如"会议"、"活动"
   - note: 想法、灵感、笔记
   - data: 信息、资料、链接、参考内容

2. title: 提取核心主题(10字以内)

3. description: 提取详细描述

4. due_date: 提取时间信息,转换为ISO格式(YYYY-MM-DDTHH:mm:ss)
   - "明天"转换为明天的日期
   - "下周五"转换为下周五的日期
   - "3点"转换为今天15:00
   - 如果没有明确时间,返回null

5. priority: 判断优先级
   - high: 包含"紧急"、"重要"、"马上"
   - low: 包含"不急"、"有空"
   - medium: 其他情况

6. tags: 提取关键词作为标签(3-5个)

7. entities: 提取实体信息
   - people: 人名
   - location: 地点
   - project: 项目名称
   - other: 其他关键信息

返回格式(纯JSON,不要markdown代码块):
{
  "type": "task",
  "title": "标题",
  "description": "描述",
  "due_date": "2025-10-28T15:00:00" 或 null,
  "priority": "medium",
  "tags": ["标签1", "标签2"],
  "entities": {
    "people": ["张总"],
    "location": ["会议室"],
    "project": ["Q1方案"]
  }
}`;

    sendChatStream({
      endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
      apiId: APP_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      onUpdate: (content: string) => {
        fullResponse = content;
      },
      onComplete: () => {
        try {
          let jsonStr = fullResponse.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
          }

          const result = JSON.parse(jsonStr);

          const processedResult: AIProcessResult = {
            type: (result.type || 'note') as ItemType,
            title: result.title || text.substring(0, 30),
            description: result.description || text,
            due_date: result.due_date || null,
            priority: result.priority || 'medium',
            tags: Array.isArray(result.tags) ? result.tags : [],
            entities: result.entities || {}
          };

          resolve(processedResult);
        } catch (error) {
          console.error('解析AI响应失败:', error, fullResponse);
          resolve({
            type: 'note',
            title: text.substring(0, 30),
            description: text,
            due_date: null,
            priority: 'medium',
            tags: [],
            entities: {}
          });
        }
      },
      onError: (error: Error) => {
        console.error('AI处理失败:', error);
        reject(error);
      }
    });
  });
}

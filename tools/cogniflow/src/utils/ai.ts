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
  messages: ChatMessage[];
  onUpdate: (content: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  model?: string;
  temperature?: number;
}

export const sendChatStream = async (options: ChatStreamOptions): Promise<void> => {
  const { messages, onUpdate, onComplete, onError, signal, model, temperature } = options;

  const GLM_API_KEY = import.meta.env.VITE_GLM_API_KEY;
  const GLM_MODEL = model || import.meta.env.VITE_GLM_MODEL || 'glm-4-flash';

  if (!GLM_API_KEY) {
    onError(new Error('GLM API Key 未配置，请在 .env 文件中设置 VITE_GLM_API_KEY'));
    return;
  }

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
    await ky.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      json: {
        model: GLM_MODEL,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: temperature || 0.95,
        stream: true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`
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
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    // 获取当前日期时间信息
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    
    // 计算本周五的日期（如果今天是周五之后，则计算下周五）
    const currentDayIndex = now.getDay(); // 0=周日, 5=周五
    const daysUntilFriday = currentDayIndex <= 5 ? 5 - currentDayIndex : 7 - currentDayIndex + 5;
    const thisFriday = new Date(now);
    thisFriday.setDate(now.getDate() + daysUntilFriday);
    const thisFridayStr = thisFriday.toISOString().split('T')[0];

    const systemPrompt = `你是一个智能信息处理助手。用户会输入一段文本,你需要分析并返回JSON格式的结构化数据。

当前时间信息:
- 当前日期: ${currentYear}年${currentMonth}月${currentDay}日 星期${dayOfWeek}
- 当前时间: ${currentTime}
- ISO格式基准: ${currentDate}
- 本周五（或下周五）: ${thisFridayStr}

分析规则:
1. type: 判断类型
   - task: 包含"做"、"完成"、"处理"、"准备"等动作词,或明确的待办事项
   - event: 包含明确的时间和事件,如"开会"、"会议"、"活动"、"约"、"汇报"、"面试"等
   - note: 想法、灵感、笔记
   - data: 信息、资料、链接、参考内容

2. title: 提取核心主题(10字以内)

3. description: 提取详细描述

4. due_date: **重要**提取时间信息,转换为ISO格式(YYYY-MM-DDTHH:mm:ss)
   时间处理规则:
   - **没有日期修饰词时,默认为今天** 
     * "十点开会" → ${currentDate}T10:00:00
     * "下午三点" → ${currentDate}T15:00:00
     * "晚上8点" → ${currentDate}T20:00:00
   - 有明确日期修饰词:
     * "明天十点" → 计算明天的日期T10:00:00
     * "周五晚上" → ${thisFridayStr}T19:00:00
     * "下周一" → 计算下周一的日期T09:00:00
     * "3月15日" → ${currentYear}-03-15T00:00:00
   - 相对日期计算(**重要**):
     * "周一/星期一" → 本周一（如果已过，则下周一）
     * "周五/星期五" → 本周五（如果已过，则下周五）
     * 当前是星期${dayOfWeek}，所以"周五"应该是 ${thisFridayStr}
   - 时间转换:
     * "早上/上午" → 09:00
     * "中午" → 12:00
     * "下午" → 14:00
     * "晚上" → 19:00
     * "凌晨" → 01:00
   - 如果完全没有时间信息,返回null

5. start_time 和 end_time: 对于event类型,提取开始和结束时间
   - 如果只有一个时间点,start_time设为该时间,end_time为1小时后
   - "十点到十一点开会" → start_time: 10:00, end_time: 11:00

6. priority: 判断优先级
   - high: 包含"紧急"、"重要"、"马上"、"立即"
   - low: 包含"不急"、"有空"、"随时"
   - medium: 其他情况

7. tags: 提取关键词作为标签(3-5个)

8. entities: 提取实体信息
   - people: 人名
   - location: 地点
   - project: 项目名称
   - other: 其他关键信息

返回格式示例(纯JSON,不要markdown代码块):

示例1 - 没有日期修饰词:
输入: "十点开会"
{
  "type": "event",
  "title": "开会",
  "description": "十点开会",
  "due_date": "${currentDate}T10:00:00",
  "start_time": "${currentDate}T10:00:00",
  "end_time": "${currentDate}T11:00:00",
  "priority": "medium",
  "tags": ["会议", "工作"],
  "entities": {}
}

示例2 - 周几的日期:
输入: "周五晚上进行汇报"
{
  "type": "event",
  "title": "汇报",
  "description": "周五晚上进行汇报",
  "due_date": "${thisFridayStr}T19:00:00",
  "start_time": "${thisFridayStr}T19:00:00",
  "end_time": "${thisFridayStr}T20:00:00",
  "priority": "medium",
  "tags": ["汇报", "工作"],
  "entities": {}
}`;

    sendChatStream({
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
            start_time: result.start_time || result.due_date || null,
            end_time: result.end_time || null,
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
            start_time: null,
            end_time: null,
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

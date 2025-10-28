import type { URLFetchResult } from '@/types/types';

// URL正则表达式
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

/**
 * 检测文本中是否包含URL
 */
export function detectURL(text: string): string | null {
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
}

/**
 * 检测文本是否主要是URL(URL占比超过50%)
 */
export function isMainlyURL(text: string): boolean {
  const url = detectURL(text);
  if (!url) return false;
  
  // 如果文本主要是URL(去除空格后URL占比超过50%)
  const trimmedText = text.trim();
  return url.length / trimmedText.length > 0.5;
}

/**
 * 调用Edge Function抓取URL内容
 */
export async function fetchURLContent(url: string): Promise<URLFetchResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase配置缺失');
  }
  
  const functionUrl = `${supabaseUrl}/functions/v1/fetch-url-content`;
  
  console.log('🌐 正在抓取URL:', url);
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({ url })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`抓取URL失败: ${error}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || '抓取URL失败');
  }
  
  console.log('✅ URL抓取成功:', result.title);
  
  return {
    url: result.url,
    title: result.title,
    summary: result.summary,
    thumbnail: result.thumbnail,
    content: result.content
  };
}

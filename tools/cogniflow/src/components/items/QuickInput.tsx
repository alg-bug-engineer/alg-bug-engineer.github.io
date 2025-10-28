import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { processTextWithAI } from '@/utils/ai';
import { detectURL, isMainlyURL, fetchURLContent } from '@/utils/urlProcessor';
import { itemApi } from '@/db/api';
import { supabase } from '@/db/supabase';

interface QuickInputProps {
  onItemCreated?: () => void;
  onProcessingStart?: (text: string, id: string) => void;
  onProcessingComplete?: (id: string) => void;
  onProcessingError?: (id: string) => void;
}

export default function QuickInput({ 
  onItemCreated, 
  onProcessingStart,
  onProcessingComplete,
  onProcessingError 
}: QuickInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error('请输入内容');
      return;
    }

    const inputText = text.trim();
    const processingId = `processing-${Date.now()}`;
    
    // 立即清空输入框,让用户可以继续输入
    setText('');
    
    // 通知父组件开始处理
    onProcessingStart?.(inputText, processingId);

    // 异步处理,不阻塞UI
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('请先登录');
        onProcessingError?.(processingId);
        return;
      }

      // 检测是否为URL
      const detectedURL = detectURL(inputText);
      const isURL = detectedURL && isMainlyURL(inputText);

      if (isURL && detectedURL) {
        // 处理URL类型
        console.log('🔗 检测到URL,开始抓取内容...');
        toast.info('正在抓取网页内容...');

        try {
          const urlResult = await fetchURLContent(detectedURL);

          // 创建URL类型的条目
          const newItem = await itemApi.createItem({
            user_id: user.id,
            raw_text: inputText,
            type: 'url',
            title: urlResult.title,
            description: urlResult.summary,
            due_date: null,
            priority: 'medium',
            status: 'pending',
            tags: ['链接', '网页'],
            entities: {},
            archived_at: null,
            url: urlResult.url,
            url_title: urlResult.title,
            url_summary: urlResult.summary,
            url_thumbnail: urlResult.thumbnail,
            url_fetched_at: new Date().toISOString()
          });

          if (newItem) {
            toast.success('链接已保存到链接库');
            onProcessingComplete?.(processingId);
            onItemCreated?.();
          } else {
            toast.error('保存失败,请重试');
            onProcessingError?.(processingId);
          }
        } catch (error) {
          console.error('URL处理失败:', error);
          toast.error('抓取网页内容失败,请检查URL是否有效');
          onProcessingError?.(processingId);
        }
      } else {
        // 普通文本,使用AI处理
        const aiResult = await processTextWithAI(inputText);

        // 创建条目
        const newItem = await itemApi.createItem({
          user_id: user.id,
          raw_text: inputText,
          type: aiResult.type,
          title: aiResult.title,
          description: aiResult.description,
          due_date: aiResult.due_date,
          priority: aiResult.priority,
          status: 'pending',
          tags: aiResult.tags,
          entities: aiResult.entities,
          archived_at: null,
          url: null,
          url_title: null,
          url_summary: null,
          url_thumbnail: null,
          url_fetched_at: null
        });

        if (newItem) {
          toast.success('已添加到智能仪表盘');
          onProcessingComplete?.(processingId);
          onItemCreated?.();
        } else {
          toast.error('创建失败,请重试');
          onProcessingError?.(processingId);
        }
      }
    } catch (error) {
      console.error('处理失败:', error);
      toast.error('处理失败,请重试');
      onProcessingError?.(processingId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg z-50">
      <div className="max-w-4xl mx-auto flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入任何想法、任务、日程或URL链接... (Enter发送, Shift+Enter换行)"
          className="min-h-[60px] max-h-[120px] resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={!text.trim()}
          size="lg"
          className="px-6"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

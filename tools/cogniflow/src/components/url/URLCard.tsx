import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, Tag, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Item } from '@/types/types';

interface URLCardProps {
  item: Item;
  onDelete?: (id: string) => void;
}

export function URLCard({ item, onDelete }: URLCardProps) {
  const handleOpenURL = () => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">
              {item.url_title || item.title || '未知标题'}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {format(new Date(item.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenURL}
              title="打开链接"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 缩略图 */}
        {item.url_thumbnail && (
          <div className="w-full h-40 rounded-md overflow-hidden bg-muted">
            <img
              src={item.url_thumbnail}
              alt={item.url_title || '网站缩略图'}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 摘要 */}
        {item.url_summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {item.url_summary}
          </p>
        )}

        {/* URL */}
        {item.url && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{item.url}</span>
          </div>
        )}

        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

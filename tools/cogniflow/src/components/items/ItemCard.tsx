import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Edit, Archive, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Item } from '@/types/types';
import { itemApi } from '@/db/api';
import { toast } from 'sonner';
import { useState } from 'react';
import EditItemDialog from './EditItemDialog';

interface ItemCardProps {
  item: Item;
  onUpdate?: () => void;
}

const typeLabels = {
  task: '任务',
  event: '日程',
  note: '笔记',
  data: '资料'
};

const typeColors = {
  task: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  event: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  note: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  data: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

const priorityColors = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-green-500'
};

export default function ItemCard({ item, onUpdate }: ItemCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isCompleted = item.status === 'completed';
  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && !isCompleted;

  const handleToggleComplete = async () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    const success = await itemApi.updateItem(item.id, { status: newStatus });

    if (success) {
      toast.success(isCompleted ? '已标记为未完成' : '已完成');
      onUpdate?.();
    } else {
      toast.error('操作失败');
    }
  };

  const handleArchive = async () => {
    const success = await itemApi.archiveItem(item.id);

    if (success) {
      toast.success('已归档');
      onUpdate?.();
    } else {
      toast.error('归档失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条记录吗?')) return;

    const success = await itemApi.deleteItem(item.id);

    if (success) {
      toast.success('已删除');
      onUpdate?.();
    } else {
      toast.error('删除失败');
    }
  };

  return (
    <>
      <Card className={`${priorityColors[item.priority as keyof typeof priorityColors] || ''} ${isCompleted ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              {(item.type === 'task' || item.type === 'event') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-6 w-6 mt-0.5"
                  onClick={handleToggleComplete}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </Button>
              )}
              <div className="flex-1">
                <CardTitle className={`text-lg ${isCompleted ? 'line-through' : ''}`}>
                  {item.title || '无标题'}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={typeColors[item.type]}>
                    {typeLabels[item.type]}
                  </Badge>
                  {item.due_date && (
                    <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {isOverdue && <AlertCircle className="h-4 w-4" />}
                      <Calendar className="h-4 w-4" />
                      <span>
                        {isToday(new Date(item.due_date))
                          ? '今天'
                          : format(new Date(item.due_date), 'MM月dd日 HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {item.description}
            </p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchive}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditItemDialog
        item={item}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}

'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Account {
  id: string;
  phone: string;
  fullName: string | null;
  username: string | null;
}

export function MultiAccountSelector({
  accounts,
  selectedIds,
  onChange,
}: {
  accounts: Account[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onChange(accounts.map((a) => a.id));
  const selectNone = () => onChange([]);
  const isAll = selectedIds.length === accounts.length;
  const isMulti = selectedIds.length > 1;

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {isMulti ? `${selectedIds.length} حسابات مختارة` : 'حساب واحد'}
            </span>
            {isMulti && (
              <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs">
                Multi-Account
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={isAll ? selectNone : selectAll} className="h-7 text-xs">
              {isAll ? 'إلغاء الكل' : 'تحديد الكل'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-7">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Quick select: first account or all */}
        {!expanded && (
          <div className="flex gap-2 flex-wrap">
            {accounts.slice(0, 3).map((a) => (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition ${
                  selectedIds.includes(a.id)
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted hover:bg-muted/70'
                }`}
              >
                {selectedIds.includes(a.id) && <Check className="size-3" />}
                {a.fullName || a.phone}
              </button>
            ))}
            {accounts.length > 3 && (
              <button
                onClick={() => setExpanded(true)}
                className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted"
              >
                +{accounts.length - 3} المزيد...
              </button>
            )}
          </div>
        )}

        {/* Expanded: full list */}
        {expanded && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-md text-sm transition ${
                  selectedIds.includes(a.id)
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted'
                }`}
              >
                <div className={`size-5 rounded-md border-2 grid place-items-center shrink-0 ${
                  selectedIds.includes(a.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}>
                  {selectedIds.includes(a.id) && <Check className="size-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className="font-medium">{a.fullName || a.phone}</span>
                  <span className="text-xs text-muted-foreground mr-2" dir="ltr">{a.phone}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {isMulti && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-purple-500/10 text-xs text-purple-700 dark:text-purple-400">
            <span className="text-base">⚡</span>
            <span>سيتم توزيع العمل على {selectedIds.length} حسابات تلقائياً (أسرع + أمان أكبر)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

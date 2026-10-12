'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/format';
import type { PaymentOrder } from '@/types';

interface PendingPaymentBannerProps {
  payment: PaymentOrder;
  approving: string | null;
  onApprove: (orderId: string) => void;
}

export function PendingPaymentBanner({ payment, approving, onApprove }: PendingPaymentBannerProps) {
  return (
    <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-500 truncate">
          Apartado: <strong>{money(Number(payment.amount))} MXN</strong> ({payment.concept})
        </p>
        <p className="text-[10px] text-amber-500/80 mt-0.5">
          Ref: {payment.id.slice(0, 8).toUpperCase()} · Vence en ~25 min
        </p>
      </div>
      <Button
        variant="success"
        size="sm"
        onClick={() => onApprove(payment.id)}
        disabled={approving === payment.id}
        className="h-7 text-xs font-bold shrink-0"
      >
        <CheckCircle2 className="size-3.5" />
        {approving === payment.id ? 'Aprobando...' : 'Aprobar Pago'}
      </Button>
    </div>
  );
}

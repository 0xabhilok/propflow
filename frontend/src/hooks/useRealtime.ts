import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RealtimeEvent } from '../types';

type TableName =
  | 'maintenance_requests'
  | 'payments'
  | 'leases'
  | 'units'
  | 'properties';

interface UseRealtimeOptions {
  table: TableName;
  filter?: string; // e.g. "property_id=eq.uuid"
  onInsert?: (payload: RealtimeEvent) => void;
  onUpdate?: (payload: RealtimeEvent) => void;
  onDelete?: (payload: RealtimeEvent) => void;
  onChange?: (payload: RealtimeEvent) => void; // fires on any event
}

/**
 * useRealtime — subscribes to a Supabase Realtime channel for a given table.
 * Automatically cleans up the subscription on unmount.
 *
 * @example
 * useRealtime({
 *   table: 'maintenance_requests',
 *   onChange: () => refetchMaintenance(),
 * });
 */
export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const stableOnInsert = useRef(onInsert);
  const stableOnUpdate = useRef(onUpdate);
  const stableOnDelete = useRef(onDelete);
  const stableOnChange = useRef(onChange);

  useEffect(() => {
    stableOnInsert.current = onInsert;
    stableOnUpdate.current = onUpdate;
    stableOnDelete.current = onDelete;
    stableOnChange.current = onChange;
  });

  const handleEvent = useCallback((event: RealtimeEvent) => {
    stableOnChange.current?.(event);
    if (event.eventType === 'INSERT') stableOnInsert.current?.(event);
    if (event.eventType === 'UPDATE') stableOnUpdate.current?.(event);
    if (event.eventType === 'DELETE') stableOnDelete.current?.(event);
  }, []);

  useEffect(() => {
    const channelName = `propflow:${table}${filter ? `:${filter}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: any) => handleEvent(payload as RealtimeEvent)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug(`[Realtime] Subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error on ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, filter, handleEvent]);
}

export default useRealtime;

import { sqliteClient } from "./infrastructure/sqlite/sqlite-client.js";
import axios from "axios";

export function startSyncWorker() {
  const syncInterval = 10000; // 10 seconds
  const centralServerUrl = process.env.CENTRAL_SERVER_URL || 'http://localhost:3000/sync/batch';

  setInterval(async () => {
    try {
      // Find pending outbox items
      const pendingItems = await (sqliteClient as any).outbox.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50
      });

      if (pendingItems.length === 0) return;

      console.log(`[Sync Worker] Found ${pendingItems.length} pending items to sync.`);

      // Send to central server
      const response = await axios.post(centralServerUrl, { items: pendingItems }, {
        headers: {
          'Content-Type': 'application/json',
          // Add some shared secret or auth token in the future
          'Authorization': `Bearer ${process.env.SYNC_SECRET || 'offline-sync-secret'}`
        },
        timeout: 5000
      });

      if (response.status === 200) {
        // Mark as synced
        const ids = pendingItems.map((item: any) => item.id);
        await (sqliteClient as any).outbox.updateMany({
          where: { id: { in: ids } },
          data: { status: 'SYNCED' }
        });
        console.log(`[Sync Worker] Successfully synced ${ids.length} items.`);
      }
    } catch (error: any) {
      console.error('[Sync Worker] Sync failed:', error.message);
    }
  }, syncInterval);
}

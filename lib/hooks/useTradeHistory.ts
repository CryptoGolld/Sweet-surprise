/**
 * Hook to fetch trade history and calculate candlestick data
 */

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { CONTRACTS } from '../constants';
import { calculateSpotPrice } from '../utils/bondingCurve';

interface Trade {
  timestamp: number;
  supply: number;
  price: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useTradeHistory(coinType: string, curveId: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['trade-history', curveId],
    queryFn: async (): Promise<CandleData[]> => {
      try {
        // Query Buy events
        const buyEvents = await client.queryEvents({
          query: {
            MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::Bought`,
          },
          limit: 100,
          order: 'descending',
        });

        // Query Sell events
        const sellEvents = await client.queryEvents({
          query: {
            MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::Sold`,
          },
          limit: 100,
          order: 'descending',
        });

        // Combine and sort all trades by timestamp
        const allEvents = [...buyEvents.data, ...sellEvents.data];
        
        // Filter events for this specific token and extract trade data
        const trades: Trade[] = [];
        
        for (const event of allEvents) {
          try {
            // Get the transaction to find which curve this trade was for
            const txDetails = await client.getTransactionBlock({
              digest: event.id.txDigest,
              options: {
                showInput: true,
                showObjectChanges: true,
              },
            });

            // Check if this transaction involves our curve
            const involvesOurCurve = txDetails.objectChanges?.some(
              (change: any) => change.objectId === curveId
            );

            if (!involvesOurCurve) continue;

            // After the trade, get the curve state to know the supply
            const objectChanges = txDetails.objectChanges || [];
            const curveChange = objectChanges.find(
              (change: any) => change.objectId === curveId && change.type === 'mutated'
            );

            if (curveChange) {
              // Fetch the curve object after this trade to get token_supply
              const curveObj = await client.getObject({
                id: curveId,
                options: { showContent: true },
                version: (curveChange as any).version,
              });

              if (curveObj.data?.content?.dataType === 'moveObject') {
                const fields = (curveObj.data.content as any).fields;
                const supply = Number(fields.token_supply || 0);
                const price = calculateSpotPrice(supply);
                
                trades.push({
                  timestamp: parseInt(event.timestampMs || '0'),
                  supply,
                  price,
                });
              }
            }
          } catch (error) {
            console.warn('Failed to process trade:', error);
          }
        }

        // Sort trades by timestamp (oldest first)
        trades.sort((a, b) => a.timestamp - b.timestamp);

        if (trades.length === 0) {
          return [];
        }

        // Group trades into 5-minute buckets and calculate OHLC
        const buckets = new Map<number, Trade[]>();
        const bucketSize = 5 * 60 * 1000; // 5 minutes in milliseconds

        for (const trade of trades) {
          const bucketTime = Math.floor(trade.timestamp / bucketSize) * bucketSize;
          if (!buckets.has(bucketTime)) {
            buckets.set(bucketTime, []);
          }
          buckets.get(bucketTime)!.push(trade);
        }

        // Convert buckets to candlestick data
        const candles: CandleData[] = [];
        
        for (const [bucketTime, bucketTrades] of buckets.entries()) {
          if (bucketTrades.length === 0) continue;

          const prices = bucketTrades.map(t => t.price);
          
          candles.push({
            time: Math.floor(bucketTime / 1000), // Convert to seconds for lightweight-charts
            open: bucketTrades[0].price,
            high: Math.max(...prices),
            low: Math.min(...prices),
            close: bucketTrades[bucketTrades.length - 1].price,
          });
        }

        // Sort candles by time
        candles.sort((a, b) => a.time - b.time);

        return candles;
      } catch (error) {
        console.error('Failed to fetch trade history:', error);
        return [];
      }
    },
    enabled: !!curveId && !!coinType,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

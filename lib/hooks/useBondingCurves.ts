/**
 * Hook to fetch bonding curves from blockchain
 */

import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { CONTRACTS } from '../constants';
import { toast } from 'sonner';

export interface BondingCurve {
  id: string;
  ticker: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
  curveSupply: string;
  curveBalance: string;
  graduated: boolean;
  createdAt: number;
  coinType: string;
}

export function useBondingCurves() {
  const client = useSuiClient();
  
  return useQuery({
    queryKey: ['bonding-curves'],
    staleTime: 5000, // Data stays fresh for 5 seconds
    gcTime: 60000, // Keep in cache for 60 seconds (was cacheTime in older versions)
    queryFn: async (): Promise<BondingCurve[]> => {
      try {
        console.log('🔍 Querying bonding curves from:', CONTRACTS.PLATFORM_PACKAGE);
        
        // Query ALL Created events with pagination
        let allEvents: any[] = [];
        let hasMore = true;
        let cursor: any = null;
        let pageCount = 0;
        
        while (hasMore) {
          pageCount++;
          console.log(`Fetching page ${pageCount}, cursor:`, cursor || 'initial');
          
          const queryParams: any = {
            query: {
              MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::Created`,
            },
            limit: 50,
            order: 'descending' as const,
          };
          
          // Only add cursor if it exists
          if (cursor) {
            queryParams.cursor = cursor;
          }
          
          const result = await client.queryEvents(queryParams);
          
          console.log(`Page ${pageCount}: Found ${result.data.length} events, hasNextPage: ${result.hasNextPage}`);
          
          allEvents = allEvents.concat(result.data);
          
          if (result.hasNextPage && result.nextCursor) {
            cursor = result.nextCursor;
          } else {
            hasMore = false;
          }
        }
        
        console.log(`✅ Total: ${allEvents.length} Created events across ${pageCount} pages`);
        
        if (allEvents.length === 0) {
          console.warn('No events found!');
          return [];
        }
        
        const events = { data: allEvents };
        
        // Step 1: Fetch all transaction details in parallel
        const txDetailsPromises = events.data.map(event =>
          client.getTransactionBlock({
            digest: event.id.txDigest,
            options: { showObjectChanges: true },
          }).catch(err => {
            console.warn(`Failed to fetch tx ${event.id.txDigest}:`, err);
            return null;
          })
        );
        
        const txDetailsResults = await Promise.all(txDetailsPromises);
        
        // Step 2: Extract curve IDs and filter out failed requests
        const curveInfos: Array<{ id: string; event: any }> = [];
        txDetailsResults.forEach((txDetails, index) => {
          if (!txDetails) return;
          
          const curveObj = txDetails.objectChanges?.find(
            (obj: any) => obj.type === 'created' && obj.objectType?.includes('bonding_curve::BondingCurve')
          );
          
          if (curveObj) {
            curveInfos.push({
              id: (curveObj as any).objectId,
              event: events.data[index],
            });
          }
        });
        
        // Step 3: Fetch all curve objects in parallel
        const curveObjectsPromises = curveInfos.map(info =>
          client.getObject({
            id: info.id,
            options: { showContent: true, showType: true },
          }).catch(err => {
            console.warn(`Failed to fetch curve ${info.id}:`, err);
            return null;
          })
        );
        
        const curveObjects = await Promise.all(curveObjectsPromises);
        
        // Step 4: Process curves and collect metadata requests
        const curvesWithoutMetadata: Array<BondingCurve & { needsMetadata: boolean }> = [];
        const metadataRequests: Array<{ coinType: string; index: number }> = [];
        
        curveObjects.forEach((curveObject, index) => {
          if (!curveObject?.data?.content || curveObject.data.content.dataType !== 'moveObject') {
            return;
          }
          
          const content = curveObject.data.content as any;
          const fields = content.fields;
          const info = curveInfos[index];
          
          // Extract coin type from object type
          const fullObjectType = content.type;
          const match = fullObjectType.match(/<(.+)>/);
          const coinType = match ? match[1] : '';
          
          // Get ticker from coin type (last part)
          const typeParts = coinType.split('::');
          const ticker = typeParts[typeParts.length - 1] || 'UNKNOWN';
          
          const curve = {
            id: info.id,
            ticker,
            name: ticker,
            description: '',
            imageUrl: '',
            creator: fields.creator || '0x0',
            curveSupply: fields.token_supply || '0',
            curveBalance: fields.sui_reserve || '0',
            graduated: fields.graduated || false,
            createdAt: info.event.timestampMs ? parseInt(info.event.timestampMs) : Date.now(),
            coinType,
            needsMetadata: true,
          };
          
          curvesWithoutMetadata.push(curve);
          metadataRequests.push({ coinType, index: curvesWithoutMetadata.length - 1 });
        });
        
        // Step 5: Fetch all metadata in parallel
        const metadataPromises = metadataRequests.map(req =>
          client.getCoinMetadata({ coinType: req.coinType }).catch(() => null)
        );
        
        const metadataResults = await Promise.all(metadataPromises);
        
        // Step 6: Apply metadata to curves
        metadataResults.forEach((metadata, i) => {
          const request = metadataRequests[i];
          const curve = curvesWithoutMetadata[request.index];
          
          if (metadata) {
            curve.name = metadata.name || curve.ticker;
            curve.description = metadata.description || '';
            curve.imageUrl = metadata.iconUrl || '';
          }
        });
        
        const curves = curvesWithoutMetadata.map(({ needsMetadata, ...curve }) => curve);
        
        console.log(`📊 Loaded ${curves.length} bonding curves`);
        
        return curves;
      } catch (error: any) {
        console.error('❌ Failed to fetch bonding curves:', error);
        
        // Show detailed error toast for mobile debugging
        const errorMsg = error.message || error.toString();
        const debugInfo = {
          error: errorMsg,
          package: CONTRACTS.PLATFORM_PACKAGE,
          timestamp: new Date().toISOString(),
        };
        
        toast.error('❌ Failed to load coins', {
          description: errorMsg,
          duration: 10000,
          action: {
            label: '📋 Copy Details',
            onClick: () => {
              navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
              toast.success('📋 Error details copied!');
            },
          },
        });
        
        throw error; // Re-throw so the error UI shows
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3, // Retry 3 times on failure
  });
}

export function useBondingCurve(curveId: string) {
  const client = useSuiClient();
  
  return useQuery({
    queryKey: ['bonding-curve', curveId],
    queryFn: async () => {
      const curveObject = await client.getObject({
        id: curveId,
        options: { showContent: true, showType: true },
      });
      
      if (curveObject.data?.content?.dataType !== 'moveObject') {
        throw new Error('Invalid curve object');
      }
      
      const content = curveObject.data.content as any;
      const fields = content.fields;
      
      // Extract coin type
      let coinType = '';
      const objectType = curveObject.data.content.type;
      const match = objectType.match(/<(.+)>/);
      if (match) {
        coinType = match[1];
      }
      
      return {
        id: curveId,
        ticker: fields.ticker || 'UNKNOWN',
        name: fields.name || 'Unknown',
        description: fields.description || '',
        imageUrl: fields.image_url || '',
        creator: fields.creator,
        curveSupply: fields.curve_supply || '0',
        curveBalance: fields.curve_balance || '0',
        graduated: fields.graduated || false,
        coinType,
        ...fields,
      };
    },
    enabled: !!curveId,
    refetchInterval: 5000,
  });
}

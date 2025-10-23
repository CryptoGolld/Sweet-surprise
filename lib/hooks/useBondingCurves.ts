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
    queryFn: async (): Promise<BondingCurve[]> => {
      try {
        console.log('🔍 Querying bonding curves from:', CONTRACTS.PLATFORM_PACKAGE);
        
        // Show debug toast on mobile
        toast.info('🔍 Fetching coins...', {
          description: `Querying: ${CONTRACTS.PLATFORM_PACKAGE}`,
          duration: 3000,
        });
        
        // Query CurveCreated events
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::CurveCreated`,
          },
          limit: 50,
          order: 'descending',
        });
        
        console.log(`✅ Found ${events.data.length} CurveCreated events`);
        
        // Show results toast
        if (events.data.length === 0) {
          toast.warning('No CurveCreated events found', {
            description: 'No coins have been created yet on this platform',
            duration: 5000,
          });
        } else {
          toast.success(`✅ Found ${events.data.length} coins!`, {
            description: 'Loading curve data...',
            duration: 3000,
          });
        }
        
        const curves: BondingCurve[] = [];
        
        for (const event of events.data) {
          const fields = event.parsedJson as any;
          
          // Fetch current curve state
          let curveSupply = '0';
          let curveBalance = '0';
          let graduated = false;
          let coinType = '';
          
          try {
            const curveObject = await client.getObject({
              id: fields.curve_id,
              options: { showContent: true },
            });
            
            if (curveObject.data?.content?.dataType === 'moveObject') {
              const content = curveObject.data.content as any;
              curveSupply = content.fields.curve_supply || '0';
              curveBalance = content.fields.curve_balance || '0';
              graduated = content.fields.graduated || false;
              
              // Extract coin type from object type
              const objectType = curveObject.data.content.type;
              const match = objectType.match(/<(.+)>/);
              if (match) {
                coinType = match[1];
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch curve ${fields.curve_id}:`, error);
          }
          
          curves.push({
            id: fields.curve_id,
            ticker: fields.ticker || 'UNKNOWN',
            name: fields.name || 'Unknown Coin',
            description: fields.description || '',
            imageUrl: fields.image_url || '',
            creator: fields.creator,
            curveSupply,
            curveBalance,
            graduated,
            createdAt: event.timestampMs ? parseInt(event.timestampMs) : Date.now(),
            coinType,
          });
        }
        
        console.log(`📊 Loaded ${curves.length} bonding curves`);
        
        // Final success toast
        toast.success('📊 Coins loaded!', {
          description: `${curves.length} coins available for trading`,
          duration: 4000,
        });
        
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
          description: `${errorMsg}\n\nTap to copy error details`,
          duration: 10000,
          onClick: () => {
            navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
            toast.success('📋 Error details copied!');
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

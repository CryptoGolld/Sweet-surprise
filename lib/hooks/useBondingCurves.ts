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
          description: `Querying Created events`,
          duration: 3000,
        });
        
        // Query Created events
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${CONTRACTS.PLATFORM_PACKAGE}::bonding_curve::Created`,
          },
          limit: 50,
          order: 'descending',
        });
        
        console.log(`✅ Found ${events.data.length} Created events`);
        
        if (events.data.length === 0) {
          toast.warning('No coins found', {
            description: 'Create the first memecoin!',
            duration: 5000,
          });
          return [];
        }
        
        toast.success(`✅ Found ${events.data.length} events!`, {
          description: 'Loading curve details...',
          duration: 3000,
        });
        
        const curves: BondingCurve[] = [];
        
        for (const event of events.data) {
          try {
            // Get the transaction details to find the created BondingCurve object
            const txDetails = await client.getTransactionBlock({
              digest: event.id.txDigest,
              options: {
                showObjectChanges: true,
              },
            });
            
            // Find the BondingCurve object that was created
            const curveObj = txDetails.objectChanges?.find(
              (obj: any) => obj.type === 'created' && obj.objectType?.includes('bonding_curve::BondingCurve')
            );
            
            if (!curveObj) continue;
            
            const curveId = (curveObj as any).objectId;
            
            // Fetch the curve's current state
            const curveObject = await client.getObject({
              id: curveId,
              options: { showContent: true, showType: true },
            });
            
            if (curveObject.data?.content?.dataType === 'moveObject') {
              const content = curveObject.data.content as any;
              const fields = content.fields;
              
              // Extract coin type from object type
              const fullObjectType = curveObject.data.content.type;
              const match = fullObjectType.match(/<(.+)>/);
              const coinType = match ? match[1] : '';
              
              // Get ticker from coin type (last part)
              const typeParts = coinType.split('::');
              const ticker = typeParts[typeParts.length - 1] || 'UNKNOWN';
              
              // Fetch CoinMetadata to get name, description, and icon
              let name = ticker;
              let description = '';
              let imageUrl = '';
              
              try {
                const metadata = await client.getCoinMetadata({ coinType });
                if (metadata) {
                  name = metadata.name || ticker;
                  description = metadata.description || '';
                  imageUrl = metadata.iconUrl || '';
                }
              } catch (e) {
                console.warn(`Failed to fetch metadata for ${ticker}:`, e);
              }
              
              curves.push({
                id: curveId,
                ticker,
                name,
                description,
                imageUrl,
                creator: fields.creator || '0x0',
                curveSupply: fields.token_supply || '0',
                curveBalance: fields.sui_reserve || '0', // Balance is stored directly as a number
                graduated: fields.graduated || false,
                createdAt: event.timestampMs ? parseInt(event.timestampMs) : Date.now(),
                coinType,
              });
            }
          } catch (error) {
            console.warn(`Failed to process event:`, error);
          }
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

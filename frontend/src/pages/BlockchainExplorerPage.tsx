import { useEffect, useState } from 'react';
import { Database, Search } from 'lucide-react';
import { apiClient } from '@/api/client';
import { SectionHeading, Card } from '@/components/ui/Card';
import { Spinner, ErrorState } from '@/components/ui/Feedback';
import { HashChip } from '@/components/ui/Badge';
import { formatDateTime } from '@/utils/format';

interface Transaction {
  id: string;
  title: string;
  network: string;
  transactionDigest: string;
  objectId: string;
  anchoredAt: string;
  onChainHash: string;
}

export const BlockchainExplorerPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const { data } = await apiClient.get<{ data: Transaction[] }>('/blockchain/transactions');
        setTransactions(data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTx();
  }, []);

  const filtered = transactions.filter(t => 
    t.transactionDigest?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.objectId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6">
      <SectionHeading
        eyebrow="Network"
        title="Blockchain Explorer"
        description="Explore recent integrity anchors stored on the Sui network."
      />

      <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by Transaction Digest or Object ID" 
          className="bg-transparent border-none text-white focus:outline-none w-full"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8 text-blue-500" />
        </div>
      ) : error ? (
        <ErrorState title="Error" message={error} />
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-slate-400">No transactions found.</p>
          ) : (
            filtered.map((tx) => (
              <Card key={tx.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-semibold text-white">{tx.title}</h3>
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{tx.network}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-24">Tx Digest:</span>
                        <HashChip hash={tx.transactionDigest} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-24">Object ID:</span>
                        <HashChip hash={tx.objectId} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-24">On-Chain Hash:</span>
                        <HashChip hash={tx.onChainHash} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">{formatDateTime(tx.anchoredAt)}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { Building } from 'lucide-react';
import { apiClient } from '@/api/client';
import { SectionHeading, Card } from '@/components/ui/Card';
import { Spinner, ErrorState } from '@/components/ui/Feedback';

interface Hospital {
  _id: string;
  name: string;
  address: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
}

export const HospitalsPage = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const { data } = await apiClient.get<{ data: Hospital[] }>('/hospitals');
        setHospitals(data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load hospitals');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHospitals();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <SectionHeading
        eyebrow="Directory"
        title="Hospitals & Organizations"
        description="Verified healthcare providers on the network."
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8 text-blue-500" />
        </div>
      ) : error ? (
        <ErrorState title="Error" message={error} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.length === 0 ? (
            <p className="text-slate-400">No hospitals found.</p>
          ) : (
            hospitals.map((h) => (
              <Card key={h._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white flex items-center">
                      <Building className="h-5 w-5 mr-2 text-blue-400" />
                      {h.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">{h.address}</p>
                    <div className="mt-4 space-y-1 text-sm text-slate-300">
                      <p>Email: {h.contactEmail}</p>
                      {h.contactPhone && <p>Phone: {h.contactPhone}</p>}
                      {h.website && (
                        <p>
                          Website:{' '}
                          <a href={h.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                            {h.website}
                          </a>
                        </p>
                      )}
                    </div>
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

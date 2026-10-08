import React from 'react';
import { Complaint } from '../../types';
import { MapPin, AlertCircle, Building2, Flame, Layers } from 'lucide-react';

interface CampusHeatmapProps {
  complaints: Complaint[];
  selectedLocation: string | null;
  onSelectLocation: (location: string | null) => void;
}

interface LocationZone {
  id: string;
  name: string;
  category: 'HOSTEL' | 'ACADEMIC' | 'COMMUNAL' | 'RECREATION';
  coordinates: { colSpan: string; rowSpan: string };
}

const CAMPUS_ZONES: LocationZone[] = [
  { id: 'Block-I (Administrative Block & Examination Cell)', name: 'Block-I (Admin & Exam)', category: 'COMMUNAL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Block-II (Civil & Mechanical Engineering)', name: 'Block-II (Civil & Mech)', category: 'ACADEMIC', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Block-III (Electronics & Electrical Engineering - ECE & EEE)', name: 'Block-III (ECE & EEE)', category: 'ACADEMIC', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Block-IV (Computer Science & Information Technology - CSE & IT)', name: 'Block-IV (CSE & IT)', category: 'ACADEMIC', coordinates: { colSpan: 'col-span-2', rowSpan: 'row-span-1' } },
  { id: 'Block-V (Basic Sciences & Humanities - Freshman Block)', name: 'Block-V (Sciences & Freshmen)', category: 'ACADEMIC', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Silver Jubilee Block (SJB - Lecture Halls & Seminar Halls)', name: 'Silver Jubilee Block (SJB)', category: 'ACADEMIC', coordinates: { colSpan: 'col-span-2', rowSpan: 'row-span-1' } },
  { id: 'Central Library & Digital Knowledge Centre', name: 'Central Library & Digital Lab', category: 'ACADEMIC', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Auditorium & Open Air Theatre (OAT)', name: 'Auditorium & Open Air Theatre', category: 'COMMUNAL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Boys Hostel-1 (BH-1 / Krishna Hostel)', name: 'Boys Hostel-1 (BH-1 / Krishna)', category: 'HOSTEL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Boys Hostel-2 (BH-2 / Godavari Hostel)', name: 'Boys Hostel-2 (BH-2 / Godavari)', category: 'HOSTEL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Boys Hostel-3 (BH-3 / Kaveri Hostel)', name: 'Boys Hostel-3 (BH-3 / Kaveri)', category: 'HOSTEL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Girls Hostel-1 (GH-1 / Priyadarshini Hostel)', name: 'Girls Hostel-1 (GH-1 / Priyadarshini)', category: 'HOSTEL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Girls Hostel-2 (GH-2 / Sarojini Hostel)', name: 'Girls Hostel-2 (GH-2 / Sarojini)', category: 'HOSTEL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Student Central Mess & Dining Hall', name: 'Central Mess & Dining Hall', category: 'COMMUNAL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Campus Cafeteria & Canteen', name: 'Campus Cafeteria & Canteen', category: 'COMMUNAL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Indoor Sports Complex, Gymnasium & Badminton Courts', name: 'Indoor Sports Complex & Gym', category: 'RECREATION', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Outdoor Sports Ground & Cricket Pavilion', name: 'Sports Ground & Pavilion', category: 'RECREATION', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
  { id: 'Campus Transport & Bus Parking Bay', name: 'Transport & Bus Parking Bay', category: 'COMMUNAL', coordinates: { colSpan: 'col-span-1', rowSpan: 'row-span-1' } },
];

export const CampusHeatmap: React.FC<CampusHeatmapProps> = ({
  complaints,
  selectedLocation,
  onSelectLocation,
}) => {
  // Calculate complaint counts per location
  const locationStats = React.useMemo(() => {
    const counts: Record<string, { total: number; open: number; overdue: number; topCategory: string }> = {};

    CAMPUS_ZONES.forEach((zone) => {
      counts[zone.id] = { total: 0, open: 0, overdue: 0, topCategory: 'None' };
    });

    const categoryTally: Record<string, Record<string, number>> = {};

    complaints.forEach((c) => {
      // Fuzzy match location
      const matchedZone = CAMPUS_ZONES.find(
        (z) =>
          c.location.toLowerCase().includes(z.name.toLowerCase()) ||
          z.name.toLowerCase().includes(c.location.toLowerCase()) ||
          (c.building && z.name.toLowerCase().includes(c.building.toLowerCase()))
      );

      const zoneId = matchedZone ? matchedZone.id : 'Academic Block';
      if (!counts[zoneId]) counts[zoneId] = { total: 0, open: 0, overdue: 0, topCategory: 'None' };

      counts[zoneId].total += 1;
      if (!['RESOLVED', 'CLOSED'].includes(c.status)) {
        counts[zoneId].open += 1;
      }
      if (c.isOverdue || c.status === 'ESCALATED') {
        counts[zoneId].overdue += 1;
      }

      if (!categoryTally[zoneId]) categoryTally[zoneId] = {};
      categoryTally[zoneId][c.category] = (categoryTally[zoneId][c.category] || 0) + 1;
    });

    Object.keys(categoryTally).forEach((zId) => {
      const top = Object.entries(categoryTally[zId]).sort((a, b) => b[1] - a[1])[0];
      if (top) counts[zId].topCategory = top[0];
    });

    return counts;
  }, [complaints]);

  // Color generator based on open tickets density
  const getDensityStyle = (openCount: number, overdueCount: number) => {
    if (overdueCount > 0 || openCount >= 5) {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200',
        badge: 'bg-rose-600 text-white',
        status: 'Critical Hotspot',
        flame: true,
      };
    }
    if (openCount >= 3) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
        badge: 'bg-amber-500 text-white',
        status: 'Active Reports',
        flame: false,
      };
    }
    if (openCount >= 1) {
      return {
        bg: 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200',
        badge: 'bg-indigo-600 text-white',
        status: 'Normal',
        flame: false,
      };
    }
    return {
      bg: 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
      badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      status: 'Clean',
      flame: false,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Interactive Campus Geographic Heatmap</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time concentration of open maintenance tickets and SLA risks across campus zones
          </p>
        </div>

        {selectedLocation && (
          <button
            onClick={() => onSelectLocation(null)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear Location Filter ({selectedLocation})
          </button>
        )}
      </div>

      {/* Campus Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CAMPUS_ZONES.map((zone) => {
          const stats = locationStats[zone.id] || { total: 0, open: 0, overdue: 0, topCategory: 'None' };
          const style = getDensityStyle(stats.open, stats.overdue);
          const isSelected = selectedLocation === zone.id;

          return (
            <div
              key={zone.id}
              onClick={() => onSelectLocation(isSelected ? null : zone.id)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${style.bg} ${
                isSelected
                  ? 'ring-4 ring-indigo-500 shadow-lg scale-102 border-indigo-600'
                  : 'hover:shadow-md hover:scale-101'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                    {zone.category}
                  </span>
                  <h4 className="font-bold text-sm leading-tight">{zone.name}</h4>
                </div>

                {style.flame && (
                  <span className="p-1 rounded-lg bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 animate-pulse">
                    <Flame className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div className="flex items-end justify-between mt-4">
                <div>
                  <div className="text-2xl font-extrabold">{stats.open}</div>
                  <span className="text-[11px] opacity-75">
                    Open Issue{stats.open !== 1 ? 's' : ''} ({stats.total} total)
                  </span>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style.badge}`}>
                    {style.status}
                  </span>
                  {stats.topCategory !== 'None' && (
                    <span className="block text-[10px] mt-1 opacity-70 truncate max-w-[110px]">
                      Top: {stats.topCategory}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

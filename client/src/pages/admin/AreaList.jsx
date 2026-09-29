import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  MapPin, PlusCircle, Edit, Trash2, UserCheck, 
  Users, AlertCircle, CheckCircle2, XCircle, X, Loader2 
} from 'lucide-react';

export default function AreaList() {
  const [areas, setAreas] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [assignModalArea, setAssignModalArea] = useState(null);
  const [selectedCollectorIds, setSelectedCollectorIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Add form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [areasData, colsData] = await Promise.all([
        api.getAreas(),
        api.getCollectors()
      ]);
      setAreas(areasData);
      setCollectors(colsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateArea = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.createArea({ name, code, description, status });
      setShowAddModal(false);
      setName('');
      setCode('');
      setDescription('');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditArea = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.updateArea(editingArea.id, editingArea);
      setEditingArea(null);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteArea = async (area) => {
    if (!confirm(`Are you sure you want to delete area "${area.name}"?`)) return;
    try {
      await api.deleteArea(area.id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAssignModal = (area) => {
    setAssignModalArea(area);
    // Find current assigned collector IDs
    const assignedIds = collectors
      .filter(c => c.areas?.some(a => a.id === area.id))
      .map(c => c.id);
    setSelectedCollectorIds(assignedIds);
  };

  const handleSaveAssignments = async () => {
    if (!assignModalArea) return;
    try {
      setActionLoading(true);
      await api.assignCollectorsToArea(assignModalArea.id, selectedCollectorIds);
      setAssignModalArea(null);
      fetchData();
    } catch (err) {
      alert('Assignment failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            <span>Area & Coverage Zone Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize service zones and allocate dedicated Bill Collectors to each area
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Area</span>
        </button>
      </div>

      {/* Areas Table & Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Area Name</th>
                <th className="p-3.5">Area Code</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Subscribers</th>
                <th className="p-3.5">Total Area Due</th>
                <th className="p-3.5">Assigned Collectors</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No areas found. Click "Create New Area" to add one!
                  </td>
                </tr>
              ) : (
                areas.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900">{a.name}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {a.code}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 max-w-xs truncate">{a.description || '-'}</td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {a.customer_count} ({a.active_customers} Active)
                    </td>
                    <td className="p-3.5 font-mono font-black text-rose-600">
                      {a.total_due} BDT
                    </td>
                    <td className="p-3.5">
                      {a.assigned_collectors ? (
                        <span className="text-emerald-700 font-medium">{a.assigned_collectors}</span>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openAssignModal(a)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold"
                        title="Assign Collectors"
                      >
                        Assign Collector
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingArea(a)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArea(a)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Area */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Create New Area</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Area Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mirpur, Mohammadpur, Uttara"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Area Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MIR, MOH, UTT"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Sections 1 to 14"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                >
                  Create Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Collectors */}
      {assignModalArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">
                Assign Collectors to {assignModalArea.name}
              </h3>
              <button onClick={() => setAssignModalArea(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selected collectors will be granted permission to access and collect from subscribers in this area.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3">
              {collectors.length === 0 ? (
                <div className="text-xs text-slate-400 p-2">No collectors available. Create collectors first.</div>
              ) : (
                collectors.map((col) => {
                  const isChecked = selectedCollectorIds.includes(col.id);
                  return (
                    <label key={col.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCollectorIds(prev => [...prev, col.id]);
                          } else {
                            setSelectedCollectorIds(prev => prev.filter(i => i !== col.id));
                          }
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">{col.name}</span>
                        <span className="text-[10px] text-slate-500">{col.phone}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalArea(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveAssignments}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

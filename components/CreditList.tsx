
import React, { useState } from 'react';
import { Credit, Repayment, RecoveryAction } from '../types';

interface CreditListProps {
  credits: Credit[];
  onDeleteCredit: (id: string) => void;
  onEditCredit?: (credit: Credit) => void;
  onAddRepayment: (creditId: string, repayment: Repayment) => void;
  onUpdateRepayment?: (creditId: string, repayment: Repayment) => void;
  onDeleteRepayment?: (creditId: string, repaymentId: string) => void;
  onAddRecoveryAction?: (creditId: string, action: RecoveryAction) => void;
  onPrintDossier?: (credit: Credit) => void;
  onExportDossier?: (credit: Credit) => void;
  userRole?: 'Administrateur' | 'Directeur' | 'Opérateur' | 'Agents commerciaux' | 'Autres' | null;
  currentUser?: string | null;
}

const CreditList: React.FC<CreditListProps> = ({ credits, onDeleteCredit, onEditCredit, onAddRepayment, onUpdateRepayment, onDeleteRepayment, onAddRecoveryAction, onPrintDossier, onExportDossier, userRole, currentUser }) => {
  const [repaymentData, setRepaymentData] = useState<Record<string, { date: string; capital: string; interests: string; penalty: string }>>({});
  const [recoveryData, setRecoveryData] = useState<Record<string, { date: string; comment: string }>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [showRecoveryHistory, setShowRecoveryHistory] = useState<Record<string, boolean>>({});
  
  const [editingRepaymentId, setEditingRepaymentId] = useState<string | null>(null);
  const [tempRepayment, setTempRepayment] = useState<Repayment | null>(null);

  const handleRepaymentChange = (creditId: string, field: string, value: string) => {
    setRepaymentData(prev => ({
      ...prev,
      [creditId]: {
        ...(prev[creditId] || { date: new Date().toISOString().split('T')[0], capital: '', interests: '', penalty: '' }),
        [field]: value
      }
    }));
  };

  const handleRecoveryChange = (creditId: string, field: string, value: string) => {
    setRecoveryData(prev => ({
      ...prev,
      [creditId]: {
        ...(prev[creditId] || { date: new Date().toISOString().split('T')[0], comment: '' }),
        [field]: value
      }
    }));
  };

  const toggleHistory = (creditId: string) => {
    setShowHistory(prev => ({
      ...prev,
      [creditId]: !prev[creditId]
    }));
  };

  const toggleRecoveryHistory = (creditId: string) => {
    setShowRecoveryHistory(prev => ({
      ...prev,
      [creditId]: !prev[creditId]
    }));
  };

  const submitRepayment = (creditId: string) => {
    const data = repaymentData[creditId];
    if (!data || (!data.capital && !data.interests && !data.penalty)) return;

    const credit = credits.find(c => c.id === creditId);
    if (!credit) return;

    const newRepayment: Repayment = {
      id: crypto.randomUUID(),
      date: data.date || new Date().toISOString().split('T')[0],
      capital: Number(data.capital) || 0,
      interests: Number(data.interests) || 0,
      penalty: Number(data.penalty) || 0,
      microfinance_code: credit.microfinance_code,
      username: currentUser || ''
    };

    onAddRepayment(creditId, newRepayment);
    setRepaymentData(prev => ({
      ...prev,
      [creditId]: { date: new Date().toISOString().split('T')[0], capital: '', interests: '', penalty: '' }
    }));
  };

  const submitRecoveryAction = (creditId: string) => {
    const data = recoveryData[creditId];
    if (!data || !data.comment || !onAddRecoveryAction) return;

    const credit = credits.find(c => c.id === creditId);
    if (!credit) return;

    const newAction: RecoveryAction = {
      id: crypto.randomUUID(),
      date: data.date || new Date().toISOString().split('T')[0],
      comment: data.comment,
      microfinance_code: credit.microfinance_code,
      username: currentUser || ''
    };

    onAddRecoveryAction(creditId, newAction);
    setRecoveryData(prev => ({
      ...prev,
      [creditId]: { date: new Date().toISOString().split('T')[0], comment: '' }
    }));
  };

  const startRepaymentEdit = (repayment: Repayment) => {
    setEditingRepaymentId(repayment.id);
    setTempRepayment({ ...repayment });
  };

  const saveRepaymentEdit = (creditId: string) => {
    if (tempRepayment && onUpdateRepayment) {
      onUpdateRepayment(creditId, tempRepayment);
    }
    setEditingRepaymentId(null);
    setTempRepayment(null);
  };

  if (credits.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 italic text-sm">
        Aucun dossier dans cette catégorie.
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const isRestricted = userRole === 'Autres' || userRole === 'Agents commerciaux';
  const canCorrect = userRole === 'Administrateur' || userRole === 'Directeur';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Client</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crédit / Restant</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gestion</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {credits.map((credit) => {
            const totalCapitalRepaid = (credit.repayments || []).reduce((acc, r) => acc + r.capital, 0);
            const totalInterestsRepaid = (credit.repayments || []).reduce((acc, r) => acc + r.interests, 0);
            const totalPenaltyPaid = (credit.repayments || []).reduce((acc, r) => acc + r.penalty, 0);
            
            const capitalBalance = (credit.creditAccordeChiffre || 0) - totalCapitalRepaid;
            const interestBalance = (credit.intTotal || 0) - totalInterestsRepaid;
            const isSettled = capitalBalance <= 0 && interestBalance <= 0;

            const repaymentDeadline = credit.creditType === 'ORDINAIRE FIDELIA' 
              ? credit.dateDernierRemboursement 
              : credit.aRembourserLe;
            
            const isLate = !isSettled && repaymentDeadline && today > repaymentDeadline;
            
            let diffDays: number | null = null;
            if (repaymentDeadline && !isSettled) {
              const deadlineDate = new Date(repaymentDeadline);
              const todayDate = new Date(today);
              diffDays = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            const isApproaching = diffDays !== null && diffDays <= 5 && diffDays >= 0;

            let delayText = "";
            if (isLate && repaymentDeadline) {
              const start = new Date(repaymentDeadline);
              const end = new Date(today);
              let years = end.getFullYear() - start.getFullYear();
              let months = end.getMonth() - start.getMonth();
              let days = end.getDate() - start.getDate();

              if (days < 0) {
                months--;
                const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
                days += prevMonth.getDate();
              }
              if (months < 0) {
                years--;
                months += 12;
              }
              delayText = `${years} an(s), ${months} mois, ${days} jour(s)`;
            }

            return (
              <React.Fragment key={credit.id}>
                <tr className={`${isSettled ? 'bg-gray-50' : 'hover:bg-gray-50'} transition-colors`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-700 uppercase">{credit.creditType}</span>
                      {isLate && (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          RETARD
                        </span>
                      )}
                      {isApproaching && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          ÉCHÉANCE PROCHE
                        </span>
                      )}
                      {isSettled && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-200">
                          SOLDÉ
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      {isApproaching && <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse shadow-orange-500/50"></span>}
                      {credit.clientName} {credit.surNom ? `(${credit.surNom})` : ''}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Échéance: {repaymentDeadline || '-'}
                    </div>
                    <div className="text-[10px] text-gray-600 font-bold">
                      Zone: {credit.zone || '-'} | Tél: {credit.tel || '-'}
                    </div>
                    {isLate && (
                      <div className="text-[10px] font-bold text-red-600 mt-1">
                        Retard de: {delayText}
                      </div>
                    )}
                    {isApproaching && (
                      <div className="text-[10px] font-bold text-orange-600 mt-1">
                        Alerte : Échéance dans {diffDays} jour(s)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">Initial: {credit.creditAccordeChiffre?.toLocaleString()} FCFA</div>
                    <div className={`text-sm font-bold ${isSettled ? 'text-gray-400' : 'text-green-600'}`}>
                      Restant Cap: {capitalBalance.toLocaleString()} FCFA
                    </div>
                    <div className={`text-sm font-bold ${isSettled ? 'text-gray-400' : 'text-blue-600'}`}>
                      Restant Int: {interestBalance.toLocaleString()} FCFA
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-4">
                      {!isSettled && !isRestricted && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Enregistrer un remboursement</label>
                          <div className="flex flex-wrap gap-1">
                            <input
                              type="date"
                              className="w-28 border rounded p-1 text-[10px] bg-slate-800 text-white"
                              value={repaymentData[credit.id]?.date || new Date().toISOString().split('T')[0]}
                              onChange={(e) => handleRepaymentChange(credit.id, 'date', e.target.value)}
                            />
                            <input
                              placeholder="Cap"
                              type="number"
                              className="w-16 border rounded p-1 text-[10px] bg-slate-800 text-white"
                              value={repaymentData[credit.id]?.capital || ''}
                              onChange={(e) => handleRepaymentChange(credit.id, 'capital', e.target.value)}
                            />
                            <input
                              placeholder="Int"
                              type="number"
                              className="w-16 border rounded p-1 text-[10px] bg-slate-800 text-white"
                              value={repaymentData[credit.id]?.interests || ''}
                              onChange={(e) => handleRepaymentChange(credit.id, 'interests', e.target.value)}
                            />
                            <input
                              placeholder="Pén"
                              type="number"
                              className="w-16 border rounded p-1 text-[10px] bg-slate-800 text-white"
                              value={repaymentData[credit.id]?.penalty || ''}
                              onChange={(e) => handleRepaymentChange(credit.id, 'penalty', e.target.value)}
                            />
                            <button
                              onClick={() => submitRepayment(credit.id)}
                              className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-md hover:bg-emerald-700 transition-colors"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}

                      {onAddRecoveryAction && !isRestricted && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Action de recouvrement</label>
                          <div className="flex flex-wrap gap-1">
                            <input
                              type="date"
                              className="w-28 border rounded p-1 text-[10px] bg-slate-800 text-white"
                              value={recoveryData[credit.id]?.date || new Date().toISOString().split('T')[0]}
                              onChange={(e) => handleRecoveryChange(credit.id, 'date', e.target.value)}
                            />
                            <input
                              placeholder="Commentaire..."
                              className="flex-1 min-w-[100px] border rounded p-1 text-[10px] bg-slate-800 text-white"
                              value={recoveryData[credit.id]?.comment || ''}
                              onChange={(e) => handleRecoveryChange(credit.id, 'comment', e.target.value)}
                            />
                            <button
                              onClick={() => submitRecoveryAction(credit.id)}
                              className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-md hover:bg-orange-700 transition-colors"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button 
                          onClick={() => toggleHistory(credit.id)}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          {showHistory[credit.id] ? "Cacher historique" : "Voir historique paiements"}
                        </button>
                        <button 
                          onClick={() => toggleRecoveryHistory(credit.id)}
                          className="text-[10px] font-bold text-orange-600 hover:underline"
                        >
                          {showRecoveryHistory[credit.id] ? "Cacher actions" : "Voir actions recouvrement"}
                        </button>
                      </div>

                      {showHistory[credit.id] && (
                        <div className="mt-2 text-[10px] bg-gray-50 p-2 rounded border">
                          <div className="font-bold mb-1 border-b pb-1">Historique des paiements:</div>
                          {(credit.repayments || []).length === 0 ? "Aucun paiement." : (
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="pr-2">Date</th>
                                  <th className="pr-4">Cap</th>
                                  <th className="pr-4">Int</th>
                                  <th className="pr-4">Pén</th>
                                  <th className="pr-2">Par</th>
                                  {canCorrect && <th className="text-right">Corriger</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {credit.repayments.map(r => (
                                  <tr key={r.id} className="border-t border-gray-100">
                                    <td className="pr-2">
                                      {editingRepaymentId === r.id ? (
                                        <input 
                                          type="date" 
                                          value={tempRepayment?.date} 
                                          onChange={(e) => setTempRepayment(prev => prev ? {...prev, date: e.target.value} : null)}
                                          className="bg-slate-800 text-white rounded p-0.5 w-full"
                                        />
                                      ) : r.date}
                                    </td>
                                    <td className="pr-4">
                                      {editingRepaymentId === r.id ? (
                                        <input 
                                          type="number" 
                                          value={tempRepayment?.capital} 
                                          onChange={(e) => setTempRepayment(prev => prev ? {...prev, capital: Number(e.target.value)} : null)}
                                          className="bg-slate-800 text-white rounded p-0.5 w-full"
                                        />
                                      ) : r.capital.toLocaleString()}
                                    </td>
                                    <td className="pr-4">
                                      {editingRepaymentId === r.id ? (
                                        <input 
                                          type="number" 
                                          value={tempRepayment?.interests} 
                                          onChange={(e) => setTempRepayment(prev => prev ? {...prev, interests: Number(e.target.value)} : null)}
                                          className="bg-slate-800 text-white rounded p-0.5 w-full"
                                        />
                                      ) : r.interests.toLocaleString()}
                                    </td>
                                    <td className="pr-4">
                                      {editingRepaymentId === r.id ? (
                                        <input 
                                          type="number" 
                                          value={tempRepayment?.penalty} 
                                          onChange={(e) => setTempRepayment(prev => prev ? {...prev, penalty: Number(e.target.value)} : null)}
                                          className="bg-slate-800 text-white rounded p-0.5 w-full"
                                        />
                                      ) : r.penalty.toLocaleString()}
                                    </td>
                                    <td className="pr-2">{r.username}</td>
                                    {canCorrect && (
                                      <td className="text-right space-x-1 whitespace-nowrap">
                                        {editingRepaymentId === r.id ? (
                                          <>
                                            <button onClick={() => saveRepaymentEdit(credit.id)} className="text-green-600 font-bold" title="Enregistrer">V</button>
                                            <button onClick={() => setEditingRepaymentId(null)} className="text-red-600 font-bold" title="Annuler">X</button>
                                          </>
                                        ) : (
                                          <>
                                            <button onClick={() => startRepaymentEdit(r)} className="text-blue-600 font-bold" title="Modifier">✎</button>
                                            <button onClick={() => onDeleteRepayment?.(credit.id, r.id)} className="text-red-600 font-bold" title="Supprimer">🗑</button>
                                          </>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                                <tr className="border-t font-bold">
                                  <td className="pr-2">Total</td>
                                  <td className="pr-4">{totalCapitalRepaid.toLocaleString()}</td>
                                  <td className="pr-4">{totalInterestsRepaid.toLocaleString()}</td>
                                  <td className="pr-4">{totalPenaltyPaid.toLocaleString()}</td>
                                  <td className="pr-2"></td>
                                  {canCorrect && <td></td>}
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}

                      {showRecoveryHistory[credit.id] && (
                        <div className="mt-2 text-[10px] bg-orange-50 p-2 rounded border border-orange-200">
                          <div className="font-bold mb-1 border-b border-orange-200 pb-1">Actions de recouvrement:</div>
                          {(credit.recoveryActions || []).length === 0 ? "Aucune action." : (
                            <ul className="space-y-1">
                              {credit.recoveryActions?.map(a => (
                                <li key={a.id} className="flex space-x-2">
                                  <span className="font-bold whitespace-nowrap">{a.date}:</span>
                                  <span>{a.comment} (Par: {a.username})</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right flex flex-col space-y-2">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => onPrintDossier?.(credit)}
                        className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
                      >
                        Imprimer
                      </button>
                      <button 
                        onClick={() => onExportDossier?.(credit)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-bold"
                      >
                        Exporter
                      </button>
                    </div>
                    <div className="flex justify-end space-x-2">
                      {!isRestricted && (
                        <button 
                          onClick={() => onEditCredit?.(credit)}
                          className="text-gray-600 hover:text-gray-900 text-xs font-bold"
                        >
                          Modifier
                        </button>
                      )}
                      {userRole === 'Administrateur' && (
                        <button 
                          onClick={() => onDeleteCredit(credit.id)}
                          className="text-red-600 hover:text-red-900 text-xs font-bold"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CreditList;

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
  onUpdateRecoveryAction?: (creditId: string, action: RecoveryAction) => void;
  onDeleteRecoveryAction?: (creditId: string, actionId: string) => void;
  onPrintDossier?: (credit: Credit) => void;
  onExportDossier?: (credit: Credit) => void;
  userRole?: 'Administrateur' | 'Directeur' | 'Opérateur' | 'Agents commerciaux' | 'Autres' | null;
  currentUser?: string | null;
}

const getDelayDuration = (dateStr: string) => {
  const start = new Date(dateStr);
  const now = new Date();
  if (now <= start) return "0 an(s), 0 mois, 0 jour(s)";

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years} an(s), ${months} mois, ${days} jour(s)`;
};

const CreditList: React.FC<CreditListProps> = ({ 
  credits, 
  onDeleteCredit, 
  onEditCredit, 
  onAddRepayment, 
  onUpdateRepayment, 
  onDeleteRepayment, 
  onAddRecoveryAction, 
  onUpdateRecoveryAction,
  onDeleteRecoveryAction,
  onPrintDossier, 
  onExportDossier, 
  userRole, 
  currentUser 
}) => {
  const [repaymentData, setRepaymentData] = useState<Record<string, { date: string; capital: string; interests: string; penalty: string }>>({});
  const [recoveryData, setRecoveryData] = useState<Record<string, { date: string; comment: string }>>({});
  const [activeTab, setActiveTab] = useState<Record<string, 'mensualites' | 'suivi'>>({});
  const [activeForm, setActiveForm] = useState<Record<string, 'repayment' | 'recovery'>>({});
  
  const [editingRepaymentId, setEditingRepaymentId] = useState<string | null>(null);
  const [editRepaymentData, setEditRepaymentData] = useState<Repayment | null>(null);
  const [editingRecoveryId, setEditingRecoveryId] = useState<string | null>(null);
  const [editRecoveryData, setEditRecoveryData] = useState<RecoveryAction | null>(null);

  const isAdminOrDirector = userRole === 'Administrateur' || userRole === 'Directeur';

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

  const handleStartEditRepayment = (r: Repayment) => {
    setEditingRepaymentId(r.id);
    setEditRepaymentData({ ...r });
  };

  const handleSaveEditRepayment = (creditId: string) => {
    if (editRepaymentData && onUpdateRepayment) {
      onUpdateRepayment(creditId, editRepaymentData);
      setEditingRepaymentId(null);
      setEditRepaymentData(null);
    }
  };

  const handleStartEditRecovery = (a: RecoveryAction) => {
    setEditingRecoveryId(a.id);
    setEditRecoveryData({ ...a });
  };

  const handleSaveEditRecovery = (creditId: string) => {
    if (editRecoveryData && onUpdateRecoveryAction) {
      onUpdateRecoveryAction(creditId, editRecoveryData);
      setEditingRecoveryId(null);
      setEditRecoveryData(null);
    }
  };

  if (credits.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 italic text-sm">
        Aucun dossier dans cette catégorie.
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const isRestricted = userRole === 'Autres' || userRole === 'Agents commerciaux';

  return (
    <div className="space-y-32 py-10">
      {credits.map((credit, index) => {
        const totalCapitalRepaid = (credit.repayments || []).reduce((acc, r) => acc + r.capital, 0);
        const totalInterestRepaid = (credit.repayments || []).reduce((acc, r) => acc + r.interests, 0);
        const remainingCapital = (credit.creditAccordeChiffre || 0) - totalCapitalRepaid;
        const remainingInterest = (credit.intTotal || 0) - totalInterestRepaid;
        const totalRepaidAll = totalCapitalRepaid + totalInterestRepaid;
        const installments = credit.installments || [];
        const monthlyCapital = (credit.dureeMois || 0) > 0 ? (credit.creditAccordeChiffre / credit.dureeMois) : 0;
        const monthlyInterest = (credit.dureeMois || 0) > 0 ? ((credit.intTotal || 0) / credit.dureeMois) : 0;
        const monthlyExpected = installments.length > 0 ? installments[0].amount : (monthlyCapital + monthlyInterest);
        const totalInstallmentsCount = installments.length || credit.dureeMois || 0;

        const paidCount = installments.length > 0
          ? installments.filter(inst => {
              const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + i.amount, 0);
              return totalRepaidAll >= (cumulativeDue - 1);
            }).length
          : (monthlyExpected > 0 ? Math.min(totalInstallmentsCount, Math.floor((totalRepaidAll + 1) / monthlyExpected)) : 0);

        const echeance = credit.creditType === 'ORDINAIRE FIDELIA' ? credit.dateDernierRemboursement : credit.aRembourserLe;

        const lateCount = installments.length > 0
          ? installments.filter(inst => {
              const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + i.amount, 0);
              const isCovered = totalRepaidAll >= (cumulativeDue - 1);
              return !isCovered && (inst.dueDate < todayStr || (echeance && echeance < todayStr));
            }).length
          : (echeance && echeance < todayStr && totalRepaidAll < (credit.creditAccordeChiffre + (credit.intTotal || 0) - 1)
              ? (totalInstallmentsCount - paidCount)
              : 0);

        const isLate = lateCount > 0 || (echeance && echeance < todayStr);

        const nextInstallment = installments.find(inst => {
          const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + i.amount, 0);
          return totalRepaidAll < (cumulativeDue - 1);
        });

        let isSoon = false;
        if (!isLate) {
          const checkDate = (dateStr: string) => {
            if (!dateStr) return false;
            const targetDate = new Date(dateStr);
            const today = new Date(todayStr);
            const diffTime = targetDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
          };

          if (nextInstallment && checkDate(nextInstallment.dueDate)) {
            isSoon = true;
          } else if (echeance && checkDate(echeance)) {
            isSoon = true;
          }
        }

        const oldestLateInstallment = installments.find(inst => {
          const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + i.amount, 0);
          const isCovered = totalRepaidAll >= (cumulativeDue - 1);
          return !isCovered && inst.dueDate < todayStr;
        });

        const currentTab = activeTab[credit.id] || 'mensualites';
        const currentForm = activeForm[credit.id] || (userRole === 'Agents commerciaux' ? 'recovery' : 'repayment');

        return (
          <div key={credit.id} className="relative">
            {index > 0 && (
              <div className="absolute -top-16 left-0 right-0 flex items-center justify-center">
                <div className="h-2 w-full max-w-lg bg-gray-200 rounded-full"></div>
              </div>
            )}
            <div className={`bg-white rounded-3xl border shadow-xl overflow-hidden transition-all ${isLate ? 'border-red-500 border-l-8' : isSoon ? 'border-orange-500 border-l-8' : 'border-gray-100'}`}>
              <div className={`px-6 py-5 border-b ${isLate ? 'bg-red-50/30 border-red-100' : isSoon ? 'bg-orange-50/30 border-orange-100 animate-pulse' : 'bg-gray-50/50 border-gray-50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{credit.creditType}</span>
                      {isLate && (
                        <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm animate-pulse">RETARD</span>
                      )}
                      {isSoon && !isLate && (
                        <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm animate-pulse">PROCHE</span>
                      )}
                    </div>
                    <span className={`text-base font-black uppercase flex items-center flex-wrap gap-2 ${isLate ? 'text-red-700' : isSoon ? 'text-orange-700' : 'text-gray-900'}`}>
                      {isLate && <span className="text-red-600 text-xl">⚠️ [RETARD]</span>}
                      {isSoon && !isLate && <span className="text-orange-500 text-xl animate-pulse">🔔 [PROCHE]</span>}
                      {credit.clientName}
                      {credit.surNom && <span className="text-[10px] text-gray-400 normal-case font-bold">({credit.surNom})</span>}
                    </span>
                    <div className="text-[10px] font-bold text-gray-500 space-y-1">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <p className={`${isLate ? 'text-red-600 font-black' : isSoon ? 'text-orange-600 font-black animate-pulse' : ''}`}>Échéance: {echeance || '-'}</p>
                        <p>Zone: {credit.zone} | Agent: <span className="text-slate-800 font-black uppercase">{credit.agentCommercial || '-'}</span> | Tél: {credit.tel}</p>
                        <p>Profession: {credit.profession || '-'}</p>
                      </div>
                      <p>Adresse: {credit.adresseDomicile || '-'}</p>
                      {credit.personneReferenceNom && (
                        <p className="text-blue-500">Réf: {credit.personneReferenceNom} | Tél: {credit.personneReferenceTel}</p>
                      )}
                      {oldestLateInstallment && (
                        <p className="text-red-600 font-black bg-red-100/50 p-1 rounded inline-block mt-1">
                          Délai dépassé de : {getDelayDuration(oldestLateInstallment.dueDate)}
                        </p>
                      )}
                      {!oldestLateInstallment && echeance && echeance < todayStr && (
                        <p className="text-red-600 font-black bg-red-100/50 p-1 rounded inline-block mt-1">
                          Délai final dépassé de : {getDelayDuration(echeance)}
                        </p>
                      )}
                      {isSoon && !isLate && nextInstallment && (
                        <p className="text-orange-600 font-black bg-orange-100/50 p-1 rounded inline-block mt-1 animate-pulse">
                          Prochain remboursement : {nextInstallment.dueDate}
                        </p>
                      )}
                      <div className="pt-1 border-t border-gray-200/50 mt-1 flex flex-wrap gap-x-4">
                        <p>Caution: {credit.cautionCivilite} {credit.cautionNom} {credit.cautionPrenoms} | Tél: {credit.cautionTel}</p>
                        <p>Épargne: {credit.noCompte || '-'} | Tontine: {credit.noCompteTontine || '-'} | Mise: {credit.mise || '-'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex flex-row md:flex-col justify-between items-end gap-2 shrink-0">
                    {!isRestricted && (
                      <div className="flex gap-2">
                        <button onClick={() => onPrintDossier?.(credit)} className="text-emerald-600 font-bold text-[10px] uppercase hover:underline">Imprimer</button>
                        <button onClick={() => onExportDossier?.(credit)} className="text-blue-600 font-bold text-[10px] uppercase hover:underline">Exporter</button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-1 text-right">
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase block leading-none">Initial:</span>
                        <span className="text-[10px] font-black text-emerald-600">{(credit.creditAccordeChiffre || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase block leading-none">Intérêt:</span>
                        <span className="text-[10px] font-black text-blue-600">{(credit.intTotal || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase block leading-none">Cap. Rest:</span>
                        <span className={`text-[10px] font-black ${isLate ? 'text-red-700' : isSoon ? 'text-orange-700' : 'text-emerald-800'}`}>{remainingCapital.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase block leading-none">Int. Rest:</span>
                        <span className={`text-[10px] font-black ${isSoon && !isLate ? 'text-orange-700' : 'text-blue-800'}`}>{remainingInterest.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase block leading-none">Mensualités:</span>
                        <span className="text-[10px] font-black text-slate-800">{paidCount} / {totalInstallmentsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-gray-100">
                <button 
                  onClick={() => setActiveTab(prev => ({ ...prev, [credit.id]: 'mensualites' }))}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${currentTab === 'mensualites' ? 'border-b-4 border-emerald-500 text-emerald-600 bg-emerald-50/30' : 'text-gray-400'}`}
                >
                  Mensualités
                </button>
                <button 
                  onClick={() => setActiveTab(prev => ({ ...prev, [credit.id]: 'suivi' }))}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${currentTab === 'suivi' ? 'border-b-4 border-emerald-500 text-emerald-600 bg-emerald-50/30' : 'text-gray-400'}`}
                >
                  Suivi Paiements
                </button>
              </div>

              <div className="p-6">
                {currentTab === 'mensualites' ? (
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className={`flex-1 space-y-4 border-l-4 pl-6 ${isLate ? 'border-red-300' : isSoon ? 'border-orange-300' : 'border-gray-300'}`}>
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Mois (Total)</span>
                        <span className="text-lg font-black text-gray-900">{monthlyExpected.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">Cap. / Mois:</span>
                          <span className="text-xs font-black text-emerald-600">{monthlyCapital.toLocaleString()} FCFA</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-gray-400 uppercase block mb-0.5">Int. / Mois:</span>
                          <span className="text-xs font-black text-blue-600">{monthlyInterest.toLocaleString()} FCFA</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Payées</span>
                        <span className="text-md font-black text-emerald-600">{paidCount} / {totalInstallmentsCount}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] font-black ${isSoon && !isLate ? 'text-orange-400' : 'text-red-400'} uppercase tracking-widest block mb-1`}>En retard</span>
                        <span className={`text-md font-black ${isLate ? 'text-red-700' : 'text-red-600'}`}>{lateCount}</span>
                      </div>
                    </div>

                    <div className="flex-[2] w-full space-y-6">
                      <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Actions</h3>
                      {currentForm === 'repayment' && userRole !== 'Agents commerciaux' && userRole !== 'Autres' ? (
                        <div className="space-y-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Enregistrer un remboursement</span>
                          <div className="flex flex-wrap gap-2">
                            <input 
                              type="date" 
                              className="bg-white text-gray-900 border border-gray-200 rounded-lg p-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                              value={repaymentData[credit.id]?.date || todayStr}
                              onChange={(e) => handleRepaymentChange(credit.id, 'date', e.target.value)}
                            />
                            <div className="flex gap-1">
                              <input placeholder="Cap" type="number" className="w-16 bg-white text-gray-900 border border-gray-200 rounded-lg p-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500" value={repaymentData[credit.id]?.capital || ''} onChange={(e) => handleRepaymentChange(credit.id, 'capital', e.target.value)} />
                              <input placeholder="Int" type="number" className="w-16 bg-white text-gray-900 border border-gray-200 rounded-lg p-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500" value={repaymentData[credit.id]?.interests || ''} onChange={(e) => handleRepaymentChange(credit.id, 'interests', e.target.value)} />
                              <input placeholder="Pén" type="number" className="w-16 bg-white text-gray-900 border border-gray-200 rounded-lg p-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500" value={repaymentData[credit.id]?.penalty || ''} onChange={(e) => handleRepaymentChange(credit.id, 'penalty', e.target.value)} />
                            </div>
                            <button onClick={() => submitRepayment(credit.id)} className="bg-[#10b981] hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors shadow-sm">OK</button>
                          </div>
                        </div>
                      ) : currentForm === 'recovery' && userRole !== 'Autres' ? (
                        <div className="space-y-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Action de recouvrement</span>
                          <div className="flex flex-col gap-2">
                            <input type="date" className="bg-white text-gray-900 border border-gray-200 rounded-lg p-2 text-[10px] font-bold outline-none w-max focus:ring-2 focus:ring-orange-500" value={recoveryData[credit.id]?.date || todayStr} onChange={(e) => handleRecoveryChange(credit.id, 'date', e.target.value)} />
                            <textarea placeholder="Commentaire..." className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg p-3 text-[10px] font-bold outline-none min-h-[60px] focus:ring-2 focus:ring-orange-500" value={recoveryData[credit.id]?.comment || ''} onChange={(e) => handleRecoveryChange(credit.id, 'comment', e.target.value)} />
                            <button onClick={() => submitRecoveryAction(credit.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors shadow-sm w-max">OK</button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-[10px] font-bold text-red-500 italic">Accès restreint à la saisie des remboursements et des actions de recouvrement.</div>
                      )}
                      <div className="flex gap-4 pt-4 border-t border-gray-50">
                        {userRole !== 'Agents commerciaux' && userRole !== 'Autres' && (
                          <button onClick={() => setActiveForm(prev => ({ ...prev, [credit.id]: 'repayment' }))} className={`text-[10px] font-black uppercase transition-colors ${currentForm === 'repayment' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Paiements</button>
                        )}
                        {userRole !== 'Autres' && (
                          <button onClick={() => setActiveForm(prev => ({ ...prev, [credit.id]: 'recovery' }))} className={`text-[10px] font-black uppercase transition-colors ${currentForm === 'recovery' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>Recouvrement</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase mb-4 flex items-center gap-2"><span>📜</span> Historique des Paiements</h4>
                      {(credit.repayments || []).length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">Aucun paiement enregistré.</p>
                      ) : (
                        <div className="space-y-2">
                          {credit.repayments.map(r => (
                            <div key={r.id} className="flex flex-col border-b border-gray-200/50 pb-2 last:border-0">
                              {editingRepaymentId === r.id && editRepaymentData ? (
                                <div className="flex flex-wrap gap-2 py-2 bg-white p-3 rounded-xl shadow-inner">
                                  <input type="date" value={editRepaymentData.date} onChange={(e) => setEditRepaymentData({ ...editRepaymentData, date: e.target.value })} className="text-[9px] border p-1 rounded bg-white text-gray-900" />
                                  <input type="number" value={editRepaymentData.capital} onChange={(e) => setEditRepaymentData({ ...editRepaymentData, capital: Number(e.target.value) })} className="text-[9px] border p-1 rounded w-16 bg-white text-gray-900" />
                                  <input type="number" value={editRepaymentData.interests} onChange={(e) => setEditRepaymentData({ ...editRepaymentData, interests: Number(e.target.value) })} className="text-[9px] border p-1 rounded w-16 bg-white text-gray-900" />
                                  <input type="number" value={editRepaymentData.penalty} onChange={(e) => setEditRepaymentData({ ...editRepaymentData, penalty: Number(e.target.value) })} className="text-[9px] border p-1 rounded w-16 bg-white text-gray-900" />
                                  <button onClick={() => handleSaveEditRepayment(credit.id)} className="bg-emerald-500 text-white text-[9px] px-2 py-1 rounded font-black uppercase">Save</button>
                                  <button onClick={() => setEditingRepaymentId(null)} className="bg-gray-400 text-white text-[9px] px-2 py-1 rounded font-black uppercase">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-bold text-gray-500">{r.date}</span>
                                  <div className="flex gap-3"><span className="font-black text-emerald-600">Cap: {r.capital.toLocaleString()}</span><span className="font-black text-blue-600">Int: {r.interests.toLocaleString()}</span></div>
                                  {isAdminOrDirector && (
                                    <div className="flex gap-2"><button onClick={() => handleStartEditRepayment(r)} className="text-blue-500 font-black px-1 hover:bg-blue-100 rounded">Modif</button><button onClick={() => onDeleteRepayment?.(credit.id, r.id)} className="text-red-500 font-black px-1 hover:bg-red-100 rounded">Suppr</button></div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-orange-50/30 p-4 rounded-2xl border border-orange-100">
                      <h4 className="text-[10px] font-black text-orange-600 uppercase mb-4 flex items-center gap-2"><span>🛡️</span> Suivi de Recouvrement</h4>
                      {(credit.recoveryActions || []).length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">Aucune action enregistrée.</p>
                      ) : (
                        <div className="space-y-3">
                          {credit.recoveryActions.map(a => (
                            <div key={a.id} className="border-l-2 border-orange-200 pl-3 py-1">
                              {editingRecoveryId === a.id && editRecoveryData ? (
                                <div className="flex flex-col gap-2 py-2 bg-white p-3 rounded-xl shadow-inner">
                                  <input type="date" value={editRecoveryData.date} onChange={(e) => setEditRecoveryData({ ...editRecoveryData, date: e.target.value })} className="text-[9px] border p-1 rounded w-max bg-white text-gray-900" />
                                  <textarea value={editRecoveryData.comment} onChange={(e) => setEditRecoveryData({ ...editRecoveryData, comment: e.target.value })} className="text-[9px] border p-1 rounded h-12 bg-white text-gray-900" />
                                  <div className="flex gap-2"><button onClick={() => handleSaveEditRecovery(credit.id)} className="bg-orange-500 text-white text-[9px] px-2 py-1 rounded font-black uppercase">Save</button><button onClick={() => setEditingRecoveryId(null)} className="bg-gray-400 text-white text-[9px] px-2 py-1 rounded font-black uppercase">Cancel</button></div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black text-orange-400">{a.date}</span>
                                    <div className="flex items-center gap-3"><span className="text-[9px] font-bold text-gray-400 italic">Agent: {a.username}</span>
                                      {isAdminOrDirector && (
                                        <div className="flex gap-2"><button onClick={() => handleStartEditRecovery(a)} className="text-blue-500 font-black text-[9px] hover:bg-blue-100 px-1 rounded">Modif</button><button onClick={() => onDeleteRecoveryAction?.(credit.id, a.id)} className="text-red-500 font-black text-[9px] hover:bg-red-100 px-1 rounded">Suppr</button></div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-gray-700 font-medium leading-relaxed">{a.comment}</p>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex justify-between items-center">
                <div className="flex gap-2">
                  {!isRestricted && (
                    <>
                      <button onClick={() => onPrintDossier?.(credit)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm">Imprimer Dossier</button>
                      <button onClick={() => onExportDossier?.(credit)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm">Exporter Dossier</button>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  {!isRestricted && <button onClick={() => onEditCredit?.(credit)} className="text-gray-400 hover:text-blue-600 font-bold text-[10px] uppercase transition-colors">Modifier</button>}
                  {userRole === 'Administrateur' && <button onClick={() => onDeleteCredit(credit.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase transition-colors">Supprimer</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreditList;
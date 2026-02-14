import React, { useState, useEffect } from 'react';
import { Credit } from '../types';

interface CreditFormProps {
  onAddCredit: (credit: Credit) => void;
  creditToEdit?: Credit | null;
  onUpdateCredit?: (credit: Credit) => void;
  readOnly?: boolean;
  microfinanceCode?: string | null;
  creditTypes?: string[];
  onAddCreditType?: (typeName: string) => void;
}

const ZONES_LIST = ['01','01A','02','02A','03','03A','04','04A','05','05A','06','06A','07','07A','08','08A','09','09A','Personnel','VIP','Autres'];

const numberToFrench = (n: number): string => {
  if (n === 0) return "ZÉRO";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  const convert = (num: number): string => {
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 70) {
      const u = num % 10;
      const t = Math.floor(num / 10);
      if (u === 0) return tens[t];
      if (u === 1) return tens[t] + " et un";
      return tens[t] + "-" + units[u];
    }
    if (num < 80) {
      const u = num % 10;
      if (u === 0) return "soixante-dix";
      if (u === 1) return "soixante-et-onze";
      return "soixante-" + teens[u];
    }
    if (num < 100) {
      const u = num % 10;
      if (num === 80) return "quatre-vingts";
      if (num < 90) return "quatre-vingt-" + units[u];
      if (u === 0) return "quatre-vingt-dix";
      return "quatre-vingt-" + teens[u];
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      let s = h === 1 ? "cent" : units[h] + " cent";
      if (h > 1 && r === 0) s += "s";
      return s + (r > 0 ? " " + convert(r) : "");
    }
    if (num < 1000000) {
      const m = Math.floor(num / 1000);
      const r = num % 1000;
      const s = m === 1 ? "mille" : convert(m) + " mille";
      return s + (r > 0 ? " " + convert(r) : "");
    }
    if (num < 1000000000) {
      const mi = Math.floor(num / 1000000);
      const r = num % 1000000;
      const s = convert(mi) + " million" + (mi > 1 ? "s" : "");
      return s + (r > 0 ? " " + convert(r) : "");
    }
    return num.toString();
  };

  return convert(n).toUpperCase();
};

const CreditForm: React.FC<CreditFormProps> = ({ onAddCredit, creditToEdit, onUpdateCredit, readOnly, microfinanceCode, creditTypes = ['ORDINAIRE FIDELIA', 'MOKPOKPO PRE-PAYER'], onAddCreditType }) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  
  const [formData, setFormData] = useState({
    dossierNo: '',
    date: '',
    zone: '',
    agentCommercial: '',
    clientCivilite: 'Monsieur',
    clientName: '',
    surNom: '',
    adresseDomicile: '',
    adresseService: '',
    profession: '',
    tel: '',
    clientRevenuMensuel: '',
    personneReferenceNom: '',
    personneReferenceTel: '',
    noCompte: '',
    noCompteTontine: '',
    mise: '',
    montantCautionChiffre: '',
    montantCautionLettre: '',
    creditAccordeChiffre: '',
    creditAccordeLettre: '',
    dureeMois: '',
    fraisEtudeDossier: '',
    utilisationCredit: '',
    dateDeblocage: '',
    dateDernierRemboursement: '',
    aRembourserLe: '',
    nbreCreditAnterieur: '',
    appreciation: '',
    avisPromoteur: '',
    dossierInstruitPar: '',
    totalDu: '',
    caTotal: '',
    intTotal: '',
    caMensuel: '',
    iMensuel: '',
    observation: '',
    cautionCivilite: 'Monsieur',
    cautionNom: '',
    cautionPrenoms: '',
    cautionSurnom: '',
    cautionProfession: '',
    cautionAdresse: '',
    cautionAdresseDomicile: '',
    cautionTel: '',
    cautionNbrePersonnesCharge: '',
    cautionRevenuMensuel: '',
    cautionNationalite: '',
    cautionNumCarteIdentite: '',
    cautionBanqueNom: '',
    cautionBanqueAdresse: '',
    cautionPersonneReference: '',
    cautionReferenceAdresse: '',
    cautionReferenceTel: '',
    cautionReferenceLien: '',
    cautionSolidariteNom: '',
    cautionSolidariteLien: '',
    cautionPretInteretsLettre: '',
    cautionPretInteretsChiffre: '',
    cautionFaitLieuDate: '',
    creditType: 'ORDINAIRE FIDELIA'
  });

  useEffect(() => {
    if (creditToEdit) {
      setFormData({
        dossierNo: creditToEdit.dossierNo || '',
        date: creditToEdit.date || '',
        zone: creditToEdit.zone || '',
        agentCommercial: creditToEdit.agentCommercial || '',
        clientCivilite: creditToEdit.clientCivilite || 'Monsieur',
        clientName: creditToEdit.clientName || '',
        surNom: creditToEdit.surNom || '',
        adresseDomicile: creditToEdit.adresseDomicile || '',
        adresseService: creditToEdit.adresseService || '',
        profession: creditToEdit.profession || '',
        tel: creditToEdit.tel || '',
        clientRevenuMensuel: creditToEdit.clientRevenuMensuel?.toString() || '',
        personneReferenceNom: creditToEdit.personneReferenceNom || '',
        personneReferenceTel: creditToEdit.personneReferenceTel || '',
        noCompte: creditToEdit.noCompte || '',
        noCompteTontine: creditToEdit.noCompteTontine || '',
        mise: creditToEdit.mise || '',
        montantCautionChiffre: creditToEdit.montantCautionChiffre?.toString() || '',
        montantCautionLettre: creditToEdit.montantCautionLettre || '',
        creditAccordeChiffre: creditToEdit.creditAccordeChiffre?.toString() || '',
        creditAccordeLettre: creditToEdit.creditAccordeLettre || '',
        dureeMois: creditToEdit.dureeMois?.toString() || '',
        fraisEtudeDossier: creditToEdit.fraisEtudeDossier?.toString() || '',
        utilisationCredit: creditToEdit.utilisationCredit || '',
        dateDeblocage: creditToEdit.dateDeblocage || '',
        dateDernierRemboursement: creditToEdit.dateDernierRemboursement || '',
        aRembourserLe: creditToEdit.aRembourserLe || '',
        nbreCreditAnterieur: creditToEdit.nbreCreditAnterieur?.toString() || '',
        appreciation: creditToEdit.appreciation || '',
        avisPromoteur: creditToEdit.avisPromoteur || '',
        dossierInstruitPar: creditToEdit.dossierInstruitPar || '',
        totalDu: creditToEdit.totalDu?.toString() || '',
        caTotal: creditToEdit.caTotal?.toString() || '',
        intTotal: creditToEdit.intTotal?.toString() || '',
        caMensuel: creditToEdit.caMensuel?.toString() || '',
        iMensuel: creditToEdit.iMensuel?.toString() || '',
        observation: creditToEdit.observation || '',
        cautionCivilite: creditToEdit.cautionCivilite || 'Monsieur',
        cautionNom: creditToEdit.cautionNom || '',
        cautionPrenoms: creditToEdit.cautionPrenoms || '',
        cautionSurnom: creditToEdit.cautionSurnom || '',
        cautionProfession: creditToEdit.cautionProfession || '',
        cautionAdresse: creditToEdit.cautionAdresse || '',
        cautionAdresseDomicile: creditToEdit.cautionAdresseDomicile || '',
        cautionTel: creditToEdit.cautionTel || '',
        cautionNbrePersonnesCharge: creditToEdit.cautionNbrePersonnesCharge?.toString() || '',
        cautionRevenuMensuel: creditToEdit.cautionRevenuMensuel?.toString() || '',
        cautionNationalite: creditToEdit.cautionNationalite || '',
        cautionNumCarteIdentite: creditToEdit.cautionNumCarteIdentite || '',
        cautionBanqueNom: creditToEdit.cautionBanqueNom || '',
        cautionBanqueAdresse: creditToEdit.cautionBanqueAdresse || '',
        cautionPersonneReference: creditToEdit.cautionPersonneReference || '',
        cautionReferenceAdresse: creditToEdit.cautionReferenceAdresse || '',
        cautionReferenceTel: creditToEdit.cautionReferenceTel || '',
        cautionReferenceLien: creditToEdit.cautionReferenceLien || '',
        cautionSolidariteNom: creditToEdit.cautionSolidariteNom || '',
        cautionSolidariteLien: creditToEdit.cautionSolidariteLien || '',
        cautionPretInteretsLettre: creditToEdit.cautionPretInteretsLettre || '',
        cautionPretInteretsChiffre: creditToEdit.cautionPretInteretsChiffre?.toString() || '',
        cautionFaitLieuDate: creditToEdit.cautionFaitLieuDate || '',
        creditType: creditToEdit.creditType || 'ORDINAIRE FIDELIA'
      });
    }
  }, [creditToEdit]);

  useEffect(() => {
    if (!readOnly && formData.dateDeblocage && formData.dureeMois) {
      const deblocageDate = new Date(formData.dateDeblocage);
      const months = parseInt(formData.dureeMois);
      if (!isNaN(deblocageDate.getTime()) && !isNaN(months)) {
        const endDate = new Date(deblocageDate);
        endDate.setMonth(endDate.getMonth() + months);
        const dateString = endDate.toISOString().split('T')[0];
        
        if (formData.creditType === 'ORDINAIRE FIDELIA') {
          if (formData.dateDernierRemboursement !== dateString) {
            setFormData(prev => ({ ...prev, dateDernierRemboursement: dateString }));
          }
        } else {
          if (formData.aRembourserLe !== dateString) {
            setFormData(prev => ({ ...prev, aRembourserLe: dateString }));
          }
        }
      }
    }
  }, [formData.dateDeblocage, formData.dureeMois, formData.creditType, readOnly]);

  useEffect(() => {
    if (!readOnly && formData.creditType === 'ORDINAIRE FIDELIA') {
      const ca = parseFloat(formData.caTotal) || 0;
      const it = parseFloat(formData.intTotal) || 0;
      const sum = ca + it;
      if (formData.totalDu !== sum.toString()) {
        setFormData(prev => ({ ...prev, totalDu: sum.toString() }));
      }
    }
  }, [formData.caTotal, formData.intTotal, formData.creditType, readOnly]);

  useEffect(() => {
    if (!readOnly) {
      const convertField = (val: string, targetName: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num >= 0) {
          const words = numberToFrench(num);
          if ((formData as any)[targetName] !== words) {
            setFormData(prev => ({ ...prev, [targetName]: words }));
          }
        } else if (val === '' && (formData as any)[targetName] !== '') {
          setFormData(prev => ({ ...prev, [targetName]: '' }));
        }
      };

      convertField(formData.montantCautionChiffre, 'montantCautionLettre');
      convertField(formData.creditAccordeChiffre, 'creditAccordeLettre');
      convertField(formData.cautionPretInteretsChiffre, 'cautionPretInteretsLettre');
    }
  }, [formData.montantCautionChiffre, formData.creditAccordeChiffre, formData.cautionPretInteretsChiffre, readOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!formData.clientName || !formData.creditAccordeChiffre || !formData.zone) {
      setErrorMessage("Enregistrement bloqué : Le 'Nom et Prénom', le 'Crédit (Chiffre)' et la 'Zone' sont obligatoires.");
      return;
    }

    setErrorMessage('');
    const creditData: Credit = {
      ...(creditToEdit || {}),
      id: creditToEdit ? creditToEdit.id : crypto.randomUUID(),
      microfinance_code: creditToEdit ? creditToEdit.microfinance_code : (microfinanceCode || ''),
      ...formData,
      montantCautionChiffre: Number(formData.montantCautionChiffre),
      creditAccordeChiffre: Number(formData.creditAccordeChiffre),
      dureeMois: Number(formData.dureeMois),
      fraisEtudeDossier: Number(formData.fraisEtudeDossier),
      nbreCreditAnterieur: Number(formData.nbreCreditAnterieur),
      totalDu: Number(formData.totalDu),
      caTotal: Number(formData.caTotal),
      intTotal: Number(formData.intTotal),
      caMensuel: Number(formData.caMensuel),
      iMensuel: Number(formData.iMensuel),
      clientRevenuMensuel: Number(formData.clientRevenuMensuel),
      cautionNbrePersonnesCharge: Number(formData.cautionNbrePersonnesCharge),
      cautionRevenuMensuel: Number(formData.cautionRevenuMensuel),
      cautionPretInteretsChiffre: Number(formData.cautionPretInteretsChiffre),
      amount: Number(formData.creditAccordeChiffre),
      interestAmount: Number(formData.intTotal) || 0,
      releaseDate: formData.dateDeblocage,
      repayments: creditToEdit ? creditToEdit.repayments : [],
      recoveryActions: creditToEdit ? (creditToEdit.recoveryActions || []) : []
    } as any;

    if (creditToEdit && onUpdateCredit) {
      onUpdateCredit(creditData);
    } else {
      onAddCredit(creditData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (readOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTypeInternal = () => {
    if (newTypeName.trim() && onAddCreditType) {
      const trimmed = newTypeName.trim().toUpperCase();
      onAddCreditType(trimmed);
      setFormData(prev => ({ ...prev, creditType: trimmed }));
      setNewTypeName('');
      setIsAddingType(false);
    }
  };

  const renderField = (label: string, name: string, type: string = "text") => (
    <div className="flex flex-col space-y-1">
      <label className="text-xs font-black text-gray-700 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        name={name}
        value={(formData as any)[name]}
        onChange={handleChange}
        readOnly={readOnly}
        className={`border-2 border-gray-200 rounded-xl p-3 text-sm outline-none transition-all ${readOnly ? 'bg-gray-100' : 'bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold shadow-sm'}`}
      />
    </div>
  );

  const getTypeIcon = (type: string) => {
    if (type === 'ORDINAIRE FIDELIA') return '📈';
    if (type === 'MOKPOKPO PRE-PAYER') return '⚡';
    return '📁';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
        <label className="block text-xs font-black text-slate-500 mb-6 uppercase tracking-widest text-center">Sélectionner le Type de Crédit</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => !readOnly && setFormData(prev => ({ ...prev, creditType: type }))}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-3 ${
                formData.creditType === type
                  ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10 shadow-lg' 
                  : 'border-white bg-white hover:border-slate-200 shadow-sm'
              } ${readOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer active:scale-95'}`}
            >
              <span className="text-3xl">{getTypeIcon(type)}</span>
              <span className={`text-sm font-black uppercase tracking-widest ${formData.creditType === type ? 'text-emerald-700' : 'text-slate-600'}`}>{type}</span>
            </button>
          ))}
          
          {!readOnly && onAddCreditType && !isAddingType && (
            <button
              type="button"
              onClick={() => setIsAddingType(true)}
              className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-emerald-500 transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer group"
            >
              <span className="text-3xl text-slate-400 group-hover:text-emerald-500">⊕</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 text-center">Ajouter un nouveau type</span>
            </button>
          )}

          {isAddingType && (
            <div className="p-5 rounded-2xl border-2 border-emerald-500 bg-white shadow-lg flex flex-col space-y-3">
              <input 
                autoFocus
                type="text" 
                placeholder="NOM DU TYPE..." 
                className="w-full text-xs font-black uppercase border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 shadow-inner"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTypeInternal()}
              />
              <div className="flex gap-2">
                <button type="button" onClick={handleAddTypeInternal} className="flex-1 bg-emerald-600 text-white text-[10px] font-black py-2 rounded-lg uppercase">OK</button>
                <button type="button" onClick={() => setIsAddingType(false)} className="flex-1 bg-slate-200 text-slate-600 text-[10px] font-black py-2 rounded-lg uppercase">Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-black text-slate-800 mb-6 border-b-4 border-emerald-500/20 pb-4 flex items-center">
          <span className="bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-xs">01</span>
          DOSSIER DE CREDIT : <span className="text-emerald-600 ml-2">{formData.creditType}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Civilité</label>
            <select
              name="clientCivilite"
              value={formData.clientCivilite}
              onChange={handleChange}
              disabled={readOnly}
              className={`border-2 border-gray-200 rounded-xl p-3 text-sm outline-none transition-all ${readOnly ? 'bg-gray-100' : 'bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold shadow-sm'}`}
            >
              <option value="Monsieur">Monsieur</option>
              <option value="Madame">Madame</option>
            </select>
          </div>
          {renderField("Dossier N°", "dossierNo")}
          {renderField("Date", "date", "date")}
          
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Zone</label>
            <select
              name="zone"
              value={formData.zone}
              onChange={handleChange}
              disabled={readOnly}
              className={`border-2 border-gray-200 rounded-xl p-3 text-sm outline-none transition-all ${readOnly ? 'bg-gray-100' : 'bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold shadow-sm'}`}
            >
              <option value="">Sélectionner...</option>
              {ZONES_LIST.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            {renderField("Agent Commercial", "agentCommercial")}
          </div>
          
          <div className="md:col-span-2">
            {renderField("Nom et Prénom", "clientName")}
          </div>
          {formData.creditType !== 'ORDINAIRE FIDELIA' && (
            renderField("Sur Nom", "surNom")
          )}

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderField("Adresse Domicile", "adresseDomicile")}
            {renderField("Adresse Service", "adresseService")}
          </div>

          {renderField("Profession", "profession")}
          {renderField("Tel", "tel")}
          {renderField("Revenu Mensuel", "clientRevenuMensuel", "number")}

          {formData.creditType !== 'ORDINAIRE FIDELIA' && (
            <>
              <div className="md:col-span-2">
                {renderField("Personne de référence (Nom et Prénom)", "personneReferenceNom")}
              </div>
              {renderField("Tel Réf.", "personneReferenceTel")}
            </>
          )}

          {renderField("N° de Compte", "noCompte")}
          {renderField("N° Compte Tontine", "noCompteTontine")}
          {renderField("Mise", "mise")}
          
          {renderField("Caution (Chiffre)", "montantCautionChiffre", "number")}
          <div className="md:col-span-2">
            {renderField("Caution (Lettre)", "montantCautionLettre")}
          </div>

          {renderField("Crédit (Chiffre)", "creditAccordeChiffre", "number")}
          <div className="md:col-span-2">
            {renderField("Crédit (Lettre)", "creditAccordeLettre")}
          </div>

          {renderField("Durée (Mois)", "dureeMois", "number")}
          {renderField("Frais d'étude", "fraisEtudeDossier", "number")}
          {renderField("Utilisation", "utilisationCredit")}

          {renderField("Déblocage", "dateDeblocage", "date")}
          {formData.creditType === 'ORDINAIRE FIDELIA' ? (
            renderField("Dernier Remb.", "dateDernierRemboursement", "date")
          ) : (
            renderField("A rembourser le", "aRembourserLe", "date")
          )}

          {renderField("Crédit Antérieur", "nbreCreditAnterieur", "number")}
          
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderField("Appréciation", "appreciation")}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Avis Promoteur</label>
              <select
                name="avisPromoteur"
                value={formData.avisPromoteur}
                onChange={handleChange}
                disabled={readOnly}
                className={`border-2 border-gray-200 rounded-xl p-3 text-sm outline-none transition-all ${readOnly ? 'bg-gray-100' : 'bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold shadow-sm'}`}
              >
                <option value="">Sélectionner...</option>
                <option value="Validé">Validé</option>
                <option value="Rejet">Rejet</option>
                <option value="Neutre">Neutre</option>
                <option value="Autres">Autres</option>
              </select>
            </div>
            {renderField("Instruit par", "dossierInstruitPar")}
          </div>

          {formData.creditType === 'ORDINAIRE FIDELIA' ? (
            <>
              {renderField("CA Total", "caTotal", "number")}
              {renderField("Int Total", "intTotal", "number")}
              {renderField("Total Dû", "totalDu", "number")}
              {renderField("CA/Mensuel", "caMensuel", "number")}
              {renderField("I/Mensuel", "iMensuel", "number")}
            </>
          ) : (
            <div className="md:col-span-3">
              {renderField("Observation", "observation")}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-black text-slate-800 mb-6 border-b-4 border-emerald-500/20 pb-4 flex items-center">
          <span className="bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-xs">02</span>
          ATTESTATION DE CAUTION
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-black text-gray-700 uppercase tracking-widest">Civilité</label>
            <select name="cautionCivilite" value={formData.cautionCivilite} onChange={handleChange} disabled={readOnly} className={`border-2 border-gray-200 rounded-xl p-3 text-sm outline-none transition-all ${readOnly ? 'bg-gray-100' : 'bg-white font-bold shadow-sm'}`}>
              <option value="Monsieur">Monsieur</option>
              <option value="Madame">Madame</option>
            </select>
          </div>
          {renderField("Nom", "cautionNom")}
          {renderField("Prénom(s)", "cautionPrenoms")}
          {renderField("Sur nom", "cautionSurnom")}
          {renderField("Profession", "cautionProfession")}
          {renderField("Adresse", "cautionAdresse")}
          {renderField("Adresse Domicile", "cautionAdresseDomicile")}
          {renderField("Tél", "cautionTel")}
          {renderField("Pers. à charge", "cautionNbrePersonnesCharge", "number")}
          {renderField("Revenu Mensuel", "cautionRevenuMensuel", "number")}
          {renderField("Nationalité", "cautionNationalite")}
          {renderField("N° Carte Identité", "cautionNumCarteIdentite")}
          <div className="md:col-span-2">{renderField("Banque / SFD Nom", "cautionBanqueNom")}</div>
          {renderField("Adresse Banque", "cautionBanqueAdresse")}
          {renderField("Pers. de Référence", "cautionPersonneReference")}
          {renderField("Adresse Réf.", "cautionReferenceAdresse")}
          {renderField("Tél Réf.", "cautionReferenceTel")}
          {renderField("Lien Réf.", "cautionReferenceLien")}
          <div className="md:col-span-2">{renderField("Caution de (Nom client)", "cautionSolidariteNom")}</div>
          {renderField("Lien Client", "cautionSolidariteLien")}
          <div className="md:col-span-2">{renderField("Prêt & Intérêts (Lettre)", "cautionPretInteretsLettre")}</div>
          {renderField("Prêt & Intérêts (Chiffre)", "cautionPretInteretsChiffre", "number")}
          <div className="md:col-span-3">{renderField("Fait à ..., le ...", "cautionFaitLieuDate")}</div>
        </div>
      </div>

      <div className="flex flex-col items-end pt-10 border-t-4 border-slate-50">
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 text-red-600 text-sm font-bold rounded-2xl w-full text-center shadow-sm">
            ⚠️ {errorMessage}
          </div>
        )}
        {!readOnly && (
          <button
            type="submit"
            className="bg-[#10b981] hover:bg-emerald-600 text-white font-black py-4 px-12 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-sm active:scale-95"
          >
            {creditToEdit ? "Mettre à jour le Dossier" : "Enregistrer le Dossier Complet"}
          </button>
        )}
      </div>
    </form>
  );
};

export default CreditForm;
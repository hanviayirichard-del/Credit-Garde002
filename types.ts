export interface Repayment {
  id: string;
  date: string;
  capital: number;
  interests: number;
  penalty: number;
  microfinance_code: string;
  username: string;
}

export interface RecoveryAction {
  id: string;
  date: string;
  comment: string;
  microfinance_code: string;
  username: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'Administrateur' | 'Directeur' | 'Opérateur' | 'Agents commerciaux' | 'Autres';
  zone?: string;
  isActive: boolean;
  microfinance_code: string;
}

export interface Log {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  details?: string;
  microfinance_code: string;
}

export interface Installment {
  number: number;
  dueDate: string;
  amount: number;
  status: 'payé' | 'en retard' | 'non payé';
}

export interface Credit {
  id: string;
  microfinance_code: string;
  // Dossier de Crédit (Image 1 & 3)
  dossierNo: string;
  date: string;
  zone: string;
  agentCommercial: string; // Nouveau champ
  clientCivilite: string;
  clientName: string; // Nom et Prénom
  surNom?: string; // Spécifique MOKPOKPO
  adresseDomicile: string;
  adresseService: string;
  profession: string;
  tel: string;
  clientRevenuMensuel?: number; // Nouveau champ
  personneReferenceNom?: string; // Spécifique MOKPOKPO
  personneReferenceTel?: string; // Spécifique MOKPOKPO
  noCompte: string;
  noCompteTontine: string;
  mise: string;
  montantCautionChiffre: number;
  montantCautionLettre: string;
  creditAccordeChiffre: number;
  creditAccordeLettre: string;
  dureeMois: number;
  fraisEtudeDossier: number;
  utilisationCredit: string;
  dateDeblocage: string;
  dateDernierRemboursement?: string; // Spécifique ORDINAIRE
  aRembourserLe?: string; // Spécifique MOKPOKPO
  nbreCreditAnterieur: number;
  appreciation: string;
  avisPromoteur: string;
  dossierInstruitPar: string;
  totalDu?: number; // Spécifique ORDINAIRE
  caTotal?: number; // Spécifique ORDINAIRE
  intTotal?: number; // Spécifique ORDINAIRE
  caMensuel?: number; // Spécifique ORDINAIRE
  iMensuel?: number; // Spécifique ORDINAIRE
  observation?: string; // Spécifique MOKPOKPO
  // Attestation de Caution (Image 2)
  cautionCivilite: string;
  cautionNom: string;
  cautionPrenoms: string;
  cautionSurnom: string;
  cautionProfession: string;
  cautionAdresse: string;
  cautionAdresseDomicile: string;
  cautionTel: string;
  cautionNbrePersonnesCharge: number;
  cautionRevenuMensuel: number;
  cautionNationalite: string;
  cautionNumCarteIdentite: string;
  cautionBanqueNom: string;
  cautionBanqueAdresse: string;
  cautionPersonneReference: string;
  cautionReferenceAdresse: string;
  cautionReferenceTel: string;
  cautionReferenceLien: string;
  cautionSolidariteNom: string;
  cautionSolidariteLien: string;
  cautionPretInteretsLettre: string;
  cautionPretInteretsChiffre: number;
  cautionFaitLieuDate: string;
  // Type de crédit
  creditType: string;
  // Remboursements
  repayments: Repayment[];
  // Échéancier mensuel
  installments?: Installment[];
  // Actions de recouvrement
  recoveryActions?: RecoveryAction[];
  // Aliases pour compatibilité list
  amount?: number;
  interestAmount?: number;
  releaseDate?: string;
}
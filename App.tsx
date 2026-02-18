import React, { useState, useEffect } from 'react';
import { Credit, Repayment, User, RecoveryAction, Log, Installment } from './types';
import CreditForm from './components/CreditForm';
import CreditList from './components/CreditList';
import { supabase } from './supabase';

const ZONES_LIST = ['01','01A','02','02A','03','03A','04','04A','05','05A','06','06A','07','07A','08','08A','09','09A','Personnel','VIP','Autres'];

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

const RECOVERY_TIPS: Record<string, string[]> = {
  'Administrateur': [
    "Analysez quotidiennement le PAR 1 pour détecter les signaux faibles de degradation du portefeuille.",
    "Vérifiez l'exhaustivité des saisies de rapports de recouvrement par les agents de terrain.",
    "Ajustez les plafonds de délégation selon les performances de recouvrement des zones.",
    "Auditez les dossiers en retard de plus de 90 jours pour décider des passages en contentieux.",
    "Comparez les taux de recouvrement par type de produit pour affiner la stratégie d'octroi."
  ],
  'Directeur': [
    "Organisez des réunions de crise hebdomasaires pour les dossiers dépassant 5 millions de FCFA de retard.",
    "Supervisez personnellement les protocoles d'accord avec les clients stratégiques en difficulté.",
    "Assurez-vous que les moyens logistiques (motos, carburant) sont prioritaires pour les agents performants.",
    "Validez les procédures de saisie de garanties pour les cas de mauvaise foi avérée.",
    "Renforcez la motivation de l'équipe par des primes basées sur la réduction du PAR 30."
  ],
  'Opérateur': [
    "La précision de la saisie des dates de remboursement est cruciale pour le calcul du PAR.",
    "Vérifiez systématiquement les numéros de téléphone des clients lors de chaque passage en agence.",
    "Saisissez les promesses de règlement dans les commentaires pour un suivi efficace.",
    "Alertez immédiatement si un client tente un remboursement partiel sur un crédit déjà très en retard.",
    "Assurez la traçabilité parfaite entre les bordereaux de collecte et les écritures système."
  ],
  'Agents commerciaux': [
    "Une visite préventive 48h avant l'échéance réduit le risque d'impayé de manière significative.",
    "Privilégiez le contact physique au téléphone pour les clients en premier retard.",
    "Rappelez au client qu'un bon remboursement lui ouvre l'accès à des montants plus élevés.",
    "Identifiez la cause réelle du retard (santé, mévente, imprévu) avant de proposer une solution.",
    "Ne quittez jamais un client en retard sans avoir fixé une date et une heure précises pour le prochain rendez-vous."
  ],
  'Autres': [
    "La courtoisie dans l'accueil favorise la fidélité et le respect des engagements par le client.",
    "Signalez toute information négative circulant sur le marché concernant un client actif.",
    "Rappelez discrètement aux clients que le crédit est un engagement qui doit être honoré.",
    "Soyez attentifs aux changements d'activités ou de domiciles des clients connus.",
    "Collaborez avec l'équipe de recouvrement en facilitant l'accès aux dossiers clients."
  ]
};

const App: React.FC = () => {
  const [microfinances, setMicrofinances] = useState<{ code: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('cg_global_microfinances');
      return saved ? JSON.parse(saved) : [{ code: '001FABES', name: 'COOPEC FABES' }];
    } catch(e) { return [{ code: '001FABES', name: 'COOPEC FABES' }]; }
  });

  const [microfinance_code_actif, setMicrofinanceCodeActif] = useState<string | null>(() => localStorage.getItem('microfinance_code_actif'));
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [isSyncError, setIsSyncError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const activeMF = microfinances.find(mf => mf.code === microfinance_code_actif);

  const [credits, setCredits] = useState<Credit[]>(() => {
    const code = localStorage.getItem('microfinance_code_actif');
    if (!code) return [];
    try {
      const saved = localStorage.getItem(`cg_${code}_credits`);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });
  const [users, setUsers] = useState<User[]>(() => {
    const code = localStorage.getItem('microfinance_code_actif');
    if (!code) return [];
    try {
      const saved = localStorage.getItem(`cg_${code}_users`);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });
  const [logs, setLogs] = useState<Log[]>(() => {
    const code = localStorage.getItem('microfinance_code_actif');
    if (!code) return [];
    try {
      const saved = localStorage.getItem(`cg_${code}_logs`);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });
  const [microfinance, setMicrofinance] = useState(() => {
    const code = localStorage.getItem('microfinance_code_actif');
    if (!code) return { name: '', address: '', phone: '', email: '', logo: '' };
    try {
      const saved = localStorage.getItem(`cg_${code}_microfinance`);
      return saved ? JSON.parse(saved) : { name: '', address: '', phone: '', email: '', logo: '' };
    } catch(e) { return { name: '', address: '', phone: '', email: '', logo: '' }; }
  });
  const [autoDeactivation, setAutoDeactivation] = useState(() => {
    const code = localStorage.getItem('microfinance_code_actif');
    if (!code) return { days: [], startTime: '00:00', endTime: '23:59', enabled: false };
    try {
      const saved = localStorage.getItem(`cg_${code}_auto_deactivation`);
      return saved ? JSON.parse(saved) : { days: [], startTime: '00:00', endTime: '23:59', enabled: false };
    } catch(e) { return { days: [], startTime: '00:00', endTime: '23:59', enabled: false }; }
  });

  const [creditTypes, setCreditTypes] = useState<string[]>(() => {
    const code = localStorage.getItem('microfinance_code_actif');
    if (!code) return ['ORDINAIRE FIDELIA', 'MOKPOKPO PRE-PAYER'];
    try {
      const saved = localStorage.getItem(`cg_${code}_credit_types`);
      return saved ? JSON.parse(saved) : ['ORDINAIRE FIDELIA', 'MOKPOKPO PRE-PAYER'];
    } catch(e) { return ['ORDINAIRE FIDELIA', 'MOKPOKPO PRE-PAYER']; }
  });
  
  const [activeTab, setActiveTab] = useState<'tips' | 'dashboard' | 'new' | 'active' | 'arrears' | 'settled' | 'users' | 'logs' | 'invitation' | 'training' | 'developer' | 'activation' | 'migration' | 'forecast'>('tips');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'Administrateur' | 'Directeur' | 'Opérateur' | 'Agents commerciaux' | 'Autres' | null>(null);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtres Tableau de bord
  const [dashFilterType, setDashFilterType] = useState<string>('Tous');
  const [dashFilterZone, setDashFilterZone] = useState<string>('Toutes');

  // Filtres Crédits Actifs
  const [activeFilterType, setActiveFilterType] = useState<string>('Tous');
  const [activeFilterZone, setActiveFilterZone] = useState<string>('Toutes');
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('Tous');

  // Filtres Crédits en Retard
  const [arrearsFilterType, setArrearsFilterType] = useState<string>('Tous');
  const [arrearsFilterZone, setArrearsFilterZone] = useState<string>('Toutes');

  // Filtres Crédits Soldés
  const [settledFilterType, setSettledFilterType] = useState<string>('Tous');
  const [settledFilterZone, setSettledFilterZone] = useState<string>('Toutes');

  // Filtres Prévisions
  const [forecastStart, setForecastStart] = useState(new Date().toISOString().split('T')[0]);
  const [forecastEnd, setForecastEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Formulaire de connexion
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Formulaire local pour les utilisateurs
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Administrateur' | 'Directeur' | 'Opérateur' | 'Agents commerciaux' | 'Autres'>('Autres');
  const [newZone, setNewZone] = useState('01');
  const [newUserMicrofinanceCode, setNewUserMicrofinanceCode] = useState(microfinance_code_actif || '');

  // Formulaire local pour les microfinances
  const [newMFName, setNewMFName] = useState('');
  const [newMFCode, setNewMFCode] = useState('');

  // Formulaire local pour les types de crédits
  const [newCreditTypeName, setNewCreditTypeName] = useState('');

  // SÉCURITÉ : Empêcher la fermeture de l'onglet si une synchronisation est en cours
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSyncing) {
        e.preventDefault();
        e.returnValue = "Une sauvegarde est en cours vers le serveur. Voulez-vous vraiment quitter ? Vos données non synchronisées risquent d'être perdues.";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSyncing]);

  // CHARGEMENT INITIAL DE LA LISTE DES INSTITUTIONS DEPUIS SUPABASE
  useEffect(() => {
    const loadAllInstitutions = async () => {
      try {
        const { data, error } = await supabase
          .from('microfinances')
          .select('code, microfinance');
        
        if (data && !error) {
          const fetchedMFs = data.map(item => ({
            code: item.code,
            name: (item.microfinance as any)?.name || item.code
          }));
          
          setMicrofinances(prev => {
            const combined = [...prev];
            fetchedMFs.forEach(fmf => {
              if (!combined.some(c => c.code === fmf.code)) {
                combined.push(fmf);
              }
            });
            return combined;
          });
        }
      } catch (e) {
        console.error("Erreur chargement global institutions:", e);
      }
    };
    loadAllInstitutions();
  }, []);

  // CHARGEMENT INITIAL DEPUIS SUPABASE AVEC REINITIALISATION
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!microfinance_code_actif) {
        setCredits([]);
        setUsers([]);
        setLogs([]);
        setMicrofinance({ name: '', address: '', phone: '', email: '', logo: '' });
        setAutoDeactivation({ days: [], startTime: '00:00', endTime: '23:59', enabled: false });
        setCreditTypes(['ORDINAIRE FIDELIA', 'MOKPOKPO PRE-PAYER']);
        setIsInitialLoadDone(false);
        setIsSyncError(false);
        return;
      }
      
      setIsInitialLoadDone(false);
      setIsSyncError(false);

      try {
        const { data, error } = await supabase
          .from('microfinances')
          .select('*')
          .eq('code', microfinance_code_actif)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          if (data.credits) setCredits(data.credits);
          if (data.users) setUsers(data.users);
          if (data.logs) setLogs(data.logs);
          if (data.microfinance) setMicrofinance(data.microfinance);
          if (data.auto_deactivation) setAutoDeactivation(data.auto_deactivation);
          if (data.credit_types) setCreditTypes(data.credit_types);
          setIsSyncError(false);
          setIsInitialLoadDone(true);
        } else {
          // Nouveau code ou institution vide
          setIsSyncError(false);
          setIsInitialLoadDone(true);
        }
      } catch (e) {
        console.error("Erreur de chargement Supabase:", e);
        setIsSyncError(true);
      }
    };
    loadFromSupabase();
  }, [microfinance_code_actif]);

  const syncWithSupabase = async (overrideData?: any) => {
    if (!microfinance_code_actif || (!isInitialLoadDone && !overrideData) || (isSyncError && !overrideData)) return;
    
    setIsSyncing(true);
    try {
      const payload = overrideData || {
        code: microfinance_code_actif,
        credits,
        users,
        logs,
        microfinance,
        auto_deactivation: autoDeactivation,
        credit_types: creditTypes
      };
      const { error } = await supabase.from('microfinances').upsert(payload);
      if (error) throw error;
      setIsSyncError(false);
    } catch (e) {
      console.error("Erreur de synchronisation Supabase:", e);
      setIsSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('cg_global_microfinances', JSON.stringify(microfinances));
  }, [microfinances]);

  // POINT DE SYNCHRONISATION UNIQUE POUR TOUT L'ÉTAT AVEC SÉCURITÉ DE DEBOUNCE
  useEffect(() => {
    if (microfinance_code_actif) {
      // Mise à jour locale immédiate (sécurité n°1)
      localStorage.setItem(`cg_${microfinance_code_actif}_credits`, JSON.stringify(credits));
      localStorage.setItem(`cg_${microfinance_code_actif}_users`, JSON.stringify(users));
      localStorage.setItem(`cg_${microfinance_code_actif}_logs`, JSON.stringify(logs));
      localStorage.setItem(`cg_${microfinance_code_actif}_microfinance`, JSON.stringify(microfinance));
      localStorage.setItem(`cg_${microfinance_code_actif}_auto_deactivation`, JSON.stringify(autoDeactivation));
      localStorage.setItem(`cg_${microfinance_code_actif}_credit_types`, JSON.stringify(creditTypes));
      
      // SÉCURITÉ : Synchronisation Cloud avec Debounce pour éviter les race conditions
      if (isInitialLoadDone) {
        const timer = setTimeout(() => {
          syncWithSupabase();
        }, 1000); // 1 seconde de délai avant l'envoi pour grouper les changements
        return () => clearTimeout(timer);
      }
    }
  }, [
    credits, 
    users, 
    logs, 
    microfinance, 
    autoDeactivation, 
    creditTypes, 
    microfinance_code_actif, 
    isInitialLoadDone
  ]);

  useEffect(() => {
    setNewUserMicrofinanceCode(microfinance_code_actif || '');
  }, [microfinance_code_actif]);

  const handleCodeValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = inputCode.trim().toUpperCase();
    let mf = microfinances.find(m => m.code === trimmedCode);
    
    if (!mf) {
      try {
        const { data, error } = await supabase
          .from('microfinances')
          .select('code, microfinance')
          .eq('code', trimmedCode)
          .maybeSingle();

        if (data && !error) {
          const newMF = { 
            code: data.code, 
            name: (data.microfinance as any)?.name || data.code 
          };
          setMicrofinances(prev => [...prev, newMF]);
          mf = newMF;
        }
      } catch (err) {
        console.error("Vérification code cloud échouée:", err);
      }
    }

    if (mf) {
      localStorage.setItem('microfinance_code_actif', mf.code);
      setMicrofinanceCodeActif(mf.code);
      setCodeError('');
    } else {
      setCodeError('Code microfinance invalide. Accès bloqué.');
    }
  };

  const handleAddMicrofinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMFName && newMFCode) {
      const trimmedCode = newMFCode.trim().toUpperCase();
      if (microfinances.some(mf => mf.code === trimmedCode)) {
        alert("Ce code microfinance existe déjà.");
        return;
      }
      
      const newEntry = { name: newMFName, code: trimmedCode };
      const updatedMFs = [...microfinances, newEntry];
      setMicrofinances(updatedMFs);

      try {
        await supabase.from('microfinances').upsert({
          code: trimmedCode,
          microfinance: { name: newMFName, address: '', phone: '', email: '', logo: '' },
          credits: [],
          users: [],
          logs: [],
          auto_deactivation: { days: [], startTime: '00:00', endTime: '23:59', enabled: false },
          credit_types: ['ORDINAIRE FIDELIA', 'MOKPOKPO PRE-PAYER']
        });
      } catch (err) {
        console.error("Erreur création institution cloud:", err);
      }

      setNewMFName('');
      setNewMFCode('');
      if (currentUser && currentUserRole) {
        addLog('Création d\'une institution', currentUser, currentUserRole, `Institution: ${newMFName}, Code: ${trimmedCode}`);
      }
    }
  };

  const handleAddCreditTypeProp = (typeName: string) => {
    const trimmed = typeName.trim().toUpperCase();
    if (!creditTypes.includes(trimmed)) {
      setCreditTypes(prev => [...prev, trimmed]);
      if (currentUser && currentUserRole) {
        addLog('Création d\'un type de crédit', currentUser, currentUserRole, `Type: ${trimmed}`);
      }
    }
  };

  const handleAddCreditType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCreditTypeName.trim()) {
      handleAddCreditTypeProp(newCreditTypeName);
      setNewCreditTypeName('');
    }
  };

  const handleDeleteCreditType = (typeName: string) => {
    if (typeName === 'ORDINAIRE FIDELIA' || typeName === 'MOKPOKPO PRE-PAYER') {
      alert("Impossible de supprimer les types par défaut.");
      return;
    }
    setCreditTypes(prev => prev.filter(t => t !== typeName));
    if (currentUser && currentUserRole) {
      addLog('Suppression d\'un type de crédit', currentUser, currentUserRole, `Type: ${typeName}`);
    }
  };

  const addLog = (action: string, username: string, role: string, details?: string) => {
    const newLog: Log = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString('fr-FR'),
      username,
      role,
      action,
      details,
      microfinance_code: microfinance_code_actif || ''
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const isWithinDeactivationWindow = () => {
    if (!autoDeactivation.enabled) return false;
    const now = new Date();
    const day = now.getDay(); 
    if (!autoDeactivation.days.includes(day)) return false;
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    return currentTimeStr >= autoDeactivation.startTime && currentTimeStr <= autoDeactivation.endTime;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminUsername = 'créditg@rde';
    const adminPassword = 'a6666';

    const normalizedLogin = loginUsername.trim().toLowerCase();
    const normalizedPassword = loginPassword.trim();

    if (normalizedLogin === adminUsername && normalizedPassword === adminPassword) {
      setCurrentUser(adminUsername);
      setCurrentUserRole('Administrateur');
      setIsLoggedIn(true);
      setActiveTab('tips');
      setLoginError('');
      addLog('Connexion réussie', adminUsername, 'Administrateur');
    } else {
      const foundUser = users.find(u => 
        u.username.trim().toLowerCase() === normalizedLogin && 
        u.password.trim() === normalizedPassword
      );
      if (foundUser) {
        if (!foundUser.isActive) {
          setLoginError('Ce compte a été désactivé manuellement.');
          return;
        }
        if (foundUser.role !== 'Administrateur' && foundUser.role !== 'Directeur' && isWithinDeactivationWindow()) {
          setLoginError('Accès restreint par le planning de désactivation automatique.');
          return;
        }
        setCurrentUser(foundUser.username);
        setCurrentUserRole(foundUser.role);
        setIsLoggedIn(true);
        setActiveTab('tips');
        setLoginError('');
        addLog('Connexion réussie', foundUser.username, foundUser.role);
      } else {
        setLoginError('Identifiants incorrects');
      }
    }
  };

  const generateInstallments = (credit: Credit) => {
    const installments: Installment[] = [];
    const totalDue = (Number(credit.creditAccordeChiffre) || 0) + (Number(credit.intTotal) || 0);
    const months = Number(credit.dureeMois) || 1;
    const monthlyAmount = totalDue / months;
    const deblocageDate = new Date(credit.dateDeblocage);
    
    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(deblocageDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      installments.push({
        number: i,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: monthlyAmount,
        status: 'non payé'
      });
    }
    return installments;
  };

  const handleAddCredit = (newCredit: Credit) => {
    const creditWithInstallments = { 
      ...newCredit, 
      microfinance_code: microfinance_code_actif || '', 
      repayments: [], 
      recoveryActions: [],
      installments: generateInstallments(newCredit)
    };
    setCredits(prev => [...prev, creditWithInstallments]);
    setActiveTab('active');
    if (currentUser && currentUserRole) {
      addLog('Ajout d\'un crédit', currentUser, currentUserRole, `Client: ${newCredit.clientName}`);
    }
  };

  const handleUpdateCredit = (updatedCredit: Credit) => {
    const creditWithInstallments = { 
      ...updatedCredit, 
      installments: generateInstallments(updatedCredit)
    };
    setCredits(prev => prev.map(c => c.id === updatedCredit.id ? creditWithInstallments : c));
    setEditingCredit(null);
    setActiveTab('active');
    if (currentUser && currentUserRole) {
      addLog('Modification d\'un crédit', currentUser, currentUserRole, `Client: ${updatedCredit.clientName}`);
    }
  };

  const handleDeleteCredit = (id: string) => {
    const creditToDelete = credits.find(c => c.id === id);
    setCredits(prev => prev.filter(c => c.id !== id));
    if (currentUser && currentUserRole && creditToDelete) {
      addLog('Suppression d\'un crédit', currentUser, currentUserRole, `Client: ${creditToDelete.clientName}`);
    }
  };

  const handleEditCredit = (credit: Credit) => {
    setEditingCredit(credit);
    setActiveTab('new');
  };

  const handleAddRepayment = (creditId: string, repayment: Repayment) => {
    setCredits(prev => prev.map(credit => 
      credit.id === creditId 
        ? { ...credit, repayments: [...(credit.repayments || []), { ...repayment, microfinance_code: microfinance_code_actif || '' }] }
        : credit
    ));
    const credit = credits.find(c => c.id === creditId);
    if (currentUser && currentUserRole && credit) {
      addLog('Enregistrement d\'un remboursement', currentUser, currentUserRole, `Client: ${credit.clientName}, Montant: ${repayment.capital + repayment.interests} FCFA`);
    }
  };

  const handleUpdateRepayment = (creditId: string, updatedRepayment: Repayment) => {
    setCredits(prev => prev.map(credit => 
      credit.id === creditId 
        ? { ...credit, repayments: (credit.repayments || []).map(r => r.id === updatedRepayment.id ? updatedRepayment : r) }
        : credit
    ));
    const credit = credits.find(c => c.id === creditId);
    if (currentUser && currentUserRole && credit) {
      addLog('Mise à jour remboursement', currentUser, currentUserRole, `Client: ${credit.clientName}, Remboursement ID: ${updatedRepayment.id}`);
    }
  };

  const handleDeleteRepayment = (creditId: string, repaymentId: string) => {
    setCredits(prev => prev.map(credit => 
      credit.id === creditId 
        ? { ...credit, repayments: (credit.repayments || []).filter(r => r.id !== repaymentId) }
        : credit
    ));
    const credit = credits.find(c => c.id === creditId);
    if (currentUser && currentUserRole && credit) {
      addLog('Suppression remboursement', currentUser, currentUserRole, `Client: ${credit.clientName}, Remboursement ID: ${repaymentId}`);
    }
  };

  const handleAddRecoveryAction = (creditId: string, recoveryAction: RecoveryAction) => {
    setCredits(prev => prev.map(credit => 
      credit.id === creditId 
        ? { ...credit, recoveryActions: [...(credit.recoveryActions || []), { ...recoveryAction, microfinance_code: microfinance_code_actif || '' }] }
        : credit
    ));
    const credit = credits.find(c => c.id === creditId);
    if (currentUser && currentUserRole && credit) {
      addLog('Ajout d\'une action de recouvrement', currentUser, currentUserRole, `Client: ${credit.clientName}, Commentaire: ${recoveryAction.comment}`);
    }
  };

  const handleUpdateRecoveryAction = (creditId: string, updatedAction: RecoveryAction) => {
    setCredits(prev => prev.map(credit => 
      credit.id === creditId 
        ? { ...credit, recoveryActions: (credit.recoveryActions || []).map(a => a.id === updatedAction.id ? updatedAction : a) }
        : credit
    ));
    const credit = credits.find(c => c.id === creditId);
    if (currentUser && currentUserRole && credit) {
      addLog('Mise à jour action recouvrement', currentUser, currentUserRole, `Client: ${credit.clientName}, Action ID: ${updatedAction.id}`);
    }
  };

  const handleDeleteRecoveryAction = (creditId: string, actionId: string) => {
    setCredits(prev => prev.map(credit => 
      credit.id === creditId 
        ? { ...credit, recoveryActions: (credit.recoveryActions || []).filter(a => a.id !== actionId) }
        : credit
    ));
    const credit = credits.find(c => c.id === creditId);
    if (currentUser && currentUserRole && credit) {
      addLog('Suppression action recouvrement', currentUser, currentUserRole, `Client: ${credit.clientName}, Action ID: ${actionId}`);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim() && newPassword.trim()) {
      const newUser: User = {
        id: crypto.randomUUID(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        zone: newRole === 'Agents commerciaux' ? newZone : undefined,
        isActive: true,
        microfinance_code: newUserMicrofinanceCode || microfinance_code_actif || ''
      };
      setUsers(prev => [...prev, newUser]);
      setNewUsername('');
      setNewPassword('');
      setNewRole('Autres');
      setNewZone('01');
      setNewUserMicrofinanceCode(microfinance_code_actif || '');
      if (currentUser && currentUserRole) {
        addLog('Création d\'un utilisateur', currentUser, currentUserRole, `Utilisateur: ${newUser.username}, Rôle: ${newUser.role}`);
      }
    }
  };

  const handleDeleteUser = (id: string) => {
    if (currentUserRole === 'Administrateur' || currentUserRole === 'Directeur') {
      const userToDelete = users.find(u => u.id === id);
      setUsers(prev => prev.filter(u => u.id !== id));
      if (currentUser && currentUserRole && userToDelete) {
        addLog('Suppression d\'un utilisateur', currentUser, currentUserRole, `Utilisateur: ${userToDelete.username}`);
      }
    }
  };

  const handleClearLogs = () => {
    if (window.confirm("Voulez-vous vraiment vider tout l'historique des activités ?")) {
      setLogs([]);
      if (currentUser && currentUserRole) {
        addLog('Historique vidé', currentUser, currentUserRole);
      }
    }
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm("Supprimer cette entrée de l'historique ?")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const toggleUserActivation = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const newState = !u.isActive;
        if (currentUser && currentUserRole) {
          addLog(`${newState ? 'Activation' : 'Désactivation'} manuelle d'utilisateur`, currentUser, currentUserRole, `Utilisateur: ${u.username}`);
        }
        return { ...u, isActive: newState };
      }
      return u;
    }));
  };

  const handleAutoDeactivationToggleDay = (dayIndex: number) => {
    setAutoDeactivation(prev => {
      const newDays = prev.days.includes(dayIndex)
        ? prev.days.filter((d: number) => d !== dayIndex)
        : [...prev.days, dayIndex];
      return { ...prev, days: newDays };
    });
  };

  const isCreditSettled = (credit: Credit) => {
    const totalCapitalRepaid = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0), 0);
    const totalInterestsRepaid = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.interests) || 0), 0);
    const capitalBalance = (Number(credit.creditAccordeChiffre) || 0) - totalCapitalRepaid;
    const interestBalance = (Number(credit.intTotal) || 0) - totalInterestsRepaid;
    return capitalBalance <= 0 && interestBalance <= 0;
  };

  const getCreditStatus = (credit: Credit) => {
    if (isCreditSettled(credit)) return 'payé';

    const todayStr = new Date().toISOString().split('T')[0];
    const totalRepaidAll = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0) + (Number(r.interests) || 0), 0);
    const installments = credit.installments || [];
    
    const lateCount = installments.filter(inst => {
      const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const isCovered = totalRepaidAll >= (cumulativeDue - 1); // tolerance 1 FCFA
      return !isCovered && inst.dueDate < todayStr;
    }).length;

    const echeance = credit.creditType === 'ORDINAIRE FIDELIA' ? credit.dateDernierRemboursement : credit.aRembourserLe;

    if (lateCount > 0 || (echeance && echeance < todayStr)) return 'en retard';
    return 'en cours';
  };

  const getDossierHTML = (credit: Credit) => {
    const totalRepaidAll = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0) + (Number(r.interests) || 0), 0);
    const installments = credit.installments || [];
    
    const monthlyCapital = (Number(credit.dureeMois) || 0) > 0 ? (Number(credit.creditAccordeChiffre) / Number(credit.dureeMois)) : 0;
    const monthlyInterest = (Number(credit.dureeMois) || 0) > 0 ? ((Number(credit.intTotal) || 0) / Number(credit.dureeMois)) : 0;
    const monthlyExpected = installments.length > 0 ? (Number(installments[0].amount) || 0) : (monthlyCapital + monthlyInterest);
    
    const totalInstallmentsCount = installments.length || Number(credit.dureeMois) || 0;
    const paidCount = installments.length > 0
      ? installments.filter(inst => {
          const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
          return totalRepaidAll >= (cumulativeDue - 1);
        }).length
      : (monthlyExpected > 0 ? Math.min(totalInstallmentsCount, Math.floor((totalRepaidAll + 1) / monthlyExpected)) : 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const oldestLateInstallment = installments.find(inst => {
      const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const isCovered = totalRepaidAll >= (cumulativeDue - 1);
      return !isCovered && inst.dueDate < todayStr;
    });

    const repaidCap = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0), 0);
    const repaidInt = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.interests) || 0), 0);
    const capRest = (Number(credit.creditAccordeChiffre) || 0) - repaidCap;
    const intRest = (Number(credit.intTotal) || 0) - repaidInt;

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Dossier de Crédit - ${credit.clientName || 'Client'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #0f172a; line-height: 1.4; font-size: 10pt; margin: 0; padding: 0; background: #fff; }
          .container { max-width: 180mm; margin: 0 auto; }
          .header { border-bottom: 4px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .logo-placeholder { background: #10b981; color: white; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 8px; margin-bottom: 8px; font-size: 20px; }
          .mf-info { text-align: left; }
          .mf-name { font-size: 22pt; font-weight: 900; color: #1e293b; text-transform: uppercase; line-height: 1; }
          .mf-details { font-size: 9pt; color: #64748b; font-weight: 600; margin-top: 5px; }
          .report-title { font-size: 16pt; font-weight: 900; color: white; background: #1e293b; padding: 12px; text-align: center; text-transform: uppercase; margin: 20px 0; border-radius: 4px; -webkit-print-color-adjust: exact; }
          .section { margin-bottom: 25px; page-break-inside: avoid; }
          .section-title { font-size: 11pt; font-weight: 900; color: #10b981; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 12px; display: flex; align-items: center; }
          .section-title::before { content: ""; display: inline-block; width: 8px; height: 18px; background: #10b981; margin-right: 10px; border-radius: 2px; -webkit-print-color-adjust: exact; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .item { display: flex; border-bottom: 1px solid #f8fafc; padding: 5px 0; }
          .label { font-weight: 700; color: #64748b; width: 170px; font-size: 8.5pt; text-transform: uppercase; }
          .value { font-weight: 800; color: #0f172a; flex: 1; font-size: 10pt; }
          .footer { font-size: 8pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; font-style: italic; }
          .table-container { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table-container th, .table-container td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 9pt; }
          .table-container th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #475569; -webkit-print-color-adjust: exact; }
          .badge-retard { background-color: #ef4444; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 900; text-transform: uppercase; font-size: 10px; margin-left: 10px; display: inline-block; -webkit-print-color-adjust: exact; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="mf-info">
              <div class="logo-placeholder">CG</div>
              <div class="mf-name">${microfinance.name || 'CRÉDIT-GARDE'}</div>
              <div class="mf-details">
                ${microfinance.address || 'Adresse non renseignée'}<br>
                Tél: ${microfinance.phone || 'Non renseigné'}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14pt; font-weight: 900; color: #10b981;">DOSSIER N°: ${credit.dossierNo || '-'}</div>
              <div style="font-size: 9pt; color: #64748b; margin-top: 5px;">Généré le: ${new Date().toLocaleString('fr-FR')}</div>
            </div>
          </div>

          <div class="report-title">
            DOSSIER DE CRÉDIT - ${credit.creditType || 'ORDINAIRE'}
            ${oldestLateInstallment ? '<span class="badge-retard">RETARD</span>' : ''}
          </div>

          <div class="section">
            <div class="section-title">Informations du Client</div>
            <div class="grid">
              <div class="item"><span class="label">Client:</span> <span class="value">${credit.clientCivilite || ''} ${credit.clientName || ''}</span></div>
              <div class="item"><span class="label">Zone:</span> <span class="value">${credit.zone || '-'}</span></div>
              <div class="item"><span class="label">Agent Commercial:</span> <span class="value">${credit.agentCommercial || '-'}</span></div>
              <div class="item"><span class="label">Profession:</span> <span class="value">${credit.profession || '-'}</span></div>
              <div class="item"><span class="label">Téléphone:</span> <span class="value">${credit.tel || '-'}</span></div>
              <div class="item"><span class="label">Revenu Mensuel:</span> <span class="value">${(Number(credit.clientRevenuMensuel) || 0).toLocaleString()} FCFA</span></div>
              <div class="item"><span class="label">Adresse Domicile:</span> <span class="value">${credit.adresseDomicile || '-'}</span></div>
              <div class="item"><span class="label">Adresse Service:</span> <span class="value">${credit.adresseService || '-'}</span></div>
              <div class="item"><span class="label">Compte Épargne:</span> <span class="value">${credit.noCompte || '-'}</span></div>
              <div class="item"><span class="label">Compte Tontine:</span> <span class="value">${credit.noCompteTontine || '-'}</span></div>
              <div class="item"><span class="label">Mise Tontine:</span> <span class="value">${credit.mise || '-'}</span></div>
              ${oldestLateInstallment ? `<div class="item"><span class="label" style="color: #ef4444;">Statut:</span> <span class="value" style="color: #ef4444;">RETARD de ${getDelayDuration(oldestLateInstallment.dueDate)}</span></div>` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Conditions de Financement</div>
            <div class="grid">
              <div class="item"><span class="label">Capital Accordé:</span> <span class="value">${(Number(credit.creditAccordeChiffre) || 0).toLocaleString()} FCFA</span></div>
              <div class="item"><span class="label">Durée:</span> <span class="value">${credit.dureeMois || 0} Mois</span></div>
              <div class="item"><span class="label">Date Déblocage:</span> <span class="value">${credit.dateDeblocage || '-'}</span></div>
              <div class="item"><span class="label">Échéance Finale:</span> <span class="value">${credit.creditType === 'ORDINAIRE FIDELIA' ? (credit.dateDernierRemboursement || '-') : (credit.aRembourserLe || '-')}</span></div>
              <div class="item"><span class="label">Intérêt Total:</span> <span class="value">${(Number(credit.intTotal) || 0).toLocaleString()} FCFA</span></div>
              <div class="item"><span class="label">Frais de Dossier:</span> <span class="value">${(Number(credit.fraisEtudeDossier) || 0).toLocaleString()} FCFA</span></div>
              <div class="item"><span class="label">Utilisation:</span> <span class="value">${credit.utilisationCredit || '-'}</span></div>
              <div class="item"><span class="label">Mensualités Payées:</span> <span class="value">${paidCount} / ${totalInstallmentsCount}</span></div>
              <div class="item"><span class="label">Restant Cap:</span> <span class="value" style="color: #16a34a;">${capRest.toLocaleString()} FCFA</span></div>
              <div class="item"><span class="label">Restant Int:</span> <span class="value" style="color: #2563eb;">${intRest.toLocaleString()} FCFA</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Garanties & Cautions</div>
            <div class="grid">
              <div class="item"><span class="label">Nom Caution:</span> <span class="value">${credit.cautionCivilite || ''} ${credit.cautionNom || ''} ${credit.cautionPrenoms || ''}</span></div>
              <div class="item"><span class="label">Tél Caution:</span> <span class="value">${credit.cautionTel || '-'}</span></div>
              <div class="item"><span class="label">Montant Cautionné:</span> <span class="value">${(Number(credit.cautionPretInteretsChiffre) || 0).toLocaleString()} FCFA</span></div>
              <div class="item"><span class="label">Adresse Caution:</span> <span class="value">${credit.cautionAdresse || '-'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Suivi des Paiements</div>
            <table class="table-container">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Capital (FCFA)</th>
                  <th>Intérêts (FCFA)</th>
                  <th>Total (FCFA)</th>
                  <th>Agent</th>
                </tr>
              </thead>
              <tbody>
                ${(credit.repayments || []).length > 0 ? credit.repayments.map(r => `
                  <tr>
                    <td>${r.date}</td>
                    <td style="text-align: right;">${(Number(r.capital) || 0).toLocaleString()}</td>
                    <td style="text-align: right;">${(Number(r.interests) || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: bold;">${((Number(r.capital) || 0) + (Number(r.interests) || 0)).toLocaleString()}</td>
                    <td>${r.username || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Aucun remboursement enregistré</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="footer">
            Document confidentiel généré par Crédit-Garde - ${microfinance.name || 'Microfinance'}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintDossier = (credit: Credit) => {
    const html = getDossierHTML(credit);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres surgissantes pour l'impression.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.write('<script>window.onload = () => { window.focus(); window.print(); setTimeout(() => window.close(), 500); };</script>');
    printWindow.document.close();
  };

  const handleExportDossier = (credit: Credit) => {
    const htmlContent = getDossierHTML(credit);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dossier_${credit.dossierNo || 'credit'}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (currentUser && currentUserRole) {
      addLog('Exportation dossier', currentUser, currentUserRole, `Dossier: ${credit.dossierNo}`);
    }
  };

  const handleExportTable = (data: Credit[], filename: string) => {
    let totalCapitalInitial = 0;
    let totalCapitalRestant = 0;
    let totalInteretsDus = 0;

    const tableRows = data.map(c => {
      const repaidCap = (c.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0), 0);
      const repaidInt = (c.repayments || []).reduce((acc, r) => acc + (Number(r.interests) || 0), 0);
      const capRest = (Number(c.creditAccordeChiffre) || 0) - repaidCap;
      const intRest = (Number(c.intTotal) || 0) - repaidInt;
      const echeance = c.creditType === 'ORDINAIRE FIDELIA' ? (c.dateDernierRemboursement || '-') : (c.aRembourserLe || '-');
      
      const totalRepaidAll = repaidCap + repaidInt;
      const installments = c.installments || [];
      
      const mCap = (Number(c.dureeMois) || 0) > 0 ? (Number(c.creditAccordeChiffre) / Number(c.dureeMois)) : 0;
      const mInt = (Number(c.dureeMois) || 0) > 0 ? ((Number(c.intTotal) || 0) / Number(c.dureeMois)) : 0;
      const mExpected = installments.length > 0 ? (Number(installments[0].amount) || 0) : (mCap + mInt);
      const totalInst = installments.length || Number(c.dureeMois) || 0;
      
      const paidCount = installments.length > 0
        ? installments.filter(inst => {
            const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
            return totalRepaidAll >= (cumulativeDue - 1);
          }).length
        : (mExpected > 0 ? Math.min(totalInst, Math.floor((totalRepaidAll + 1) / mExpected)) : 0);

      totalCapitalInitial += (Number(c.creditAccordeChiffre) || 0);
      totalCapitalRestant += capRest;
      totalInteretsDus += intRest;

      return `
        <tr>
          <td>${c.dossierNo || '-'}</td>
          <td>${c.clientName || '-'}</td>
          <td>${c.agentCommercial || '-'}</td>
          <td>${c.creditType || '-'}</td>
          <td style="text-align: right;">${(Number(c.creditAccordeChiffre) || 0).toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; color: #16a34a;">${capRest.toLocaleString()}</td>
          <td style="text-align: right; color: #2563eb;">${intRest.toLocaleString()}</td>
          <td style="text-align: center;">${paidCount} / ${totalInst}</td>
          <td>${echeance}</td>
        </tr>
      `;
    }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: white; }
          .header { border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .mf-name { font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
          .report-title { font-size: 16px; font-weight: 700; color: #10b981; margin: 5px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; -webkit-print-color-adjust: exact; }
          td { border: 1px solid #e2e8f0; padding: 8px; font-size: 10px; }
          tr:nth-child(even) { background-color: #f8fafc; -webkit-print-color-adjust: exact; }
          .total-row { background-color: #e2e8f0 !important; font-weight: 900; -webkit-print-color-adjust: exact; }
          .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: right; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="mf-name">${microfinance.name || 'CRÉDIT-GARDE'}</div>
            <div class="report-title">État Global du Portefeuille de Crédits</div>
          </div>
          <div style="text-align: right; font-size: 10px; font-weight: bold; color: #64748b;">
            Document généré le: ${new Date().toLocaleString('fr-FR')}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Dossier No</th>
              <th>Nom du Client</th>
              <th>Agent Commercial</th>
              <th>Type de Produit</th>
              <th>Capital Initial</th>
              <th>Capital Restant</th>
              <th>Intérêts Dus</th>
              <th>Mensualités</th>
              <th>Échéance Finale</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">TOTAUX :</td>
              <td style="text-align: right;">${totalCapitalInitial.toLocaleString()}</td>
              <td style="text-align: right;">${totalCapitalRestant.toLocaleString()}</td>
              <td style="text-align: right;">${totalInteretsDus.toLocaleString()}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">Document confidentiel - Crédit-Garde</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename.replace('.csv', '.html'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportForecast = (data: any[], total: number) => {
    const tableRows = data.map(fi => `
      <tr>
        <td>${fi.dueDate}</td>
        <td>${fi.client}</td>
        <td>${fi.dossierNo}</td>
        <td>${fi.zone}</td>
        <td style="text-align: right; font-weight: bold; color: #10b981;">${fi.amount.toLocaleString()} FCFA</td>
      </tr>
    `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: white; }
          .header { border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .mf-name { font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
          .report-title { font-size: 16px; font-weight: 700; color: #10b981; margin: 5px 0 0 0; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; -webkit-print-color-adjust: exact; }
          td { border: 1px solid #e2e8f0; padding: 8px; font-size: 10px; }
          tr:nth-child(even) { background-color: #f8fafc; -webkit-print-color-adjust: exact; }
          .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: right; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="mf-name">${microfinance.name || 'CRÉDIT-GARDE'}</div>
            <div class="report-title">Prévisions des Remboursements</div>
          </div>
          <div style="text-align: right; font-size: 10px; font-weight: bold; color: #64748b;">
            Période: ${forecastStart} au ${forecastEnd}<br>
            Généré le: ${new Date().toLocaleString('fr-FR')}
          </div>
        </div>
        <div class="summary">
          <strong>TOTAL ATTENDU : ${total.toLocaleString()} FCFA</strong> | ${data.length} remboursements prévus
        </div>
        <table>
          <thead>
            <tr>
              <th>Échéance</th>
              <th>Client</th>
              <th>Dossier No</th>
              <th>Zone</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">Document confidentiel - Crédit-Garde</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `previsions_${forecastStart}_au_${forecastEnd}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (currentUser && currentUserRole) {
      addLog('Exportation prévisions', currentUser, currentUserRole, `Période: ${forecastStart} au ${forecastEnd}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filterCredits = (list: Credit[]) => {
    if (!searchTerm) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(c => 
      (c.clientName || '').toLowerCase().includes(lowerSearch) || 
      (c.surNom || '').toLowerCase().includes(lowerSearch) ||
      (c.dossierNo || '').toLowerCase().includes(lowerSearch) ||
      (c.noCompte || '').toLowerCase().includes(lowerSearch) ||
      (c.noCompteTontine || '').toLowerCase().includes(lowerSearch)
    );
  };

  const filterLogs = (list: Log[]) => {
    if (!searchTerm) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(l => 
      (l.username || '').toLowerCase().includes(lowerSearch) || 
      (l.action || '').toLowerCase().includes(lowerSearch) ||
      (l.details || '').toLowerCase().includes(lowerSearch)
    );
  };

  const getDailyTips = () => {
    const role = currentUserRole || 'Autres';
    const tipsList = RECOVERY_TIPS[role] || RECOVERY_TIPS['Autres'];
    const todayIndex = new Date().getDate() % tipsList.length;
    return [
      tipsList[todayIndex % tipsList.length],
      tipsList[(todayIndex + 1) % tipsList.length],
      tipsList[(todayIndex + 2) % tipsList.length]
    ];
  };

  if (!microfinance_code_actif) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
          <div className="bg-[#10b981] p-8 text-center text-white">
            <h1 className="text-3xl font-black mb-2 uppercase italic">Accès Microfinance</h1>
            <p className="text-emerald-100 text-sm">Veuillez entrer votre code institutionnel</p>
          </div>
          <div className="p-10 space-y-6">
            <form onSubmit={handleCodeValidation} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Code Microfinance</label>
                <input 
                  type="text" 
                  placeholder="Ex: 001FABES" 
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-transparent focus:border-emerald-500 rounded-xl p-4 text-center font-black text-lg outline-none transition-all uppercase"
                  required
                />
              </div>
              {codeError && <p className="text-red-500 text-xs font-bold text-center italic">{codeError}</p>}
              <button 
                type="submit"
                className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
              >
                Valider et Continuer
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
          <div className="bg-[#10b981] p-12 text-center text-white">
            <h1 className="text-5xl font-black mb-2 tracking-tighter italic">Crédit-Garde</h1>
            <p className="text-emerald-100 text-lg font-medium uppercase">{activeMF?.name}</p>
          </div>
          <div className="p-10 space-y-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center">
                <span className="mr-3 text-2xl">💡</span> Conseils pour une gestion saine
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3 text-slate-600 text-sm leading-relaxed">
                  <span className="text-[#10b981] font-bold mt-0.5">•</span>
                  <span><strong>Emprunt Responsable :</strong> Un crédit vous engage et doit être remboursé. Vérifiez systématiquement votre capacité de remboursement avant de signer.</span>
                </li>
                <li className="flex items-start space-x-3 text-slate-600 text-sm leading-relaxed">
                  <span className="text-[#10b981] font-bold mt-0.5">•</span>
                  <span><strong>Analyse de Risque :</strong> Évaluez soigneusement l'utilisation des fonds. Un bon crédit doit servir à un investissement productif.</span>
                </li>
              </ul>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Nom d'utilisateur" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Mot de passe" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
              <button 
                type="submit"
                disabled={!isInitialLoadDone}
                className={`w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-[1.01] active:scale-95 uppercase tracking-widest ${!isInitialLoadDone ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isInitialLoadDone ? "Accéder à l'Espace de Gestion" : "Chargement de la session..."}
              </button>
            </form>
            <div className="text-center pt-4">
              <button 
                onClick={() => { localStorage.removeItem('microfinance_code_actif'); window.location.reload(); }}
                className="text-xs font-bold text-slate-400 hover:text-emerald-500 uppercase transition-colors"
              >
                Changer de Microfinance
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserRole === 'Administrateur';
  const isDirector = currentUserRole === 'Directeur';
  const isRestricted = currentUserRole === 'Autres' || currentUserRole === 'Agents commerciaux';
  const canSeeLogs = isAdmin;

  const loggedInUserObj = users.find(u => u.username === currentUser);
  const userZone = loggedInUserObj?.zone;

  const settledCredits = credits.filter(credit => 
    getCreditStatus(credit) === 'payé' && 
    (currentUserRole !== 'Agents commerciaux' || credit.zone === userZone) &&
    (settledFilterType === 'Tous' || credit.creditType === settledFilterType) &&
    (settledFilterZone === 'Toutes' || credit.zone === settledFilterZone) &&
    credit.microfinance_code === microfinance_code_actif &&
    (credit.zone !== 'VIP' || (currentUserRole === 'Administrateur' || currentUserRole === 'Directeur'))
  );

  const activeCredits = credits.filter(credit => {
    const status = getCreditStatus(credit);
    if (status === 'payé') return false;

    // Permissions check
    if (currentUserRole === 'Agents commerciaux' && credit.zone !== userZone) return false;
    if (credit.zone === 'VIP' && !(currentUserRole === 'Administrateur' || currentUserRole === 'Directeur')) return false;
    if (credit.microfinance_code !== microfinance_code_actif) return false;

    // Type and Zone filters
    if (activeFilterType !== 'Tous' && credit.creditType !== activeFilterType) return false;
    if (activeFilterZone !== 'Toutes' && credit.zone !== activeFilterZone) return false;

    // Status Filter logic
    const todayStr = new Date().toISOString().split('T')[0];
    const totalRepaidAll = (credit.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0) + (Number(r.interests) || 0), 0);
    const installments = credit.installments || [];
    const echeance = credit.creditType === 'ORDINAIRE FIDELIA' ? credit.dateDernierRemboursement : credit.aRembourserLe;
    
    const isLate = status === 'en retard';
    
    const nextInstallment = installments.find(inst => {
      const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      return totalRepaidAll < (cumulativeDue - 1);
    });

    const checkSoon = (dateStr?: string) => {
      if (!dateStr) return false;
      const targetDate = new Date(dateStr);
      const today = new Date(todayStr);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    };

    const isSoon = !isLate && (checkSoon(nextInstallment?.dueDate) || checkSoon(echeance));

    if (activeFilterStatus === 'Retard') return isLate;
    if (activeFilterStatus === 'Proche') return isSoon;
    if (activeFilterStatus === 'Sain') return status === 'en cours' && !isSoon;

    return true;
  });

  const arrearsCreditsList = credits.filter(credit => 
    getCreditStatus(credit) === 'en retard' &&
    (currentUserRole !== 'Agents commerciaux' || credit.zone === userZone) &&
    credit.microfinance_code === microfinance_code_actif &&
    (credit.zone !== 'VIP' || (currentUserRole === 'Administrateur' || currentUserRole === 'Directeur'))
  );

  const filteredArrearsCredits = filterCredits(arrearsCreditsList).filter(c => 
    (arrearsFilterType === 'Tous' || c.creditType === arrearsFilterType) &&
    (arrearsFilterZone === 'Toutes' || c.zone === arrearsFilterZone)
  );
  
  const filteredActiveCredits = filterCredits(activeCredits);
  const filteredSettledCredits = filterCredits(settledCredits);
  const filteredLogs = filterLogs(logs).filter(l => l.microfinance_code === microfinance_code_actif);

  const activeRemainingForFiltered = filteredActiveCredits.reduce((acc, c) => {
    const repaid = (c.repayments || []).reduce((ra, r) => ra + (Number(r.capital) || 0), 0);
    return acc + ((Number(c.creditAccordeChiffre) || 0) - repaid);
  }, 0);

  const dashboardCredits = credits.filter(c => 
    (currentUserRole !== 'Agents commerciaux' || c.zone === userZone) &&
    (dashFilterType === 'Tous' || c.creditType === dashFilterType) &&
    (dashFilterZone === 'Toutes' || c.zone === dashFilterZone) &&
    c.microfinance_code === microfinance_code_actif &&
    (c.zone !== 'VIP' || (currentUserRole === 'Administrateur' || currentUserRole === 'Directeur'))
  );
  const dbActiveCredits = dashboardCredits.filter(c => getCreditStatus(c) !== 'payé');
  const dbSettledCredits = dashboardCredits.filter(c => getCreditStatus(c) === 'payé');

  const dbToday = new Date().toISOString().split('T')[0];
  const dbLateCredits = dbActiveCredits.filter(c => getCreditStatus(c) === 'en retard');
  const dbHealthyCredits = dbActiveCredits.filter(c => getCreditStatus(c) === 'en cours');
  
  const dbPar30Credits = dbActiveCredits.filter(c => {
    const installments = c.installments || [];
    const totalRepaid = (c.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0) + (Number(r.interests) || 0), 0);
    const oldestLateInstallment = installments.find(inst => {
      const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      return totalRepaid < (cumulativeDue - 1) && inst.dueDate < dbToday;
    });

    if (!oldestLateInstallment) return false;
    const deadlineDate = new Date(oldestLateInstallment.dueDate);
    const todayDate = new Date(dbToday);
    const diffTime = todayDate.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  });

  const dbTotalOutstanding = dbActiveCredits.reduce((acc, c) => {
    const repaid = (c.repayments || []).reduce((ra, r) => ra + (Number(r.capital) || 0), 0);
    return acc + ((Number(c.creditAccordeChiffre) || 0) - repaid);
  }, 0);

  const dbPar1Amount = dbLateCredits.reduce((acc, c) => {
    const repaid = (c.repayments || []).reduce((ra, r) => ra + (Number(r.capital) || 0), 0);
    return acc + ((Number(c.creditAccordeChiffre) || 0) - repaid);
  }, 0);

  const dbPar30Amount = dbPar30Credits.reduce((acc, c) => {
    const repaid = (c.repayments || []).reduce((ra, r) => ra + (Number(r.capital) || 0), 0);
    return acc + ((Number(c.creditAccordeChiffre) || 0) - repaid);
  }, 0);

  const dbPar1Rate = dbTotalOutstanding > 0 ? (dbPar1Amount / dbTotalOutstanding) * 100 : 0;
  const dbPar30Rate = dbTotalOutstanding > 0 ? (dbPar30Amount / dbTotalOutstanding) * 100 : 0;

  const dbTotalCapitalAccorde = dashboardCredits.reduce((acc, c) => acc + (Number(c.creditAccordeChiffre) || 0), 0);
  const dbTotalCapitalRembourse = dashboardCredits.reduce((acc, r) => acc + (r.repayments || []).reduce((ra, rb) => ra + (Number(rb.capital) || 0), 0), 0);
  const dbRecoveryRate = dbTotalCapitalAccorde > 0 ? (dbTotalCapitalRembourse / dbTotalCapitalAccorde) * 100 : 0;

  const dbTotalMonsieur = dashboardCredits.filter(c => c.clientCivilite === 'Monsieur').length;
  const dbTotalMadame = dashboardCredits.filter(c => c.clientCivilite === 'Madame').length;

  const forecastInstallments = activeCredits.flatMap(c => {
    const installments = c.installments || [];
    const totalRepaidAll = (c.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0) + (Number(r.interests) || 0), 0);
    
    return installments.filter(inst => {
      const cumulativeDue = installments.filter(i => i.number <= inst.number).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const isNotYetPaid = totalRepaidAll < (cumulativeDue - 1);
      return isNotYetPaid && inst.dueDate >= forecastStart && inst.dueDate <= forecastEnd;
    }).map(inst => ({
      client: c.clientName,
      dueDate: inst.dueDate,
      amount: inst.amount,
      dossierNo: c.dossierNo,
      zone: c.zone
    }));
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalForecastAmount = forecastInstallments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 print:bg-white">
      <aside className="w-full md:w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl print:hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-10 h-10 bg-[#10b981] rounded-lg flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-xl">CG</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Crédit-Garde</h1>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{activeMF?.name}</p>
          </div>
        </div>

        <div className="flex-1 py-8 px-4 space-y-6">
          <nav>
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Informations</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('tips')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'tips' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">💡</span>
                <span className="text-sm">Astuces de recouvrement</span>
              </button>
            </div>
          </nav>

          <nav>
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Général</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">📊</span>
                <span className="text-sm">Tableau de bord</span>
              </button>
            </div>
          </nav>

          {!isRestricted && (
            <nav>
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Gestion des crédits</h3>
              <div className="space-y-1">
                <button 
                  onClick={() => { setEditingCredit(null); setActiveTab('new'); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'new' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                >
                  <span className="text-xl">⊕</span>
                  <span className="text-sm">Nouveau crédit</span>
                </button>
              </div>
            </nav>
          )}

          <nav>
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Suivi & Collecte</h3>
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveTab('active'); setSearchTerm(''); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'active' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">🕒</span>
                <span className="text-sm">Crédit actif</span>
              </button>
              <button 
                onClick={() => { setActiveTab('arrears'); setSearchTerm(''); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'arrears' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">⚠️</span>
                <span className="text-sm">Crédits en retard</span>
              </button>
              <button 
                onClick={() => { setActiveTab('settled'); setSearchTerm(''); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'settled' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">📄</span>
                <span className="text-sm">Crédit soldé</span>
              </button>
              <button 
                onClick={() => setActiveTab('forecast')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'forecast' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">📅</span>
                <span className="text-sm">Prévisions</span>
              </button>
            </div>
          </nav>

          <nav>
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Conseils</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('training')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'training' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
              >
                <span className="text-xl">🎓</span>
                <span className="text-sm">Conseil et formation</span>
              </button>
            </div>
          </nav>

          {(isAdmin || isDirector) && (
            <nav>
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Configuration</h3>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab('invitation')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'invitation' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                >
                  <span className="text-xl">⚙️</span>
                  <span className="text-sm">Configuration</span>
                </button>
              </div>
            </nav>
          )}

          {(isAdmin || isDirector) && (
            <nav>
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Administration</h3>
              <div className="space-y-1">
                {isAdmin && (
                  <button 
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'users' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                  >
                    <span className="text-xl">👥</span>
                    <span className="text-sm">Utilisateurs</span>
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('activation')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'activation' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                >
                  <span className="text-xl">🔒</span>
                  <span className="text-sm">Activer/Désactiver</span>
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => { setActiveTab('logs'); setSearchTerm(''); }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'logs' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                  >
                    <span className="text-xl">📜</span>
                    <span className="text-sm">Historique</span>
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('migration')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'migration' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                >
                  <span className="text-xl">🚀</span>
                  <span className="text-sm">Migration</span>
                </button>
              </div>
            </nav>
          )}

          {isAdmin && (
            <nav>
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest px-4 mb-3 mt-4">Développeur</h3>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab('developer')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'developer' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/30 font-black' : 'text-slate-100 hover:bg-slate-800 font-bold'}`}
                >
                  <span className="text-xl">👨‍💻</span>
                  <span className="text-sm">Développeur</span>
                </button>
              </div>
            </nav>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-2 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : (!isInitialLoadDone ? 'bg-orange-500 animate-pulse' : isSyncError ? 'bg-red-500' : 'bg-emerald-500')}`}></div>
            <span>
              {isSyncing ? 'Sauvegarde...' : (!isInitialLoadDone ? 'Connexion...' : isSyncError ? 'Erreur Supabase' : 'Sync LIVE')}
            </span>
          </div>
          <div className="px-4 py-2 text-xs text-slate-200 truncate font-bold">Connecté: {currentUser} ({currentUserRole})</div>
          <button 
            onClick={() => {
              if (currentUser && currentUserRole) {
                addLog('Déconnexion', currentUser, currentUserRole);
              }
              setIsLoggedIn(false);
              setCurrentUser(null);
              setCurrentUserRole(null);
              setLoginUsername('');
              setLoginPassword('');
              localStorage.removeItem('microfinance_code_actif');
              setMicrofinanceCodeActif(null);
            }}
            className="w-full mt-2 bg-[#ef4444] hover:bg-red-600 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors text-sm shadow-lg shadow-red-500/20"
          >
            <span>🚪</span>
            <span>Quitter</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'tips' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4 uppercase tracking-tight">Astuces de recouvrement</h2>
              <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center text-center">
                <span className="text-6xl mb-6 block">💡</span>
                <h3 className="text-2xl font-black text-emerald-900 mb-4 uppercase">Espace Astuces de Recouvrement</h3>
                <div className="bg-white p-6 rounded-2xl border-2 border-emerald-200 shadow-inner max-w-2xl mb-8">
                  <p className="text-emerald-800 font-bold text-lg leading-relaxed">
                    Cette rubrique regroupe les meilleures pratiques pour optimiser le suivi et le recouvrement de vos créances.
                  </p>
                </div>
                
                <div className="w-full max-w-2xl border-t-2 border-emerald-100 pt-8 mt-4">
                  <h4 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Les conseils du jour pour vous</h4>
                  <div className="space-y-4">
                    {getDailyTips().map((tip, idx) => (
                      <div key={idx} className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border-l-8 border-emerald-500">
                        <p className="font-bold italic text-md leading-relaxed">
                          "{tip}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'dashboard' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:border-none">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b pb-4 gap-4">
                <h2 className="text-3xl font-black text-slate-900">Tableau de Bord BCEAO (SFD)</h2>
                <div className="flex flex-wrap gap-2">
                  <select value={dashFilterType} onChange={(e) => setDashFilterType(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Tous">Tous types</option>
                    {creditTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={dashFilterZone} onChange={(e) => setDashFilterZone(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Toutes">Toutes zones</option>
                    {ZONES_LIST.map(z => (<option key={z} value={z}>{z}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${dbPar1Rate > 10 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase mb-1 flex justify-between items-center">
                      <span>PAR 1 jour</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${dbPar1Rate > 10 ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>Norme {'<'} 10%</span>
                    </h3>
                    <p className="text-2xl font-black">{dbPar1Rate.toFixed(2)}%</p>
                  </div>
                  <p className="text-[10px] mt-2 text-gray-500">Encours à risque (1j+): {dbPar1Amount.toLocaleString()} FCFA</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${dbPar30Rate > 5 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase mb-1 flex justify-between items-center">
                      <span>PAR 30 jours</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${dbPar30Rate > 5 ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>Norme {'<'} 5%</span>
                    </h3>
                    <p className="text-2xl font-black">{dbPar30Rate.toFixed(2)}%</p>
                  </div>
                  <p className="text-[10px] mt-2 text-gray-500">Encours à risque (30j+): {dbPar30Amount.toLocaleString()} FCFA</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-blue-700 text-xs font-bold uppercase mb-1">Taux Recouvrement</h3>
                    <p className="text-2xl font-black text-blue-900">{dbRecoveryRate.toFixed(2)}%</p>
                  </div>
                  <p className="text-[10px] mt-2 text-blue-600">Total remboursé: {dbTotalCapitalRembourse.toLocaleString()} FCFA</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-slate-700 text-xs font-bold uppercase mb-1">Qualité Port.</h3>
                    <p className="text-2xl font-black text-slate-900">{(100 - dbPar1Rate).toFixed(2)}%</p>
                  </div>
                  <p className="text-[10px] mt-2 text-slate-600">Portefeuille sain: {dbHealthyCredits.length} dossiers</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="text-blue-700 text-xs font-bold uppercase mb-2">Total Dossiers (SFD)</h3>
                  <p className="text-3xl font-black text-blue-900">{dashboardCredits.length}</p>
                </div>
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <h3 className="text-indigo-700 text-xs font-bold uppercase mb-2">Nombre de Monsieur</h3>
                  <p className="text-3xl font-black text-indigo-900">{dbTotalMonsieur}</p>
                </div>
                <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100">
                  <h3 className="text-pink-700 text-xs font-bold uppercase mb-2">Nombre de Madame</h3>
                  <p className="text-3xl font-black text-pink-900">{dbTotalMadame}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <h3 className="text-emerald-700 text-xs font-bold uppercase mb-2">Dossiers Sains</h3>
                  <p className="text-3xl font-black text-emerald-900">{dbHealthyCredits.length}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <h3 className="text-red-700 text-xs font-bold uppercase mb-2">Dossiers Souffrants</h3>
                  <p className="text-3xl font-black text-red-900">{dbLateCredits.length}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-slate-700 text-xs font-bold uppercase mb-2">Dossiers Clôturés</h3>
                  <p className="text-3xl font-black text-slate-900">{dbSettledCredits.length}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl md:col-span-2 text-white shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div>
                      <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Encours Brut Total</h3>
                      <p className="text-4xl font-black">{dbTotalOutstanding.toLocaleString()} FCFA</p>
                    </div>
                    <div className="md:text-right">
                       <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Intérêts non perçus</h3>
                       <p className="text-2xl font-bold">
                         {dbActiveCredits.reduce((acc, c) => {
                           const repaid = (c.repayments || []).reduce((ra, r) => ra + (Number(r.interests) || 0), 0);
                           return acc + ((Number(c.intTotal) || 0) - repaid);
                         }, 0).toLocaleString()} FCFA
                       </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Commentaire / Diagnostic */}
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Diagnostic & Commentaire du Portefeuille</h3>
                 <p className={`text-lg font-black leading-tight ${dbPar1Rate > 10 || dbPar30Rate > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                   {dbPar1Rate > 20 || dbPar30Rate > 10 
                     ? "ALERTE CRITIQUE : La qualité du portefeuille est gravement compromise. Le taux d'impayés dépasse largement les limites de sécurité. Une action de recouvrement coercitive et une révision radicale de la politique d'octroi sont impératives."
                     : dbPar1Rate > 10 || dbPar30Rate > 5
                     ? "VIGILANCE : Plusieurs indicateurs de risque sont hors-normes. Le risque de contagion est présent. Il est recommandé de prioriser le suivi des retards de moins de 30 jours pour stabiliser le portefeuille."
                     : "SITUATION SAINE : Le portefeuille présente une excellente tenue. Les indicateurs de risque (PAR) sont conformes aux meilleures pratiques prudentielles du secteur de la microfinance. Continuez le suivi préventif rigoureux."}
                 </p>
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                   <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full ${dbPar1Rate <= 10 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                     <span>Norme PAR 1j (10%): {dbPar1Rate <= 10 ? 'CONFORME' : 'DÉPASSÉE'}</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full ${dbPar30Rate <= 5 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                     <span>Norme PAR 30j (5%): {dbPar30Rate <= 5 ? 'CONFORME' : 'DÉPASSÉE'}</span>
                   </div>
                 </div>
              </div>
            </section>
          )}

          {activeTab === 'new' && !isRestricted && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:hidden">
              <h2 className="text-3xl font-black mb-8 text-slate-900 border-b pb-4">{editingCredit ? "Modifier Dossier de Crédit" : "Nouveau Crédit"}</h2>
              <CreditForm 
                onAddCredit={handleAddCredit} 
                creditToEdit={editingCredit} 
                onUpdateCredit={handleUpdateCredit} 
                readOnly={isRestricted} 
                microfinanceCode={microfinance_code_actif} 
                creditTypes={creditTypes}
                onAddCreditType={(isAdmin || isDirector) ? handleAddCreditTypeProp : undefined}
              />
            </section>
          )}

          {activeTab === 'active' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:border-none">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b pb-4 gap-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-3xl font-black text-slate-900">Crédits Actifs</h2>
                  <div className="flex gap-2">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:hidden">{activeCredits.length} Dossiers</span>
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:hidden">{activeRemainingForFiltered.toLocaleString()} FCFA</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <select value={activeFilterStatus} onChange={(e) => setActiveFilterStatus(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Tous">Tous états</option>
                    <option value="Retard">En retard</option>
                    <option value="Proche">Échéance proche</option>
                    <option value="Sain">Sains</option>
                  </select>
                  <select value={activeFilterType} onChange={(e) => setActiveFilterType(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Tous">Tous types</option>
                    {creditTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={activeFilterZone} onChange={(e) => setActiveFilterZone(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Toutes">Toutes zones</option>
                    {ZONES_LIST.map(z => (<option key={z} value={z}>{z}</option>))}
                  </select>
                </div>
              </div>
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-between print:hidden">
                <div className="flex-1 min-w-[300px]">
                  <input type="text" placeholder="🔍 Rechercher par nom, compte épargne ou tontine..." className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {!isRestricted && (
                  <div className="flex gap-2">
                    <button onClick={() => handleExportTable(filteredActiveCredits, 'credits_actifs.html')} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-700 transition-colors flex items-center gap-2"><span>📥</span> Export</button>
                    <button onClick={handlePrint} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-emerald-500 transition-colors flex items-center gap-2"><span>🖨️</span> Imprimer</button>
                  </div>
                )}
              </div>
              <CreditList 
                credits={filteredActiveCredits} 
                onDeleteCredit={handleDeleteCredit} 
                onEditCredit={handleEditCredit} 
                onAddRepayment={handleAddRepayment} 
                onUpdateRepayment={handleUpdateRepayment} 
                onDeleteRepayment={handleDeleteRepayment} 
                onAddRecoveryAction={handleAddRecoveryAction} 
                onUpdateRecoveryAction={handleUpdateRecoveryAction}
                onDeleteRecoveryAction={handleDeleteRecoveryAction}
                onPrintDossier={handlePrintDossier} 
                onExportDossier={handleExportDossier} 
                userRole={currentUserRole} 
                currentUser={currentUser} 
              />
            </section>
          )}

          {activeTab === 'arrears' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:border-none">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b pb-4 gap-4">
                <h2 className="text-3xl font-black text-red-600 uppercase italic">Crédits en Retard</h2>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <select value={arrearsFilterType} onChange={(e) => setArrearsFilterType(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Tous">Tous types</option>
                    {creditTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={arrearsFilterZone} onChange={(e) => setArrearsFilterZone(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Toutes">Toutes zones</option>
                    {ZONES_LIST.map(z => (<option key={z} value={z}>{z}</option>))}
                  </select>
                   <button onClick={() => handleExportTable(filteredArrearsCredits, 'credits_en_retard.html')} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-700 transition-colors flex items-center gap-2"><span>📥</span> Export</button>
                   <button onClick={handlePrint} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-emerald-500 transition-colors flex items-center gap-2"><span>🖨️</span> Imprimer</button>
                </div>
              </div>
              
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-between print:hidden">
                <div className="flex-1 min-w-[300px]">
                  <input type="text" placeholder="🔍 Rechercher par nom, compte épargne ou tontine..." className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Client / Tél</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Compte / Tontine</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Agent</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase">Cap. Restant</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase">Int. Restant</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Caution (Nom/Tél)</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Échéance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredArrearsCredits.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-gray-400 italic">Aucun crédit en retard trouvé.</td></tr>
                    ) : (
                      filteredArrearsCredits.map(c => {
                        const repaidCap = (c.repayments || []).reduce((acc, r) => acc + (Number(r.capital) || 0), 0);
                        const repaidInt = (c.repayments || []).reduce((acc, r) => acc + (Number(r.interests) || 0), 0);
                        const capRest = (Number(c.creditAccordeChiffre) || 0) - repaidCap;
                        const intRest = (Number(c.intTotal) || 0) - repaidInt;
                        const echeance = c.creditType === 'ORDINAIRE FIDELIA' ? c.dateDernierRemboursement : c.aRembourserLe;
                        return (
                          <tr key={c.id} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-xs font-black text-slate-900 uppercase">{c.clientName}</div>
                              <div className="text-[10px] font-bold text-slate-500">{c.tel}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-[10px] font-black text-slate-800">C: {c.noCompte || '-'}</div>
                              <div className="text-[10px] font-black text-blue-600">T: {c.noCompteTontine || '-'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-[10px] font-black text-slate-700 uppercase">{c.agentCommercial || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-black text-red-600">{capRest.toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-black text-blue-600">{intRest.toLocaleString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-[10px] font-black text-slate-800 uppercase">{c.cautionNom}</div>
                              <div className="text-[10px] font-bold text-slate-500">{c.cautionTel}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-[10px] font-black text-red-700">{echeance || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredArrearsCredits.length > 0 && (
                    <tfoot className="bg-red-50/50">
                      <tr className="font-black text-xs">
                        <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-widest">Totaux de la liste :</td>
                        <td className="px-4 py-4 text-right text-red-600">
                          {filteredArrearsCredits.reduce((acc, c) => acc + ((Number(c.creditAccordeChiffre) || 0) - (c.repayments || []).reduce((ra, r) => ra + (Number(r.capital) || 0), 0)), 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right text-blue-600">
                          {filteredArrearsCredits.reduce((acc, c) => acc + ((Number(c.intTotal) || 0) - (c.repayments || []).reduce((ra, r) => ra + (Number(r.interests) || 0), 0)), 0).toLocaleString()}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}

          {activeTab === 'settled' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:border-none">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b pb-4 gap-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-3xl font-black text-slate-700 italic">Crédits Soldés</h2>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider print:hidden">{settledCredits.length} Dossiers</span>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <select value={settledFilterType} onChange={(e) => setSettledFilterType(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Tous">Tous types</option>
                    {creditTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={settledFilterZone} onChange={(e) => setSettledFilterZone(e.target.value)} className="text-xs border rounded-lg p-2 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                    <option value="Toutes">Toutes zones</option>
                    {ZONES_LIST.map(z => (<option key={z} value={z}>{z}</option>))}
                  </select>
                </div>
              </div>
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-between print:hidden">
                <div className="flex-1 min-w-[300px]">
                  <input type="text" placeholder="🔍 Rechercher par nom, compte épargne ou tontine..." className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {!isRestricted && (
                  <div className="flex gap-2">
                    <button onClick={() => handleExportTable(filteredSettledCredits, 'credits_soldes.html')} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-700 transition-colors flex items-center gap-2"><span>📥</span> Export</button>
                    <button onClick={handlePrint} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-emerald-500 transition-colors flex items-center gap-2"><span>🖨️</span> Imprimer</button>
                  </div>
                )}
              </div>
              <CreditList 
                credits={filteredSettledCredits} 
                onDeleteCredit(credit.id)} 
                onEditCredit={handleEditCredit} 
                onAddRepayment={handleAddRepayment} 
                onUpdateRepayment={handleUpdateRepayment} 
                onDeleteRepayment={handleDeleteRepayment} 
                onAddRecoveryAction={handleAddRecoveryAction} 
                onUpdateRecoveryAction={handleUpdateRecoveryAction}
                onDeleteRecoveryAction={handleDeleteRecoveryAction}
                onPrintDossier={handlePrintDossier} 
                onExportDossier={handleExportDossier} 
                userRole={currentUserRole} 
                currentUser={currentUser} 
              />
            </section>
          )}

          {activeTab === 'forecast' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:border-none">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b pb-4 gap-4">
                <h2 className="text-3xl font-black text-slate-900">Prévisions des Remboursements</h2>
                <div className="flex gap-2 print:hidden">
                  <button onClick={() => handleExportForecast(forecastInstallments, totalForecastAmount)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-700 transition-colors flex items-center gap-2"><span>📥</span> Export</button>
                  <button onClick={handlePrint} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-emerald-500 transition-colors flex items-center gap-2"><span>🖨️</span> Imprimer</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Date Début</label>
                  <input type="date" value={forecastStart} onChange={(e) => setForecastStart(e.target.value)} className="bg-white text-slate-900 border-2 border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Date Fin</label>
                  <input type="date" value={forecastEnd} onChange={(e) => setForecastEnd(e.target.value)} className="bg-white text-slate-900 border-2 border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="mb-8 p-6 bg-emerald-600 text-white rounded-2xl shadow-lg flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-1">Total Attendu sur la période</h3>
                  <p className="text-4xl font-black">{totalForecastAmount.toLocaleString()} FCFA</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black uppercase tracking-widest bg-emerald-500/50 px-3 py-1 rounded-full">{forecastInstallments.length} Remboursements</span>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Échéance</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Dossier / Zone</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {forecastInstallments.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-xs text-gray-400 italic font-bold">Aucun remboursement prévu pour cette période.</td></tr>
                    ) : (
                      forecastInstallments.map((fi, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-blue-600">{fi.dueDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-slate-800 uppercase">{fi.client}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-gray-500 uppercase">{fi.dossierNo} (Zone: {fi.zone})</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black text-emerald-600">{fi.amount.toLocaleString()} FCFA</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'training' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4 uppercase tracking-tight">Espace Conseils & Formation</h2>
              <div className="space-y-12">
                <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center text-center">
                  <span className="text-6xl mb-6 block">🎓</span>
                  <h3 className="text-2xl font-black text-emerald-900 mb-4">Guide d'Utilisation Crédit-Garde</h3>
                  <p className="text-emerald-700 font-bold max-w-2xl leading-relaxed">Ce guide vous accompagne pas à pas dans la maîtrise de votre outil de gestion de portefeuille SFD (Système Financier Décentralisé).</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex items-center space-x-4 mb-6"><div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-black">1</div><h4 className="text-lg font-black text-slate-900 uppercase">Accès et Sécurité</h4></div>
                    <ul className="space-y-3 text-sm text-slate-600 font-medium">
                      <li className="flex items-start"><span className="text-emerald-500 mr-2">•</span> Authentification en deux étapes : saisie du code institutionnel suivi des identifiants personnels.</li>
                      <li className="flex items-start"><span className="text-emerald-500 mr-2">•</span> Déconnexion obligatoire après chaque session pour garantir l'isolation des données.</li>
                      <li className="flex items-start"><span className="text-emerald-500 mr-2">•</span> Respect des plages horaires de désactivation automatique configurées par l'administration.</li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex items-center space-x-4 mb-6"><div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-black">2</div><h4 className="text-lg font-black text-slate-900 uppercase">Saisie des Crédits</h4></div>
                    <ul className="space-y-3 text-sm text-slate-600 font-medium">
                      <li className="flex items-start"><span className="text-emerald-500 mr-2">•</span> Choisissez parmi les types de produits configurés pour votre institution.</li>
                      <li className="flex items-start"><span className="text-emerald-500 mr-2">•</span> Remplissez obligatoirement le Nom du Client et le Montant Accordé (chiffre).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'invitation' && (isAdmin || isDirector) && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-12">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4">Configuration de l'Institution</h2>
                <form className="max-w-3xl space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Nom de l'Institution</label>
                      <input type="text" placeholder="Ex: Microfinance Alpha" className="bg-slate-800 text-white border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold" value={microfinance.name} onChange={(e) => setMicrofinance({...microfinance, name: e.target.value})} />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Adresse</label>
                      <input type="text" placeholder="Ex: Lomé, Rue de la Paix" className="bg-slate-800 text-white border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold" value={microfinance.address} onChange={(e) => setMicrofinance({...microfinance, address: e.target.value})} />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Téléphone</label>
                      <input type="text" placeholder="+228 XX XX XX XX" className="bg-slate-800 text-white border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold" value={microfinance.phone} onChange={(e) => setMicrofinance({...microfinance, phone: e.target.value})} />
                    </div>
                  </div>
                </form>
              </div>

              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4">Gestion des Produits (Types de Crédit)</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6">Ajouter un nouveau type</h3>
                    <form onSubmit={handleAddCreditType} className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom du type</label>
                        <input type="text" value={newCreditTypeName} onChange={(e) => setNewCreditTypeName(e.target.value)} className="bg-slate-800 text-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full font-bold shadow-inner uppercase" placeholder="Ex: SCOLAIRE..." required />
                      </div>
                      <button type="submit" className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-all duration-200 text-xs shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-widest">Ajouter le type</button>
                    </form>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50">
                        <tr><th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Type de Crédit</th><th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {creditTypes.map((type) => (
                          <tr key={type} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 text-xs font-black text-slate-800 uppercase">{type}</td>
                            <td className="px-4 py-4 text-right">
                              {type !== 'ORDINAIRE FIDELIA' && type !== 'MOKPOKPO PRE-PAYER' && (
                                <button onClick={() => handleDeleteCreditType(type)} className="text-red-600 hover:text-red-900 font-bold text-[10px] uppercase">Supprimer</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4">Gestion des Institutions</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6">Ajouter une Microfinance</h3>
                    <form onSubmit={handleAddMicrofinance} className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de l'institution</label>
                        <input type="text" value={newMFName} onChange={(e) => setNewMFName(e.target.value)} className="bg-slate-800 text-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full font-bold shadow-inner" placeholder="Nom (Ex: COOPEC...)" required />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code Institutionnel</label>
                        <input type="text" value={newMFCode} onChange={(e) => setNewMFCode(e.target.value)} className="bg-slate-800 text-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full font-bold shadow-inner uppercase" placeholder="Code unique..." required />
                      </div>
                      <button type="submit" className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-all duration-200 text-xs shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-widest">Créer l'institution</button>
                    </form>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50">
                        <tr><th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Code</th><th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Nom</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {microfinances.map((mf) => (
                          <tr key={mf.code} className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-4 whitespace-nowrap text-xs font-black text-emerald-600 uppercase">{mf.code}</td><td className="px-4 py-4 text-xs font-bold text-slate-800">{mf.name}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'users' && isAdmin && (
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-lg mx-auto print:hidden">
              <div className="p-8 bg-white">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-12 text-center underline decoration-2 underline-offset-8">Ajouter un Utilisateur</h3>
                <form onSubmit={handleAddUser} className="space-y-10">
                  <div className="flex flex-col space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Identifiant</label>
                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-[#1e293b] text-white border-none rounded-2xl p-5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full shadow-inner font-bold" placeholder="Identifiant..." />
                  </div>
                  <div className="flex flex-col space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Rôle</label>
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="bg-[#1e293b] text-white border-none rounded-2xl p-5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full shadow-inner appearance-none cursor-pointer font-bold">
                      <option value="Administrateur">Administrateur</option>
                      <option value="Directeur">Directeur</option>
                      <option value="Opérateur">Opérateur</option>
                      <option value="Agents commerciaux">Agents commerciaux</option>
                      <option value="Autres">Autres</option>
                    </select>
                  </div>
                  {newRole === 'Agents commerciaux' && (
                    <div className="flex flex-col space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Zone</label>
                      <select value={newZone} onChange={(e) => setNewZone(e.target.value)} className="bg-[#1e293b] text-white border-none rounded-2xl p-5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full shadow-inner appearance-none cursor-pointer font-bold">
                        {ZONES_LIST.map(z => (<option key={z} value={z}>{z}</option>))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Code Microfinance</label>
                    <input type="text" value={newUserMicrofinanceCode} onChange={(e) => setNewUserMicrofinanceCode(e.target.value)} className="bg-[#1e293b] text-white border-none rounded-2xl p-5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full shadow-inner font-bold" placeholder="Code MF..." />
                  </div>
                  <div className="flex flex-col space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Mot de passe</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-[#1e293b] text-white border-none rounded-2xl p-5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full shadow-inner font-bold" placeholder="••••" />
                  </div>
                  <button type="submit" className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-5 rounded-2xl transition-all duration-200 text-xs shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-[0.15em]">Ajouter au Système</button>
                </form>
              </div>
            </section>
          )}

          {activeTab === 'activation' && (isAdmin || isDirector) && (
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-lg mx-auto print:hidden">
              <div className="p-8 bg-[#0f172a] text-white">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-10 text-center">Désactivation Automatique</h3>
                <div className="space-y-6">
                  <div className="p-6 bg-[#1e293b] rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
                    <div><h4 className="text-sm font-black tracking-wide">Statut du Planning</h4><p className="text-[10px] text-slate-400 font-bold mt-1">Activer le blocage automatique</p></div>
                    <button onClick={() => setAutoDeactivation({...autoDeactivation, enabled: !autoDeactivation.enabled})} className={`w-16 h-9 rounded-full transition-colors relative flex items-center px-1 ${autoDeactivation.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                      <div className={`w-7 h-7 bg-white rounded-full shadow-lg transform transition-transform ${autoDeactivation.enabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Jours de désactivation</label>
                    <div className="flex flex-wrap gap-2">
                      {['D', 'L', 'M', 'Me', 'J', 'V', 'S'].map((label, index) => (
                        <button key={index} onClick={() => handleAutoDeactivationToggleDay(index)} className={`w-9 h-9 rounded-lg text-[10px] font-black transition-all ${autoDeactivation.days.includes(index) ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1e293b] p-4 rounded-3xl border border-slate-700">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Début</label>
                      <input type="time" value={autoDeactivation.startTime} onChange={(e) => setAutoDeactivation({...autoDeactivation, startTime: e.target.value})} className="bg-slate-800 border-none rounded-xl p-2 text-center w-full text-xs font-black text-emerald-400 outline-none" />
                    </div>
                    <div className="bg-[#1e293b] p-4 rounded-3xl border border-slate-700">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Fin</label>
                      <input type="time" value={autoDeactivation.endTime} onChange={(e) => setAutoDeactivation({...autoDeactivation, endTime: e.target.value})} className="bg-slate-800 border-none rounded-xl p-2 text-center w-full text-xs font-black text-emerald-400 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-white border-t border-slate-50">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 text-center">Gestion Manuelle</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                      <tr><th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">User</th><th className="px-4 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Rôle / Zone</th><th className="px-4 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">État</th><th className="px-4 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Actions</th></tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {users.filter(u => u.microfinance_code === microfinance_code_actif).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-5 whitespace-nowrap text-sm font-black text-slate-800">{u.username}</td>
                          <td className="px-4 py-5 whitespace-nowrap text-[10px] font-black text-slate-600 uppercase">{u.role} {u.zone ? `(${u.zone})` : ''}</td>
                          <td className="px-4 py-5 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[8px] font-black uppercase ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Actif' : 'Off'}</span>
                          </td>
                          <td className="px-4 py-5 whitespace-nowrap text-right text-[10px] font-black space-x-3">
                            <button onClick={() => toggleUserActivation(u.id)} className="text-orange-600 uppercase font-black">{u.isActive ? 'Désactiver' : 'Activer'}</button>
                            {isAdmin && <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 uppercase font-black">X</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'logs' && canSeeLogs && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h2 className="text-3xl font-black text-slate-900">Historique des Activités</h2>
                <button 
                  onClick={handleClearLogs}
                  className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20"
                >
                  Vider l'historique
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr><th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Date & Heure</th><th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Utilisateur</th><th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Action</th><th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">Détails</th><th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase">Actions</th></tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">{log.timestamp}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs font-black text-slate-900">{log.username}</td>
                        <td className="px-4 py-4 text-xs font-black text-blue-700">{log.action}</td>
                        <td className="px-4 py-4 text-xs text-gray-700 max-w-xs truncate font-medium">{log.details || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right"><button onClick={() => handleDeleteLog(log.id)} className="text-red-500 font-black text-[10px] uppercase">Supprimer</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'migration' && (isAdmin || isDirector) && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4 uppercase tracking-tight">Migration de Données</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-4">Exporter les Données</h3>
                  <p className="text-xs text-slate-500 mb-4 font-bold uppercase">Sauvegardez l'intégralité de cette institution dans un fichier JSON pour migration ou backup.</p>
                  <button 
                    onClick={() => {
                      const data = { credits, users, logs, microfinance, auto_deactivation: autoDeactivation, credit_types: creditTypes };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `migration_${microfinance_code_actif}_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      if (currentUser && currentUserRole) addLog('Exportation de migration effectuée', currentUser, currentUserRole);
                    }}
                    className="w-full bg-slate-800 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    📥 Télécharger l'export JSON
                  </button>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <h3 className="text-sm font-black text-orange-600 uppercase tracking-widest mb-4">Importer les Données</h3>
                  <p className="text-xs text-slate-500 mb-4 font-bold uppercase">Attention : L'importation remplacera les données actuelles de cette institution.</p>
                  <textarea 
                    id="importData"
                    placeholder="Collez le contenu du fichier JSON ici..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono mb-4 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner"
                  ></textarea>
                  <input
                    type="file"
                    id="importFileInput"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          const area = document.getElementById('importData') as HTMLTextAreaElement;
                          if (area) area.value = content;
                        };
                        reader.readAsText(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        document.getElementById('importFileInput')?.click();
                      }}
                      className="w-full bg-orange-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                      📥 Importer
                    </button>
                    <button 
                      onClick={() => {
                        const activeCode = microfinance_code_actif || '';
                        const area = document.getElementById('importData') as HTMLTextAreaElement;
                        
                        const applyImport = async (jsonStr: string) => {
                          try {
                            const imported = JSON.parse(jsonStr);
                            if (window.confirm("Voulez-vous vraiment écraser les données actuelles par cet import ? Cette action est irréversible.")) {
                              
                              // Désactivation temporaire de la synchronisation automatique pendant l'import
                              setIsInitialLoadDone(false);

                              const finalCredits = imported.credits?.map((c: any) => ({
                                ...c,
                                microfinance_code: activeCode,
                                repayments: (c.repayments || []).map((r: any) => ({ ...r, microfinance_code: activeCode })),
                                recoveryActions: (c.recoveryActions || []).map((ra: any) => ({ ...ra, microfinance_code: activeCode }))
                              })) || [];

                              const finalUsers = imported.users?.map((u: any) => ({ ...u, microfinance_code: activeCode })) || [];
                              const finalLogs = imported.logs?.map((l: any) => ({ ...l, microfinance_code: activeCode })) || [];
                              const finalMF = imported.microfinance || microfinance;
                              const finalAuto = imported.auto_deactivation || autoDeactivation;
                              const finalTypes = imported.credit_types || creditTypes;

                              // Persistance locale immédiate
                              localStorage.setItem(`cg_${activeCode}_credits`, JSON.stringify(finalCredits));
                              localStorage.setItem(`cg_${activeCode}_users`, JSON.stringify(finalUsers));
                              localStorage.setItem(`cg_${activeCode}_logs`, JSON.stringify(finalLogs));
                              localStorage.setItem(`cg_${activeCode}_microfinance`, JSON.stringify(finalMF));
                              localStorage.setItem(`cg_${activeCode}_auto_deactivation`, JSON.stringify(finalAuto));
                              localStorage.setItem(`cg_${activeCode}_credit_types`, JSON.stringify(finalTypes));

                              // Mise à jour des états
                              setCredits(finalCredits);
                              setUsers(finalUsers);
                              setLogs(finalLogs);
                              setMicrofinance(finalMF);
                              setAutoDeactivation(finalAuto);
                              setCreditTypes(finalTypes);

                              // Synchronisation Supabase atomique unique forcée
                              const payload = {
                                code: activeCode,
                                credits: finalCredits,
                                users: finalUsers,
                                logs: finalLogs,
                                microfinance: finalMF,
                                auto_deactivation: finalAuto,
                                credit_types: finalTypes
                              };

                              await syncWithSupabase(payload);
                              
                              // Réactivation des hooks après la fin de l'opération asynchrone
                              setIsInitialLoadDone(true);

                              alert("Restauration réussie ! Les données ont été restaurées avec succès.");
                              if (currentUser && currentUserRole) addLog('Restauration effectuée', currentUser, currentUserRole);
                              if (area) area.value = '';
                            }
                          } catch (err) {
                            setIsInitialLoadDone(true);
                            alert("Échec de la restauration : Le format JSON est invalide ou une erreur réseau est survenue.");
                          }
                        };

                        if (area && area.value.trim()) {
                          applyImport(area.value);
                        } else {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.json';
                          input.onchange = (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => applyImport(event.target?.result as string);
                              reader.readAsText(file);
                            }
                          };
                          input.click();
                        }
                      }}
                      className="w-full bg-orange-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                      📤 Restaurer
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'developer' && isAdmin && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-3xl font-black text-slate-900 mb-8 border-b pb-4 uppercase tracking-tight">Espace Développeur</h2>
              <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 text-white flex flex-col items-center justify-center text-center shadow-xl">
                <span className="text-6xl mb-4">👨‍💻</span>
                <div>
                  <h3 className="text-lg font-black text-emerald-400 mb-2">Instance Active: {microfinance_code_actif}</h3>
                  <div className="mb-4 flex items-center justify-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${isSyncError ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    <span className="text-xs font-bold uppercase tracking-widest">{isSyncError ? 'Lien Supabase Interrompu' : 'Lien Supabase Opérationnel'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-800/50 p-4 rounded-xl">
                    <div>Crédits: <span className="text-white ml-1">{credits.length}</span></div>
                    <div>Users: <span className="text-white ml-1">{users.length}</span></div>
                    <div>Logs: <span className="text-white ml-1">{logs.length}</span></div>
                  </div>
                </div>
                <p className="mt-6 text-[11px] font-medium text-slate-300">Isolation des données par Microfinance opérationnelle.</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
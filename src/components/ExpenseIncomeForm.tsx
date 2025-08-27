import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Tag, User, Wallet, FileText, ChevronDown, CheckCircle, Edit, Copy, Loader2, AlertTriangle, FilePlus } from 'lucide-react';
import { EXPENSE_CATEGORIES, FIXED_EXPENSE_OPTIONS, VIATICOS_OPTIONS, TRANSACTION_TYPES } from '../constants';
import { supabase } from '../supabaseClient';

// Define la interfaz para los datos de un ingreso tal como vienen de Supabase
interface IncomeData {
  id: number;
  receipt_number: string;
  dni: string;
  full_name: string;
  amount: number;
  account: string;
  date: string;
  transaction_type: 'ingreso' | 'anulacion' | 'devolucion';
  created_at: string;
}

// Define la interfaz para los datos de una persona (ahora colaborador)
interface Person {
  id: string;
  name: string;
}

// Define la interfaz para los datos de una cuenta
interface Account {
  id: string;
  name: string;
}

interface FormData {
  type: 'expense' | 'income';
  amount: number | '';
  account: string;
  date: string;

  // Expense-specific fields (optional for income)
  numeroGasto?: string; // New: To store the GA001 format
  category?: string;
  subCategory?: string;
  person?: string; // Ahora será el 'name' del colaborador
  description?: string;

  // Income-specific fields (optional for expense)
  receiptNumber?: string; // Manual for income
  fullName?: string;
  dni?: string;
  transactionType?: 'ingreso' | 'anulacion' | 'devolucion';
  incomeId?: number; // New: To store the ID of an existing income when editing
}

const ExpenseIncomeForm: React.FC = () => {
  const [expenseCounter, setExpenseCounter] = useState(1);
  const [incomeCounter, setIncomeCounter] = useState(1);
  const [isExpenseCounterLoading, setIsExpenseCounterLoading] = useState(true); // NEW: Estado de carga para el contador de gastos
  const [peopleList, setPeopleList] = useState<Person[]>([]); // Nuevo estado para la lista de colaboradores
  const [isPeopleLoading, setIsPeopleLoading] = useState(true); // Estado de carga para colaboradores
  const [peopleError, setPeopleError] = useState<string | null>(null); // Estado de error para colaboradores

  const [accountsList, setAccountsList] = useState<Account[]>([]); // Nuevo estado para la lista de cuentas
  const [isAccountsLoading, setIsAccountsLoading] = useState(true); // Estado de carga para cuentas
  const [accountsError, setAccountsError] = useState<string | null>(null); // Estado de error para cuentas

  const formatId = (count: number, type: 'expense' | 'income') => {
    const prefix = type === 'expense' ? 'GA' : 'IG'; // IG is not used for income, but kept for consistency
    const paddedCount = String(count).padStart(3, '0');
    return `${prefix}${paddedCount}`;
  };

  const [formData, setFormData] = useState<FormData>(() => ({
    type: 'expense',
    numeroGasto: formatId(1, 'expense'), // Initialize with GA001 format (will be updated by useEffect)
    category: '',
    subCategory: '',
    description: '',
    amount: '',
    account: '',
    person: '',
    date: new Date().toISOString().split('T')[0],
  }));

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States for DNI lookup
  const [isDniLoading, setIsDniLoading] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);

  // New states for Receipt Number lookup
  const [isReceiptNumberLoading, setIsReceiptNumberLoading] = useState(false);
  const [receiptNumberError, setReceiptNumberError] = useState<string | null>(null);
  const [existingIncomeForEdit, setExistingIncomeForEdit] = useState<IncomeData | null>(null);
  const [isEditingExistingIncome, setIsEditingExistingIncome] = useState(false);

  // NEW: Efecto para cargar el último numero_gasto de la base de datos
  useEffect(() => {
    const fetchLastExpenseId = async () => {
      setIsExpenseCounterLoading(true);
      try {
        const { data, error } = await supabase
          .from('gastos')
          .select('numero_gasto')
          .order('created_at', { ascending: false }) // Obtener el más reciente
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 significa que no se encontraron filas
          throw error;
        }

        if (data && data.numero_gasto) {
          const lastNumber = parseInt(data.numero_gasto.replace('GA', ''), 10);
          if (!isNaN(lastNumber)) {
            setExpenseCounter(lastNumber + 1);
          } else {
            console.warn('No se pudo parsear el último número de gasto de la base de datos:', data.numero_gasto);
            setExpenseCounter(1); // Fallback si el parseo falla
          }
        } else {
          setExpenseCounter(1); // No hay gastos existentes, empezar desde 1
        }
      } catch (error: any) {
        console.error('Error al obtener el último ID de gasto de Supabase:', error.message);
        setExpenseCounter(1); // Fallback en caso de error
      } finally {
        setIsExpenseCounterLoading(false);
      }
    };

    fetchLastExpenseId();
  }, []); // Se ejecuta solo una vez al montar el componente

  // Efecto para cargar la lista de colaboradores al montar el componente
  useEffect(() => {
    const fetchPeople = async () => {
      setIsPeopleLoading(true);
      setPeopleError(null);
      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }
        setPeopleList(data || []);
      } catch (error: any) {
        console.error('Error fetching collaborators:', error.message);
        setPeopleError('Error al cargar la lista de colaboradores.');
      } finally {
        setIsPeopleLoading(false);
      }
    };

    fetchPeople();
  }, []); // Se ejecuta solo una vez al montar el componente

  // Efecto para cargar la lista de cuentas al montar el componente
  useEffect(() => {
    const fetchAccounts = async () => {
      setIsAccountsLoading(true);
      setAccountsError(null);
      try {
        const { data, error } = await supabase
          .from('cuentas')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }
        setAccountsList(data || []);
      } catch (error: any) {
        console.error('Error fetching accounts:', error.message);
        setAccountsError('Error al cargar la lista de cuentas.');
      } finally {
        setIsAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, []); // Se ejecuta solo una vez al montar el componente


  useEffect(() => {
    if (formData.type === 'expense') {
      setFormData(prev => ({
        ...prev,
        numeroGasto: formatId(expenseCounter, 'expense'), // Update numeroGasto
      }));
    }
  }, [formData.type, expenseCounter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | React.ChangeEvent<HTMLSelectElement> | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: name === 'amount' ? (value === '' ? '' : parseFloat(value)) : value,
      };

      if (name === 'dni') {
        newState.fullName = '';
        setDniError(null); // Clear DNI error when DNI input changes
      }
      if (name === 'receiptNumber') {
        setReceiptNumberError(null);
        setExistingIncomeForEdit(null);
        setIsEditingExistingIncome(false); // Reset editing state if receipt number changes
      }
      return newState;
    });
  };

  const handleTypeChange = (type: 'expense' | 'income') => {
    setFormData(prev => {
      const commonFields = {
        type,
        amount: '',
        account: '',
        date: new Date().toISOString().split('T')[0],
      };

      if (type === 'expense') {
        return {
          ...commonFields,
          numeroGasto: formatId(expenseCounter, 'expense'), // Initialize numeroGasto
          category: '',
          subCategory: '',
          description: '',
          person: '', // Reset person
          receiptNumber: undefined,
          fullName: undefined,
          dni: undefined,
          transactionType: undefined,
          incomeId: undefined, // Clear incomeId
        };
      } else { // type === 'income'
        return {
          ...commonFields,
          numeroGasto: undefined, // Clear numeroGasto for income
          category: undefined,
          subCategory: undefined,
          description: undefined,
          person: undefined,
          receiptNumber: '',
          fullName: '',
          dni: '',
          transactionType: '',
          incomeId: undefined, // Clear incomeId
        };
      }
    });
    setSubmitMessage(null);
    setDniError(null);
    setIsDniLoading(false);
    setReceiptNumberError(null); // Clear receipt number error
    setExistingIncomeForEdit(null); // Clear existing income data
    setIsReceiptNumberLoading(false); // Clear receipt number loading
    setIsEditingExistingIncome(false); // Clear editing state
  };

  const handleDniLookup = useCallback(async () => {
    const dni = formData.dni;
    if (!dni || dni.length !== 8) {
      setFormData(prev => ({ ...prev, fullName: '' }));
      setDniError(null);
      console.log('DEBUG: DNI invalid or empty, dniError set to null.'); // ADDED LOG
      return;
    }

    setIsDniLoading(true);
    setDniError(null); // Clear any previous DNI error before lookup
    console.log('DEBUG: Starting DNI lookup for:', dni, 'dniError cleared.'); // ADDED LOG

    try {
      const { data, error } = await supabase
        .from('socio_titulares')
        .select('nombres, apellidoPaterno, apellidoMaterno')
        .eq('dni', dni)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        const fullName = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
        setFormData(prev => ({ ...prev, fullName }));
        setDniError(null); // DNI found, no error
        console.log('DEBUG: DNI found, full name:', fullName, 'dniError state after lookup:', null); // ADDED LOG
      } else {
        setFormData(prev => ({ ...prev, fullName: '' }));
        const errorMessage = 'DNI no encontrado. Por favor, ingresa el nombre completo manualmente.';
        setDniError(errorMessage); // DNI not found, set error
        console.log('DEBUG: DNI not found, setting error. dniError state after lookup:', errorMessage); // ADDED LOG
      }
    } catch (error: any) {
      console.error('Error fetching DNI data:', error.message);
      setFormData(prev => ({ ...prev, fullName: '' }));
      const errorMessage = `Error al buscar DNI: ${error.message}`;
      setDniError(errorMessage); // Error during lookup
      console.log('DEBUG: DNI lookup error. dniError state after lookup:', errorMessage); // ADDED LOG
    } finally {
      setIsDniLoading(false);
    }
  }, [formData.dni]);

  const handleReceiptNumberLookup = useCallback(async () => {
    const receiptNumber = formData.receiptNumber;
    if (!receiptNumber || formData.type !== 'income' || isEditingExistingIncome) {
      setReceiptNumberError(null);
      setExistingIncomeForEdit(null);
      return;
    }

    setIsReceiptNumberLoading(true);
    setReceiptNumberError(null);
    setExistingIncomeForEdit(null);

    try {
      const { data, error } = await supabase
        .from('ingresos') // Usar 'ingresos'
        .select('*')
        .eq('receipt_number', receiptNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        setReceiptNumberError('Este número de recibo ya existe.');
        setExistingIncomeForEdit(data as IncomeData);
      } else {
        setReceiptNumberError(null);
        setExistingIncomeForEdit(null);
      }
    } catch (error: any) {
      console.error('Error fetching receipt number data:', error.message);
      setReceiptNumberError(`Error al buscar recibo: ${error.message}`);
    } finally {
      setIsReceiptNumberLoading(false);
    }
  }, [formData.receiptNumber, formData.type, isEditingExistingIncome]);

  const handleLoadExistingIncomeForEdit = () => {
    if (existingIncomeForEdit) {
      setFormData({
        type: 'income',
        receiptNumber: existingIncomeForEdit.receipt_number,
        dni: existingIncomeForEdit.dni,
        fullName: existingIncomeForEdit.full_name,
        amount: existingIncomeForEdit.amount,
        account: existingIncomeForEdit.account,
        date: existingIncomeForEdit.date,
        transactionType: existingIncomeForEdit.transaction_type,
        incomeId: existingIncomeForEdit.id, // Store the ID for update
        numeroGasto: undefined, // Ensure numeroGasto is cleared for income
      });
      setIsEditingExistingIncome(true);
      setReceiptNumberError(null); // Clear error message
      setExistingIncomeForEdit(null); // Clear the stored data as it's now in formData
      setSubmitMessage(null); // Clear any previous submit messages
      setDniError(null); // Clear DNI error if any when loading for edit
    }
  };

  const handleClearReceiptNumber = () => {
    setFormData(prev => ({
      ...prev,
      receiptNumber: '',
      fullName: '', // Clear related fields too
      dni: '',
      transactionType: '',
      incomeId: undefined,
    }));
    setReceiptNumberError(null);
    setExistingIncomeForEdit(null);
    setIsEditingExistingIncome(false);
    setDniError(null); // Clear DNI error if any
    setSubmitMessage(null); // Clear any previous submit messages
  };


  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    setShowConfirmation(true);
  };

  // Helper function to parse full name into its components
  const parseFullName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/); // Split by one or more spaces

    let nombres = '';
    let apellidoPaterno = '';
    let apellidoMaterno = '';

    if (parts.length >= 3) {
      // Assume last part is maternal, second to last is paternal, rest are names
      apellidoMaterno = parts[parts.length - 1];
      apellidoPaterno = parts[parts.length - 2];
      nombres = parts.slice(0, parts.length - 2).join(' ');
    } else if (parts.length === 2) {
      // Assume last part is paternal, first is name
      apellidoPaterno = parts[parts.length - 1];
      nombres = parts.slice(0, parts.length - 1).join(' ');
    } else if (parts.length === 1) {
      // Only one part, assume it's a name
      nombres = parts[0];
    }
    // If parts.length is 0, all will remain empty strings, which is fine.

    return { nombres, apellidoPaterno, apellidoMaterno };
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      if (formData.type === 'expense') {
        const expensePayload = {
          // 'id' (UUID) will be generated by Supabase automatically
          numero_gasto: formData.numeroGasto, // Use the GA001 format here
          amount: formData.amount,
          account: formData.account,
          date: formData.date,
          category: formData.category,
          sub_category: formData.subCategory,
          person: formData.person,
          description: formData.description,
        };
        console.log('DEBUG: Attempting to insert expense with payload:', expensePayload);

        const { data, error } = await supabase
          .from('gastos')
          .insert([expensePayload])
          .select(); // Use .select() to get the generated UUID and other fields

        if (error) {
          console.error('Supabase error inserting expense:', error);
          throw error;
        }
        console.log('Gasto registrado en Supabase:', data);
        setSubmitMessage({ type: 'success', text: 'Gasto registrado exitosamente.' });

        const newExpenseCounter = expenseCounter + 1;
        setExpenseCounter(newExpenseCounter);
        setFormData({
          type: 'expense',
          numeroGasto: formatId(newExpenseCounter, 'expense'), // Update numeroGasto for next entry
          category: '',
          subCategory: '',
          description: '',
          amount: '',
          account: '',
          person: '',
          date: new Date().toISOString().split('T')[0],
          receiptNumber: undefined,
          fullName: undefined,
          dni: undefined,
          transactionType: undefined,
          incomeId: undefined,
        });

      } else { // formData.type === 'income'
        console.log('Attempting income submission.');
        console.log('DEBUG: Current state for socio_titular check:');
        console.log('DEBUG: dniError:', dniError, 'typeof dniError:', typeof dniError);
        console.log('DEBUG: formData.dni:', formData.dni);
        console.log('DEBUG: formData.fullName:', formData.fullName);
        console.log('DEBUG: isEditingExistingIncome:', isEditingExistingIncome);


        // --- Logic to create new socio_titular if DNI not found and name manually entered ---
        // This condition should only be met if dniError is a string (DNI not found) AND we are not editing an existing income
        if (dniError && typeof dniError === 'string' && formData.dni && formData.fullName && !isEditingExistingIncome) {
          console.log('Condition met to create new socio_titular. Proceeding with insertion.');
          const { nombres, apellidoPaterno, apellidoMaterno } = parseFullName(formData.fullName);
          console.log('Parsed Full Name:', { nombres, apellidoPaterno, apellidoMaterno });

          try {
            const socioPayload = {
              dni: formData.dni,
              nombres: nombres,
              apellidoPaterno: apellidoPaterno,
              apellidoMaterno: apellidoMaterno,
              edad: null,
            };
            console.log('DEBUG: Attempting to insert new socio_titular with payload:', socioPayload);

            const { data: insertedSocioData, error: insertSocioError } = await supabase
              .from('socio_titulares')
              .insert([socioPayload])
              .select(); // Added .select() here for socio_titulares as well

            if (insertSocioError) {
              if (insertSocioError.code === '23505') {
                console.warn('Socio_titular con este DNI ya existe, se omite la creación.');
              } else {
                console.error('Supabase error inserting socio_titular:', insertSocioError);
                throw insertSocioError;
              }
            } else {
              console.log('Nuevo socio_titular creado exitosamente. Data from Supabase:', insertedSocioData);
            }
          } catch (error: any) {
            console.error('Error al crear nuevo socio_titular (catch block):', error.message);
          }
        } else {
          console.log('Condition NOT met to create new socio_titular. Skipping insertion.');
          if (!dniError) console.log('Reason for skipping: dniError is falsy (null/undefined/empty string).');
          if (typeof dniError !== 'string') console.log('Reason for skipping: dniError is not a string.');
          if (!formData.dni) console.log('Reason for skipping: formData.dni is falsy.');
          if (!formData.fullName) console.log('Reason for skipping: formData.fullName is falsy.');
          if (isEditingExistingIncome) console.log('Reason for skipping: Currently editing an existing income.');
        }
        // --- End of socio_titular creation logic ---


        if (isEditingExistingIncome && formData.incomeId) {
          // Update existing income
          const { data, error } = await supabase
            .from('ingresos') // Usar 'ingresos'
            .update({
              dni: formData.dni,
              full_name: formData.fullName,
              amount: formData.amount,
              account: formData.account,
              date: formData.date,
              transaction_type: formData.transactionType,
            })
            .eq('id', formData.incomeId)
            .select(); // Added .select() for update as well

          if (error) throw error;
          console.log('Ingreso actualizado en Supabase. Data from Supabase:', data);
          setSubmitMessage({ type: 'success', text: 'Ingreso actualizado exitosamente.' });

        } else {
          // Insert new income
          const { data, error } = await supabase
            .from('ingresos') // Usar 'ingresos'
            .insert([
              {
                receipt_number: formData.receiptNumber,
                dni: formData.dni,
                full_name: formData.fullName,
                amount: formData.amount,
                account: formData.account,
                date: formData.date,
                transaction_type: formData.transactionType,
              },
            ])
            .select(); // <-- AÑADIDO .select() aquí

          if (error) throw error;
          console.log('Ingreso registrado en Supabase. Data from Supabase:', data); // Ahora 'data' contendrá el registro insertado
          setSubmitMessage({ type: 'success', text: 'Ingreso registrado exitosamente.' });
        }

        // Reset form for next income (or after update)
        const newIncomeCounter = incomeCounter + 1;
        setIncomeCounter(newIncomeCounter);
        setFormData({
          type: 'income',
          numeroGasto: undefined, // Clear numeroGasto for income
          receiptNumber: '',
          fullName: '',
          dni: '',
          transactionType: '',
          amount: '',
          account: '',
          date: new Date().toISOString().split('T')[0],
          category: undefined,
          subCategory: undefined,
          description: undefined,
          person: undefined,
          incomeId: undefined,
        });
        setDniError(null);
        setReceiptNumberError(null);
        setExistingIncomeForEdit(null);
        setIsEditingExistingIncome(false);
      }
    } catch (error: any) {
      console.error('Error al registrar/actualizar movimiento en Supabase:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al registrar/actualizar: ${error.message}` });
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const getCategoryLabel = (value: string | undefined, options: { value: string; label: string }[]) => {
    if (!value) return '';
    return options.find(opt => opt.value === value)?.label || value;
  };

  const renderExpenseCategoryFields = () => {
    return (
      <>
        <div className="relative">
          <label htmlFor="category" className="block text-textSecondary text-sm font-medium mb-2">Categoría de Gasto</label>
          <div className="relative">
            <select
              id="category"
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              className="w-full p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
              required
            >
              <option value="" disabled>Selecciona una categoría</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
          </div>
        </div>

        {formData.category === 'fixed' && (
          <div className="relative">
            <label htmlFor="subCategory" className="block text-textSecondary text-sm font-medium mb-2">Tipo de Gasto Fijo</label>
            <div className="relative">
              <select
                id="subCategory"
                name="subCategory"
                value={formData.subCategory || ''}
                onChange={handleChange}
                className="w-full p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
                required
              >
                <option value="" disabled>Selecciona un tipo</option>
                {FIXED_EXPENSE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
            </div>
          </div>
        )}

        {formData.category === 'viaticos' && (
          <div className="relative">
            <label htmlFor="subCategory" className="block text-textSecondary text-sm font-medium mb-2">Tipo de Viático</label>
            <div className="relative">
              <select
                id="subCategory"
                name="subCategory"
                value={formData.subCategory || ''}
                onChange={handleChange}
                className="w-full p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
                required
              >
                <option value="" disabled>Selecciona un tipo</option>
                {VIATICOS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
            </div>
          </div>
        )}
      </>
    );
  };

  const renderIncomeInitialFields = () => {
    return (
      <>
        {/* 1. Número de Recibo */}
        <div className="relative">
          <label htmlFor="receiptNumber" className="block text-textSecondary text-sm font-medium mb-2">Número de Recibo</label>
          <div className="relative flex items-center">
            <Tag className="absolute left-3 text-textSecondary" size={20} />
            <input
              type="text"
              id="receiptNumber"
              name="receiptNumber"
              value={formData.receiptNumber || ''}
              onChange={handleChange}
              onBlur={handleReceiptNumberLookup} // Trigger lookup on blur
              className={`w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out ${
                isEditingExistingIncome ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder="Ej. REC00123"
              required
              readOnly={isEditingExistingIncome} // Read-only when editing an existing income
            />
            {isReceiptNumberLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" size={20} />
            )}
          </div>
          {receiptNumberError && (
            <div className="mt-2 animate-fade-in">
              {/* This is the "box" for the error message and actions */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm relative">
                {/* Top row: Alert icon and error message */}
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
                  <p className="font-medium flex-grow">{receiptNumberError}</p>
                </div>

                {/* Details section, directly below the error text */}
                {existingIncomeForEdit && (
                  <div className="bg-surface/50 p-2 rounded-md border border-border/50 text-text mt-1 text-xs">
                    <p><strong className="text-textSecondary">Recibo:</strong> {existingIncomeForEdit.receipt_number}</p>
                    <p><strong className="text-textSecondary">DNI:</strong> {existingIncomeForEdit.dni}</p>
                    <p><strong className="text-textSecondary">Nombre:</strong> {existingIncomeForEdit.full_name}</p>
                    <p><strong className="text-textSecondary">Monto:</strong> <span className="font-bold">${existingIncomeForEdit.amount}</span></p>
                    <p><strong className="text-textSecondary">Tipo:</strong> {getCategoryLabel(existingIncomeForEdit.transaction_type, TRANSACTION_TYPES)}</p>
                  </div>
                )}

                {/* Bottom row: Minimalist buttons, only if existingIncomeForEdit */}
                {existingIncomeForEdit && (
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      type="button"
                      onClick={handleLoadExistingIncomeForEdit}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md border border-primary text-primary hover:bg-primary hover:text-white transition-colors duration-200"
                    >
                      <Edit size={14} /> Editar recibo
                    </button>
                    <button
                      type="button"
                      onClick={handleClearReceiptNumber}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md border border-textSecondary text-textSecondary hover:bg-textSecondary hover:text-white transition-colors duration-200"
                    >
                      <FilePlus size={14} /> Recibo nuevo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. DNI */}
        <div className="relative">
          <label htmlFor="dni" className="block text-textSecondary text-sm font-medium mb-2">DNI</label>
          <div className="relative flex items-center">
            <FileText className="absolute left-3 text-textSecondary" size={20} />
            <input
              type="text"
              id="dni"
              name="dni"
              value={formData.dni || ''}
              onChange={handleChange}
              onBlur={handleDniLookup}
              className="w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out"
              placeholder="Ej. 12345678"
              maxLength={8}
              required
            />
            {isDniLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" size={20} />
            )}
          </div>
          {dniError && <p className="text-error text-xs mt-1">{dniError}</p>}
        </div>

        {/* 3. Full Name - Full width (md:col-span-2) */}
        <div className="relative md:col-span-2">
          <label htmlFor="fullName" className="block text-textSecondary text-sm font-medium mb-2">Nombre Completo</label>
          <div className="relative flex items-center">
            <User className="absolute left-3 text-textSecondary" size={20} />
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName || ''}
              onChange={handleChange}
              readOnly={!!formData.dni && !dniError && !isDniLoading && formData.fullName !== ''}
              className={`w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out ${
                (!!formData.dni && !dniError && !isDniLoading && formData.fullName !== '') ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder="Nombre Apellido"
              required
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-surface rounded-xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-2xl border border-border animate-fade-in">
        {/* Se ha eliminado el div con el icono DollarSign */}
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-primary mb-2 leading-tight">
          Registro de <span className="text-accent">Movimientos</span>
        </h2>

        {submitMessage && (
          <div className={`p-4 mb-6 rounded-xl text-center font-semibold ${
            submitMessage.type === 'success' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
          }`}>
            {submitMessage.text}
          </div>
        )}

        {!showConfirmation ? (
          <>
            <div className="flex justify-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out
                  ${formData.type === 'expense'
                    ? 'bg-error text-white shadow-lg shadow-error/30 transform scale-105'
                    : 'bg-surface text-textSecondary hover:bg-border hover:text-text'
                  }`}
              >
                <TrendingDown size={20} /> Gasto
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ease-in-out
                  ${formData.type === 'income'
                    ? 'bg-success text-white shadow-lg shadow-success/30 transform scale-105'
                    : 'bg-surface text-textSecondary hover:bg-border hover:text-text'
                  }`}
              >
                <TrendingUp size={20} /> Ingreso
              </button>
            </div>

            {formData.type === 'expense' && (
              <div className="flex items-center gap-2 mb-6 justify-start">
                <span className="text-xl font-bold text-accent font-mono">
                  {isExpenseCounterLoading ? 'Cargando ID...' : formData.numeroGasto} {/* Mostrar estado de carga */}
                </span>
                {!isExpenseCounterLoading && formData.numeroGasto && ( // Solo mostrar botón de copiar si no está cargando y hay un ID
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(formData.numeroGasto || '')}
                    className="p-1 rounded-md hover:bg-border transition-colors duration-200"
                    title="Copiar ID"
                  >
                    <Copy size={20} className="text-textSecondary" />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handlePreviewSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.type === 'expense' && (
                <>
                  <div className="relative">
                    <label htmlFor="amount" className="block text-textSecondary text-sm font-medium mb-2">Monto</label>
                    <div className="relative flex items-center">
                      <DollarSign className="absolute left-3 text-textSecondary" size={20} />
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out"
                        placeholder="0.00"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="account" className="block text-textSecondary text-sm font-medium mb-2">Cuenta</label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
                      <select
                        id="account"
                        name="account"
                        value={formData.account}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
                        required
                        disabled={isAccountsLoading}
                      >
                        <option value="" disabled>
                          {isAccountsLoading ? 'Cargando cuentas...' : (accountsError ? 'Error al cargar' : 'Selecciona una cuenta')}
                        </option>
                        {accountsList.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
                    </div>
                    {accountsError && <p className="text-error text-xs mt-1">{accountsError}</p>}
                  </div>

                  {renderExpenseCategoryFields()}

                  <div className="relative">
                    <label htmlFor="date" className="block text-textSecondary text-sm font-medium mb-2">Fecha</label>
                    <div className="relative flex items-center">
                      <Calendar className="absolute left-3 text-textSecondary" size={20} />
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="person" className="block text-textSecondary text-sm font-medium mb-2">Colaborador</label> {/* Etiqueta actualizada */}
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
                      <select
                        id="person"
                        name="person"
                        value={formData.person || ''}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
                        required
                        disabled={isPeopleLoading} // Deshabilitar mientras carga
                      >
                        <option value="" disabled>
                          {isPeopleLoading ? 'Cargando colaboradores...' : (peopleError ? 'Error al cargar' : 'Selecciona un colaborador')}
                        </option>
                        {peopleList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
                    </div>
                    {peopleError && <p className="text-error text-xs mt-1">{peopleError}</p>}
                  </div>

                  <div className="relative md:col-span-2">
                    <label htmlFor="description" className="block text-textSecondary text-sm font-medium mb-2">Descripción</label>
                    <div className="relative flex items-center">
                      <FileText className="absolute left-3 top-3 text-textSecondary" size={20} />
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary resize-y transition-all duration-200 ease-in-out"
                        placeholder="Detalles del movimiento..."
                        required
                      ></textarea>
                    </div>
                  </div>
                </>
              )}

              {formData.type === 'income' && (
                <>
                  {renderIncomeInitialFields()}

                  <div className="relative">
                    <label htmlFor="date" className="block text-textSecondary text-sm font-medium mb-2">Fecha</label>
                    <div className="relative flex items-center">
                      <Calendar className="absolute left-3 text-textSecondary" size={20} />
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="amount" className="block text-textSecondary text-sm font-medium mb-2">Monto</label>
                    <div className="relative flex items-center">
                      <DollarSign className="absolute left-3 text-textSecondary" size={20} />
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary transition-all duration-200 ease-in-out"
                        placeholder="0.00"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="account" className="block text-textSecondary text-sm font-medium mb-2">Cuenta</label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
                      <select
                        id="account"
                        name="account"
                        value={formData.account}
                        onChange={handleChange}
                        className="w-full pl-10 p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
                        required
                        disabled={isAccountsLoading}
                      >
                        <option value="" disabled>
                          {isAccountsLoading ? 'Cargando cuentas...' : (accountsError ? 'Error al cargar' : 'Selecciona una cuenta')}
                        </option>
                        {accountsList.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
                    </div>
                    {accountsError && <p className="text-error text-xs mt-1">{accountsError}</p>}
                  </div>

                  <div className="relative">
                    <label htmlFor="transactionType" className="block text-textSecondary text-sm font-medium mb-2">Tipo de Transacción</label>
                    <div className="relative">
                      <select
                        id="transactionType"
                        name="transactionType"
                        value={formData.transactionType || ''}
                        onChange={handleChange}
                        className="w-full p-3 pr-10 bg-white border border-border rounded-xl text-text focus:ring-primary focus:border-primary appearance-none transition-all duration-200 ease-in-out"
                        required
                      >
                        <option value="" disabled>Selecciona un tipo</option>
                        {TRANSACTION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" size={20} />
                    </div>
                  </div>
                </>
              )}

              <div className="md:col-span-2 mt-6">
                {/* Deshabilitar si se está enviando o si el contador de gastos está cargando */}
                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all duration-300 ease-in-out shadow-lg shadow-primary/40 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || (formData.type === 'expense' && isExpenseCounterLoading)}
                >
                  {isSubmitting ? 'Procesando...' : (formData.type === 'expense' ? (isExpenseCounterLoading ? 'Cargando ID...' : 'Registrar Gasto') : (isEditingExistingIncome ? 'Actualizar Recibo' : 'Registrar Ingreso'))}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="animate-fade-in">
            <h3 className="text-2xl sm:text-3xl font-bold text-center text-primary mb-6">
              Confirmar <span className="text-accent">Movimiento</span>
            </h3>
            <div className="bg-surface p-6 rounded-xl border border-border mb-8 shadow-inner">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
                <p><strong className="text-textSecondary">Tipo:</strong> <span className={formData.type === 'expense' ? 'text-error' : 'text-success'}>{formData.type === 'expense' ? 'Gasto' : 'Ingreso'}</span></p>
                <p><strong className="text-textSecondary">Fecha:</strong> {formData.date}</p>

                {formData.type === 'expense' ? (
                  <>
                    <p><strong className="text-textSecondary">ID Gasto:</strong> <span className="text-lg text-accent break-all">{formData.numeroGasto}</span></p>
                    <p><strong className="text-textSecondary">Monto:</strong> <span className="text-primary font-bold">${formData.amount}</span></p>
                    <p><strong className="text-textSecondary">Cuenta:</strong> {formData.account}</p> {/* Muestra el nombre de la cuenta directamente */}
                    <p><strong className="text-textSecondary">Categoría:</strong> {getCategoryLabel(formData.category, EXPENSE_CATEGORIES)}</p>
                    {formData.category === 'fixed' && <p><strong className="text-textSecondary">Subcategoría:</strong> {getCategoryLabel(formData.subCategory, FIXED_EXPENSE_OPTIONS)}</p>}
                    {formData.category === 'viaticos' && <p><strong className="text-textSecondary">Subcategoría:</strong> {getCategoryLabel(formData.subCategory, VIATICOS_OPTIONS)}</p>}
                    <p className="sm:col-span-2"><strong className="text-textSecondary">Descripción:</strong> {formData.description}</p>
                    <p><strong className="text-textSecondary">Colaborador:</strong> {formData.person}</p> {/* Muestra el nombre del colaborador */}
                  </>
                ) : ( // formData.type === 'income'
                  <>
                    <p><strong className="text-textSecondary">Número de Recibo:</strong> <span className="text-lg text-accent break-all">{formData.receiptNumber}</span></p>
                    <p><strong className="text-textSecondary">DNI:</strong> {formData.dni}</p>
                    <p><strong className="text-textSecondary">Nombre Completo:</strong> {formData.fullName}</p>
                    <p><strong className="text-textSecondary">Monto:</strong> <span className="text-primary font-bold">${formData.amount}</span></p>
                    <p><strong className="text-textSecondary">Cuenta:</strong> {formData.account}</p> {/* Muestra el nombre de la cuenta directamente */}
                    <p><strong className="text-textSecondary">Tipo de Transacción:</strong> {getCategoryLabel(formData.transactionType, TRANSACTION_TYPES)}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-border text-textSecondary py-3 rounded-xl text-lg font-semibold hover:bg-border/70 transition-all duration-300 ease-in-out shadow-lg shadow-border/20 transform hover:-translate-y-1"
              >
                <Edit size={20} /> Editar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-success text-white py-3 rounded-xl text-lg font-semibold hover:bg-success/90 transition-all duration-300 ease-in-out shadow-lg shadow-success/40 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Procesando...' : <><CheckCircle size={20} /> Confirmar y {isEditingExistingIncome ? 'Actualizar' : 'Registrar'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseIncomeForm;

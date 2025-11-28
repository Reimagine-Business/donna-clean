import { subYears, isFuture, isValid, parseISO } from 'date-fns'

// =====================================================
// ENTRY VALIDATION
// =====================================================

export type ValidationResult = {
  isValid: boolean
  error?: string
}

/**
 * Validate amount for entries
 * - Must be positive number
 * - Max 12 digits (supports up to 99,99,99,999.99)
 * - Exactly 2 decimal places for rupees
 */
export function validateAmount(amount: number | string): ValidationResult {
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  // Check if valid number
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' }
  }

  // Must be positive
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero' }
  }

  // Max 12 digits (99,99,99,999.99)
  if (numAmount > 999999999.99) {
    return { isValid: false, error: 'Amount cannot exceed ₹99,99,99,999.99' }
  }

  // Check decimal places (max 2)
  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Amount can have at most 2 decimal places' }
  }

  return { isValid: true }
}

/**
 * Validate date for entries
 * - Must be valid date
 * - Cannot be in future
 * - Cannot be more than 5 years in past
 */
export function validateDate(date: string | Date): ValidationResult {
  // Parse date if string
  const dateObj = typeof date === 'string' ? parseISO(date) : date

  // Check if valid date
  if (!isValid(dateObj)) {
    return { isValid: false, error: 'Invalid date format' }
  }

  // Cannot be in future
  if (isFuture(dateObj)) {
    return { isValid: false, error: 'Date cannot be in the future' }
  }

  // Cannot be more than 5 years in past
  const fiveYearsAgo = subYears(new Date(), 5)
  if (dateObj < fiveYearsAgo) {
    return { isValid: false, error: 'Date cannot be more than 5 years in the past' }
  }

  return { isValid: true }
}

/**
 * Validate entry type
 * - Must be 'income' or 'expense'
 */
export function validateType(type: string): ValidationResult {
  const validTypes = ['income', 'expense']

  if (!validTypes.includes(type)) {
    return { isValid: false, error: 'Type must be either income or expense' }
  }

  return { isValid: true }
}

/**
 * Validate payment method
 */
export function validatePaymentMethod(method: string | undefined | null): ValidationResult {
  if (!method) {
    return { isValid: true } // Optional field
  }

  const validMethods = ['cash', 'bank', 'upi', 'card', 'cheque', 'other']

  if (!validMethods.includes(method)) {
    return { isValid: false, error: 'Invalid payment method' }
  }

  return { isValid: true }
}

/**
 * Validate category exists and matches type
 * Note: This requires database check, so it's a partial validation
 */
export function validateCategory(category: string): ValidationResult {
  if (!category || category.trim().length === 0) {
    return { isValid: false, error: 'Category is required' }
  }

  if (category.length > 50) {
    return { isValid: false, error: 'Category name cannot exceed 50 characters' }
  }

  return { isValid: true }
}

// =====================================================
// CATEGORY VALIDATION
// =====================================================

/**
 * Validate category name
 * - Required, 1-50 characters
 * - No special characters except spaces, hyphens, underscores
 * - Cannot be just whitespace
 */
export function validateCategoryName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Category name is required' }
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Category name cannot exceed 50 characters' }
  }

  // Only allow letters, numbers, spaces, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/
  if (!validPattern.test(name)) {
    return { isValid: false, error: 'Category name can only contain letters, numbers, spaces, hyphens, and underscores' }
  }

  return { isValid: true }
}

/**
 * Validate category color
 * - Must be valid hex color
 */
export function validateCategoryColor(color: string): ValidationResult {
  if (!color) {
    return { isValid: false, error: 'Category color is required' }
  }

  // Valid hex color pattern
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  if (!hexPattern.test(color)) {
    return { isValid: false, error: 'Invalid color format. Use hex format (e.g., #FF5733)' }
  }

  return { isValid: true }
}

// =====================================================
// ALERT VALIDATION
// =====================================================

/**
 * Validate alert type
 */
export function validateAlertType(type: string): ValidationResult {
  const validTypes = ['info', 'warning', 'critical']

  if (!validTypes.includes(type)) {
    return { isValid: false, error: 'Alert type must be info, warning, or critical' }
  }

  return { isValid: true }
}

/**
 * Validate alert priority
 */
export function validateAlertPriority(priority: number): ValidationResult {
  if (!Number.isInteger(priority)) {
    return { isValid: false, error: 'Priority must be an integer' }
  }

  if (priority < 0 || priority > 2) {
    return { isValid: false, error: 'Priority must be between 0 and 2' }
  }

  return { isValid: true }
}

// =====================================================
// TEXT INPUT VALIDATION
// =====================================================

/**
 * Validate description field
 */
export function validateDescription(description: string | undefined | null): ValidationResult {
  if (!description) {
    return { isValid: true } // Optional field
  }

  if (description.length > 500) {
    return { isValid: false, error: 'Description cannot exceed 500 characters' }
  }

  return { isValid: true }
}

/**
 * Validate notes field
 */
export function validateNotes(notes: string | undefined | null): ValidationResult {
  if (!notes) {
    return { isValid: true } // Optional field
  }

  if (notes.length > 1000) {
    return { isValid: false, error: 'Notes cannot exceed 1000 characters' }
  }

  return { isValid: true }
}

// =====================================================
// FILE UPLOAD VALIDATION
// =====================================================

/**
 * Validate file upload
 */
export function validateFile(file: File, options?: {
  maxSizeMB?: number
  allowedTypes?: string[]
}): ValidationResult {
  const maxSizeMB = options?.maxSizeMB || 5
  const allowedTypes = options?.allowedTypes || ['image/png', 'image/jpeg', 'image/jpg']

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size cannot exceed ${maxSizeMB}MB`
    }
  }

  return { isValid: true }
}

// =====================================================
// COMPOUND VALIDATION
// =====================================================

/**
 * Validate complete entry data
 */
export function validateEntry(data: {
  type: string
  category: string
  amount: number
  date: string
  description?: string
  notes?: string
  payment_method?: string
}): ValidationResult {
  // Validate type
  const typeValidation = validateType(data.type)
  if (!typeValidation.isValid) return typeValidation

  // Validate category
  const categoryValidation = validateCategory(data.category)
  if (!categoryValidation.isValid) return categoryValidation

  // Validate amount
  const amountValidation = validateAmount(data.amount)
  if (!amountValidation.isValid) return amountValidation

  // Validate date
  const dateValidation = validateDate(data.date)
  if (!dateValidation.isValid) return dateValidation

  // Validate payment method (if provided)
  const paymentValidation = validatePaymentMethod(data.payment_method)
  if (!paymentValidation.isValid) return paymentValidation

  // Validate description (if provided)
  const descriptionValidation = validateDescription(data.description)
  if (!descriptionValidation.isValid) return descriptionValidation

  // Validate notes (if provided)
  const notesValidation = validateNotes(data.notes)
  if (!notesValidation.isValid) return notesValidation

  return { isValid: true }
}

/**
 * Validate complete category data
 */
export function validateCategoryData(data: {
  name: string
  type: string
  color: string
}): ValidationResult {
  // Validate name
  const nameValidation = validateCategoryName(data.name)
  if (!nameValidation.isValid) return nameValidation

  // Validate type
  const typeValidation = validateType(data.type)
  if (!typeValidation.isValid) return typeValidation

  // Validate color
  const colorValidation = validateCategoryColor(data.color)
  if (!colorValidation.isValid) return colorValidation

  return { isValid: true }
}

/**
 * Database Migration Script: Update Entry Types
 *
 * This script updates all existing entries in the database:
 * - 'Cash Inflow' → 'Cash IN'
 * - 'Cash Outflow' → 'Cash OUT'
 *
 * Run this script ONCE after deploying the code changes.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateEntryTypes() {
  console.log('Starting entry type migration...')

  try {
    // Update 'Cash Inflow' to 'Cash IN'
    console.log('Updating Cash Inflow entries...')
    const { data: inflowData, error: inflowError } = await supabase
      .from('entries')
      .update({ entry_type: 'Cash IN' })
      .eq('entry_type', 'Cash Inflow')
      .select('id')

    if (inflowError) {
      console.error('Error updating Cash Inflow entries:', inflowError)
      throw inflowError
    }

    console.log(`✓ Updated ${inflowData?.length || 0} Cash Inflow entries to Cash IN`)

    // Update 'Cash Outflow' to 'Cash OUT'
    console.log('Updating Cash Outflow entries...')
    const { data: outflowData, error: outflowError } = await supabase
      .from('entries')
      .update({ entry_type: 'Cash OUT' })
      .eq('entry_type', 'Cash Outflow')
      .select('id')

    if (outflowError) {
      console.error('Error updating Cash Outflow entries:', outflowError)
      throw outflowError
    }

    console.log(`✓ Updated ${outflowData?.length || 0} Cash Outflow entries to Cash OUT`)

    // Verify the migration
    console.log('\nVerifying migration...')
    const { data: allEntries, error: verifyError } = await supabase
      .from('entries')
      .select('entry_type, count', { count: 'exact' })
      .or('entry_type.eq.Cash IN,entry_type.eq.Cash OUT,entry_type.eq.Credit,entry_type.eq.Advance')

    if (verifyError) {
      console.error('Error verifying migration:', verifyError)
      throw verifyError
    }

    console.log('\nMigration completed successfully!')
    console.log('Entry type distribution:')

    // Get counts for each entry type
    const counts = {
      'Cash IN': 0,
      'Cash OUT': 0,
      'Credit': 0,
      'Advance': 0
    }

    const { data: cashInCount } = await supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('entry_type', 'Cash IN')

    const { data: cashOutCount } = await supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('entry_type', 'Cash OUT')

    const { data: creditCount } = await supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('entry_type', 'Credit')

    const { data: advanceCount } = await supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('entry_type', 'Advance')

    console.log(`- Cash IN: ${cashInCount}`)
    console.log(`- Cash OUT: ${cashOutCount}`)
    console.log(`- Credit: ${creditCount}`)
    console.log(`- Advance: ${advanceCount}`)

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateEntryTypes()
  .then(() => {
    console.log('\n✅ Migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
